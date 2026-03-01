// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // This function accepts two modes:
        // 1. POST { token } — look up invitation by hashed token, return invite details (pre-auth check)
        // 2. POST { token, accept: true } — authenticated request to actually accept the invitation

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const body = await req.json();
        const { token, accept } = body;

        if (!token) {
            return new Response(
                JSON.stringify({ error: 'token is required.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Hash the incoming token with SHA-256 to compare against stored hash
        const tokenHashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
        const tokenHash = Array.from(new Uint8Array(tokenHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

        // Look up the invitation by hash
        const { data: invitation, error: inviteError } = await supabaseAdmin
            .from('invitations')
            .select('*')
            .eq('token', tokenHash)
            .single();

        if (inviteError || !invitation) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired invitation link.' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check expiry
        if (new Date(invitation.expires_at) < new Date()) {
            return new Response(
                JSON.stringify({ error: 'This invitation has expired. Please ask your admin to resend it.', expired: true }),
                { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check if already accepted
        if (invitation.accepted_at) {
            return new Response(
                JSON.stringify({ error: 'This invitation has already been accepted.', alreadyAccepted: true }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Mode 1: just validate — return the invite details for display
        if (!accept) {
            return new Response(
                JSON.stringify({
                    valid: true,
                    invitation: {
                        email: invitation.email,
                        role: invitation.role,
                        organization_id: invitation.organization_id,
                        expires_at: invitation.expires_at,
                    }
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Mode 2: accept the invitation — requires authenticated user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Authentication required to accept invitation.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Authentication failed.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify the logged-in user's email matches the invitation email
        if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
            return new Response(
                JSON.stringify({ error: `This invitation was sent to ${invitation.email}. Please sign in with that account.` }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check if user already has a profile (to avoid duplicate org membership)
        const { data: existingProfile } = await supabaseAdmin
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (existingProfile?.organization_id && existingProfile.organization_id !== invitation.organization_id) {
            // User already belongs to a different org — this is an edge case
            // For now, allow joining as a multi-org member via workspace_members
        }

        // Add user to organization
        await supabaseAdmin
            .from('users')
            .upsert({
                id: user.id,
                email: user.email,
                organization_id: invitation.organization_id,
                role: invitation.role,
                full_name: user.user_metadata?.full_name || user.email,
            }, { onConflict: 'id' });

        // Mark invitation as accepted
        await supabaseAdmin
            .from('invitations')
            .update({ accepted_at: new Date().toISOString() })
            .eq('id', invitation.id);

        // Ensure org onboarding state exists for invited members.
        // This table is org-scoped (one row per organization), not user-scoped.
        await supabaseAdmin
            .from('organization_onboarding')
            .upsert({
                organization_id: invitation.organization_id,
                current_step: 3,
                is_completed: true,
                persona: 'member',
            }, { onConflict: 'organization_id' });

        return new Response(
            JSON.stringify({
                success: true,
                organization_id: invitation.organization_id,
                role: invitation.role,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (err: any) {
        console.error('[accept-invitation] Error:', err);
        return new Response(
            JSON.stringify({ error: err.message || 'Internal server error.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
