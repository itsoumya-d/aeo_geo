/**
 * Resend Email Utility for Supabase Edge Functions
 */

// @ts-ignore: Deno runtime
declare const Deno: any;

export async function sendEmail(payload: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
}) {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
        console.error("Missing RESEND_API_KEY environment variable");
        return { success: false, error: "Missing API Key" };
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: payload.from || "Cognition Sentinel <alerts@cognition-ai.com>",
                to: Array.isArray(payload.to) ? payload.to : [payload.to],
                subject: payload.subject,
                html: payload.html,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("Resend API Error:", error);
            return { success: false, error };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (err: any) {
        console.error("Email sending failed:", err);
        return { success: false, error: err.message };
    }
}
