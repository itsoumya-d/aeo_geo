import { supabase } from './supabase';
import { auditLog, getCurrentActor } from './auditService';
import { sendSlackNotification } from './slackService';

/**
 * Report Service
 * Manages email report schedules and delivery logs
 */

export interface ReportSchedule {
    id: string;
    organization_id: string;
    type: 'weekly' | 'monthly' | 'on_demand';
    email_recipients: string[];
    is_active: boolean;
    last_sent_at: string | null;
    next_run_at: string | null;
    format: 'pdf' | 'html' | 'json';
}

export interface ReportDeliveryLog {
    id: string;
    schedule_id: string;
    sent_at: string;
    status: 'success' | 'failed';
    error_message?: string;
    recipient_count: number;
}

/**
 * Get the current report schedule for an organization
 */
export async function getReportSchedule(organizationId: string): Promise<ReportSchedule | null> {
    const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
        console.error('Error fetching report schedule:', error);
    }

    return data || null;
}

/**
 * Create or update a report schedule
 */
export async function upsertReportSchedule(schedule: Partial<ReportSchedule> & { organization_id: string }): Promise<ReportSchedule | null> {
    const { data, error } = await supabase
        .from('report_schedules')
        .upsert(schedule, { onConflict: 'organization_id' })
        .select()
        .single();

    if (error) {
        console.error('Error upserting report schedule:', error);
        return null;
    }

    // Log the event
    const actor = await getCurrentActor();
    if (actor) {
        await auditLog({
            actor,
            action: 'report.schedule_updated',
            target: { id: data.id, type: 'report', display_name: `${data.type} report` },
            metadata: { type: data.type, recipients: data.email_recipients }
        });
    }

    // Dispatch Slack Notification
    await sendSlackNotification(schedule.organization_id, {
        title: '🗓️ Report Schedule Updated',
        message: `Visibility reports will now be delivered *${data.type}* to ${data.email_recipients.length} recipients.`,
        level: 'success'
    });

    return data;
}

/**
 * Get delivery logs for an organization
 */
export async function getReportDeliveryLogs(organizationId: string, limit: number = 10): Promise<ReportDeliveryLog[]> {
    const { data, error } = await supabase
        .from('report_delivery_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sent_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching report delivery logs:', error);
        return [];
    }

    return data || [];
}

/**
 * Trigger an on-demand report
 */
export async function triggerOnDemandReport(organizationId: string, email: string): Promise<boolean> {
    // This would typically call a Supabase Edge Function
    const { error } = await supabase.functions.invoke('process-scheduled-reports', {
        body: {
            organizationId,
            action: 'ON_DEMAND',
            recipient: email
        }
    });

    if (error) {
        console.error('Error triggering on-demand report:', error);
        return false;
    }

    // Log the event
    const actor = await getCurrentActor();
    if (actor) {
        await auditLog({
            actor,
            action: 'report.triggered_on_demand',
            target: { id: organizationId, type: 'report' },
            metadata: { recipient: email }
        });
    }

    return true;
}

export default {
    getReportSchedule,
    upsertReportSchedule,
    getReportDeliveryLogs,
    triggerOnDemandReport
};
