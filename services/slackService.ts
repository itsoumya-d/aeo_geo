import { supabase } from './supabase';

/**
 * Slack Integration Service
 * Handles notification dispatching via Slack Webhooks/Apps
 */

export interface SlackNotification {
    title: string;
    message: string;
    level: 'info' | 'success' | 'warning' | 'error';
    metadata?: Record<string, any>;
    cta_url?: string;
    cta_text?: string;
}

/**
 * Send a notification to Slack for a given organization
 */
export async function sendSlackNotification(
    organizationId: string,
    notification: SlackNotification
): Promise<boolean> {
    try {
        // Fetch active Slack integration
        const { data: interaction, error } = await supabase
            .from('integration_webhooks')
            .select('url')
            .eq('organization_id', organizationId)
            .eq('type', 'slack')
            .eq('is_active', true)
            .maybeSingle();

        if (error || !interaction?.url) {
            return false;
        }

        const colorMap = {
            info: '#6366f1',
            success: '#10b981',
            warning: '#fbbf24',
            error: '#f43f5e'
        };

        // Construct Slack Block Kit payload
        const payload = {
            text: `*${notification.title}*`,
            attachments: [
                {
                    color: colorMap[notification.level],
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*${notification.title}*\n${notification.message}`
                            }
                        }
                    ]
                }
            ]
        };

        // Add optional CTA button if provide
        if (notification.cta_url && notification.cta_text) {
            (payload.attachments[0].blocks as any).push({
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: notification.cta_text,
                            emoji: true
                        },
                        url: notification.cta_url,
                        style: notification.level === 'error' ? 'danger' : 'primary'
                    }
                ]
            });
        }

        const response = await fetch(interaction.url, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        return response.ok;
    } catch (err) {
        console.error('Failed to send Slack notification:', err);
        return false;
    }
}

export default {
    sendSlackNotification
};
