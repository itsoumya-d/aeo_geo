/**
 * Notification Service for Supabase Edge Functions
 * Supports Slack (Block Kit), Discord, and Generic Webhooks.
 */

// @ts-ignore: Deno runtime
declare const Deno: any;

import { AnalysisReport } from "./types.ts";

export interface NotificationPayload {
    organizationId: string;
    domainUrl: string;
    report: AnalysisReport;
    delta: number;
}

export async function dispatchNotifications(supabaseAdmin: any, payload: NotificationPayload) {
    const { organizationId, domainUrl, report, delta } = payload;

    // 1. Fetch active integrations
    const { data: integrations, error } = await supabaseAdmin
        .from('integration_webhooks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

    if (error || !integrations || integrations.length === 0) {
        console.log(`[NotificationService] No active integrations for Org: ${organizationId}`);
        return;
    }

    console.log(`[NotificationService] Dispatching to ${integrations.length} integrations for ${domainUrl}`);

    const results = await Promise.allSettled(integrations.map(async (integration: any) => {
        if (integration.type === 'slack') {
            return sendSlackAlert(integration.url, domainUrl, report, delta);
        } else if (integration.type === 'webhook') {
            return sendGenericWebhook(integration.url, domainUrl, report, delta, integration.secret_token);
        } else if (integration.type === 'discord') {
            return sendDiscordAlert(integration.url, domainUrl, report, delta);
        }
    }));

    results.forEach((res, i) => {
        if (res.status === 'rejected') {
            console.error(`[NotificationService] Failed to dispatch ${integrations[i].type}:`, res.reason);
        }
    });
}

/**
 * Sends a rich Block Kit message to Slack
 */
async function sendSlackAlert(url: string, domainUrl: string, report: AnalysisReport, delta: number) {
    const blocks = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: "🧠 Neural Visibility Sentinel Alert",
                emoji: true
            }
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `Audit completed for *${domainUrl}*.\n*Overall AEO Score:* \`${report.overallScore}/100\``
            },
            accessory: {
                type: "button",
                text: {
                    type: "plain_text",
                    text: "View Dashboard",
                    emoji: true
                },
                url: `https://cognition-ai.com/dashboard`
            }
        },
        {
            type: "context",
            elements: [
                {
                    type: "mrkdwn",
                    text: `${delta >= 0 ? '🟢' : '🔴'} *Delta:* ${delta > 0 ? '+' : ''}${delta}% shift detected.`
                },
                {
                    type: "mrkdwn",
                    text: `*Key Topics:* ${report.topicalDominance.slice(0, 3).join(", ")}`
                }
            ]
        }
    ];

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks })
    });

    if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${await response.text()}`);
    }
}

/**
 * Sends a standard JSON payload to a generic webhook
 */
async function sendGenericWebhook(url: string, domainUrl: string, report: AnalysisReport, delta: number, secret?: string) {
    const payload = {
        event: "audit_complete",
        timestamp: new Date().toISOString(),
        domain: domainUrl,
        score: report.overallScore,
        delta: delta,
        full_report: report,
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) {
        headers["X-Cognition-Secret"] = secret;
    }

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Webhook error: ${response.status} ${await response.text()}`);
    }
}

/**
 * Sends a simple embed message to Discord
 */
async function sendDiscordAlert(url: string, domainUrl: string, report: AnalysisReport, delta: number) {
    const embed = {
        title: "Cognition AI visibility Update",
        color: delta >= 0 ? 0x10b981 : 0xf43f5e,
        fields: [
            { name: "Domain", value: domainUrl, inline: true },
            { name: "AEO Score", value: report.overallScore.toString(), inline: true },
            { name: "Delta", value: `${delta > 0 ? '+' : ''}${delta}%`, inline: true }
        ],
        footer: { text: "Sentinel Monitoring" },
        timestamp: new Date().toISOString()
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
        throw new Error(`Discord API error: ${response.status} ${await response.text()}`);
    }
}
