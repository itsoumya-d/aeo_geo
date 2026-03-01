import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface InvitePayload {
    email: string;
    role: 'admin' | 'member' | 'viewer';
    organization_id: string;
    organization_name: string;
    invited_by_name: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { email, role, organization_id, organization_name, invited_by_name }: InvitePayload = await req.json();

        if (!email || !role || !organization_id) {
            return new Response(
                JSON.stringify({ error: 'email, role, and organization_id are required.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Generate a secure random token (48 hex chars) — sent in email, never stored raw
        const tokenBytes = new Uint8Array(24);
        crypto.getRandomValues(tokenBytes);
        const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

        // Hash the token with SHA-256 before storing so DB exposure doesn't grant access
        const tokenHashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
        const tokenHash = Array.from(new Uint8Array(tokenHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        // Store the HASH of the token, not the plaintext
        const { error: dbError } = await supabase.from('invitations').insert({
            organization_id,
            email,
            role,
            token: tokenHash,
            expires_at: expiresAt,
        });

        if (dbError) {
            console.error('[send-invitation] DB insert error:', dbError.message);
            throw new Error(dbError.message);
        }

        // Build the accept link
        const appUrl = Deno.env.get('APP_URL') || 'https://app.cognition-ai.com';
        const acceptUrl = `${appUrl}/accept-invite?token=${token}`;

        const roleDescriptions: Record<string, string> = {
            admin: 'Admin — can manage members, billing, and all settings',
            member: 'Member — can run audits and view reports',
            viewer: 'Viewer — read-only access to reports and audits',
        };

        // Send email via Resend
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (resendKey) {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${resendKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'Cognition AI <noreply@cognition-ai.com>',
                    to: [email],
                    subject: `${invited_by_name} invited you to join ${organization_name} on Cognition AI`,
                    html: `
                        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
                            <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
                                <h1 style="color:white;margin:0;font-size:22px">You're invited!</h1>
                            </div>
                            <p style="color:#374151">Hi there,</p>
                            <p style="color:#374151">
                                <strong>${invited_by_name}</strong> has invited you to join
                                <strong>${organization_name}</strong> on Cognition AI as a
                                <strong>${roleDescriptions[role] || role}</strong>.
                            </p>
                            <div style="text-align:center;margin:32px 0">
                                <a href="${acceptUrl}"
                                   style="display:inline-block;background:#7c3aed;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px">
                                    Accept Invitation
                                </a>
                            </div>
                            <p style="color:#6b7280;font-size:13px;text-align:center">
                                This invitation expires in 7 days.<br/>
                                If you weren't expecting this, you can safely ignore this email.
                            </p>
                        </div>
                    `,
                }),
            }).catch(err => console.error('[send-invitation] Resend error:', err));
        }

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (err: any) {
        console.error('[send-invitation] Unhandled error:', err);
        return new Response(
            JSON.stringify({ error: err.message || 'Internal server error.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
