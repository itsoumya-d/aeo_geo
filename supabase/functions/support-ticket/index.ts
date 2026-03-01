import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface TicketPayload {
    name: string;
    email: string;
    topic: string;
    message: string;
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

        const { name, email, topic, message }: TicketPayload = await req.json();

        // Basic validation
        if (!name?.trim() || !email?.trim() || !topic?.trim() || !message?.trim()) {
            return new Response(
                JSON.stringify({ error: 'All fields are required.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get user context if authenticated
        const authHeader = req.headers.get('Authorization');
        let userId: string | null = null;
        let orgId: string | null = null;
        if (authHeader) {
            const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            if (user) {
                userId = user.id;
                const { data: org } = await supabase
                    .from('organizations')
                    .select('id')
                    .eq('owner_id', user.id)
                    .maybeSingle();
                orgId = org?.id ?? null;
            }
        }

        // Generate a short readable ticket ID
        const ticketId = `SUP-${Date.now().toString(36).toUpperCase().slice(-6)}`;

        // Store the ticket in DB
        const { error: dbError } = await supabase.from('support_tickets').insert({
            id: ticketId,
            user_id: userId,
            org_id: orgId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            topic: topic.trim(),
            message: message.trim(),
            status: 'open',
        });

        if (dbError) {
            // Non-fatal: still send confirmation even if DB insert fails (table may not exist yet)
            console.error('[support-ticket] DB insert failed:', dbError.message);
        }

        // Send confirmation email via Resend if configured
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (resendKey) {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${resendKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'Cognition AI Support <support@cognition-ai.com>',
                    to: [email.trim()],
                    subject: `[${ticketId}] We received your message — ${topic}`,
                    html: `
                        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
                            <h2 style="color:#7c3aed">We got your message, ${name.split(' ')[0]}!</h2>
                            <p>Your support ticket <strong>${ticketId}</strong> has been created. Our team will review it and respond within 24 hours.</p>
                            <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
                                <strong>Topic:</strong> ${topic}<br/>
                                <strong>Message:</strong><br/>
                                <p style="white-space:pre-wrap;color:#374151">${message.trim()}</p>
                            </div>
                            <p style="color:#6b7280;font-size:13px">
                                If you have additional information to add, just reply to this email and include your ticket ID <strong>${ticketId}</strong>.
                            </p>
                        </div>
                    `,
                }),
            }).catch(err => console.error('[support-ticket] Resend error:', err));
        }

        return new Response(
            JSON.stringify({ success: true, ticketId }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (err: any) {
        console.error('[support-ticket] Unhandled error:', err);
        return new Response(
            JSON.stringify({ error: 'Internal server error.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
