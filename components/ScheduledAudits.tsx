import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../utils/errors';
import {
    Clock, Plus, Trash2, Play, Pause, Calendar, Globe,
    Loader2, Bell, Zap, CheckCircle2, AlertTriangle
} from 'lucide-react';

interface ScheduledAudit {
    id: string;
    domain_url: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    next_run_at: string;
    enabled: boolean;
    created_at: string;
    last_run_at: string | null;
}

interface BatchJob {
    job_id: string;
    scheduled_audit_id: string;
    domain_url: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
    queued_at: string;
    estimated_completion_at: string;
    completed_at?: string;
}

const FrequencyBadge: React.FC<{ frequency: string }> = ({ frequency }) => {
    const styles = {
        daily: 'bg-blue-50 text-blue-700 border-blue-200',
        weekly: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        monthly: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${styles[frequency as keyof typeof styles]}`}>
            {frequency}
        </span>
    );
};

function BatchStatusBadge({ job }: { job: BatchJob }) {
    const estComplete = new Date(job.estimated_completion_at);
    const remaining = Math.max(0, Math.round((estComplete.getTime() - Date.now()) / 60000));

    if (job.status === 'QUEUED' || job.status === 'PROCESSING') {
        return (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="font-medium">
                    {job.status === 'QUEUED' ? 'Queued' : 'Processing'}
                    {remaining > 0 ? ` · ~${remaining}m` : ''}
                </span>
            </div>
        );
    }
    if (job.status === 'COMPLETE') {
        return (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                <CheckCircle2 className="w-3 h-3" />
                <span className="font-medium">Complete</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-medium">Failed</span>
        </div>
    );
}

export const ScheduledAudits: React.FC = () => {
    const { organization, profile } = useAuth();
    const toast = useToast();

    const [schedules, setSchedules] = useState<ScheduledAudit[]>([]);
    const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newDomain, setNewDomain] = useState('');
    const [newFrequency, setNewFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [newTime, setNewTime] = useState('09:00');
    const [newTimezone, setNewTimezone] = useState(
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
    const [showSlackInput, setShowSlackInput] = useState(false);
    const [savingNotifs, setSavingNotifs] = useState(false);

    const isPaidPlan = organization?.plan !== 'free';
    const isOwnerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin';

    useEffect(() => {
        if (organization?.id) {
            loadAll();
            loadNotificationPrefs();
        }
    }, [organization?.id]);

    // Refresh batch jobs every 30s if any are in progress
    useEffect(() => {
        const hasActive = batchJobs.some(j => j.status === 'QUEUED' || j.status === 'PROCESSING');
        if (!hasActive) return;
        const interval = setInterval(() => loadBatchJobs(), 30000);
        return () => clearInterval(interval);
    }, [batchJobs]);

    const loadAll = async () => {
        setLoading(true);
        await Promise.all([loadSchedules(), loadBatchJobs()]);
        setLoading(false);
    };

    const loadNotificationPrefs = async () => {
        if (!organization?.id) return;
        try {
            const { data } = await supabase
                .from('organization_settings')
                .select('audit_email_notifications, slack_webhook_url')
                .eq('organization_id', organization.id)
                .maybeSingle();
            if (data) {
                setEmailNotifications(data.audit_email_notifications ?? true);
                setSlackWebhookUrl(data.slack_webhook_url ?? '');
            }
        } catch {
            // Settings table may not exist yet — use defaults
        }
    };

    const loadSchedules = async () => {
        if (!organization?.id) return;
        try {
            const { data, error } = await supabase
                .from('scheduled_audits')
                .select('*')
                .eq('organization_id', organization.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSchedules(data || []);
        } catch (error: any) {
            console.error('Failed to load schedules:', getTechnicalErrorMessage(error));
            if (!error.message?.includes('relation')) {
                const user = toUserMessage(error);
                toast.error(user.title, user.message);
            }
            setSchedules([]);
        }
    };

    const loadBatchJobs = async () => {
        if (!organization?.id) return;
        try {
            const { data } = await supabase
                .from('batch_jobs')
                .select('*')
                .eq('organization_id', organization.id)
                .in('status', ['QUEUED', 'PROCESSING', 'COMPLETE', 'FAILED'])
                .order('queued_at', { ascending: false })
                .limit(50);
            setBatchJobs(data || []);
        } catch {
            // batch_jobs table may not exist yet
        }
    };

    const saveNotificationPrefs = async (updates: { audit_email_notifications?: boolean; slack_webhook_url?: string }) => {
        if (!organization?.id) return;
        setSavingNotifs(true);
        try {
            const { error } = await supabase
                .from('organization_settings')
                .upsert({
                    organization_id: organization.id,
                    ...updates,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'organization_id' });
            if (error) throw error;
            toast.success('Preferences saved');
        } catch (error: any) {
            console.error('Save notification prefs failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setSavingNotifs(false);
        }
    };

    const handleToggleEmail = () => {
        const newVal = !emailNotifications;
        setEmailNotifications(newVal);
        saveNotificationPrefs({ audit_email_notifications: newVal });
    };

    const handleSaveSlack = () => {
        saveNotificationPrefs({ slack_webhook_url: slackWebhookUrl });
        setShowSlackInput(false);
    };

    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomain.trim() || !organization?.id) return;

        setCreating(true);
        try {
            let url = newDomain.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`;
            }
            new URL(url);

            const [hours, minutes] = newTime.split(':').map(Number);
            const now = new Date();
            const nextRun = new Date(now);
            nextRun.setHours(hours, minutes, 0, 0);
            if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);

            switch (newFrequency) {
                case 'weekly':
                    if (nextRun.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
                        nextRun.setDate(nextRun.getDate() + 7);
                    }
                    break;
                case 'monthly':
                    nextRun.setMonth(nextRun.getMonth() + 1);
                    break;
            }

            const { error } = await supabase
                .from('scheduled_audits')
                .insert({
                    organization_id: organization.id,
                    domain_url: url,
                    frequency: newFrequency,
                    preferred_time: newTime,
                    timezone: newTimezone,
                    next_run_at: nextRun.toISOString(),
                    enabled: true,
                });

            if (error) throw error;

            toast.success('Schedule created', `${url} will be audited ${newFrequency}`);
            setNewDomain('');
            setShowCreateForm(false);
            loadAll();
        } catch (error: any) {
            console.error('Create schedule failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setCreating(false);
        }
    };

    const handleToggleSchedule = async (id: string, currentState: boolean) => {
        try {
            const { error } = await supabase
                .from('scheduled_audits')
                .update({ enabled: !currentState })
                .eq('id', id);

            if (error) throw error;
            toast.success(currentState ? 'Schedule paused' : 'Schedule resumed');
            loadSchedules();
        } catch (error: any) {
            console.error('Update schedule failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        }
    };

    const handleDeleteSchedule = async (id: string, domain: string) => {
        if (!confirm(`Delete schedule for ${domain}?`)) return;

        try {
            const { error } = await supabase
                .from('scheduled_audits')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Schedule deleted');
            loadAll();
        } catch (error: any) {
            console.error('Delete schedule failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        }
    };

    // Get the latest batch job for a given scheduled audit
    const getBatchJobForAudit = (auditId: string): BatchJob | undefined =>
        batchJobs.find(j => j.scheduled_audit_id === auditId);

    if (!isPaidPlan) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                <div className="bg-blue-100 p-4 rounded-2xl inline-flex mb-4">
                    <Clock className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">Scheduled Audits</h3>
                <p className="text-sm text-blue-700 mb-5 max-w-xs mx-auto">
                    Automate recurring audits on Pro and Agency plans.
                </p>
                <a
                    href="/settings/billing"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                    Upgrade to Pro
                </a>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl" />
                        <div>
                            <div className="h-5 w-36 bg-blue-100 rounded-lg mb-2" />
                            <div className="h-3 w-24 bg-blue-50 rounded-lg" />
                        </div>
                    </div>
                    <div className="h-10 w-32 bg-blue-100 rounded-lg" />
                </div>
                {[1, 2].map(i => (
                    <div key={i} className="bg-white border border-blue-100 rounded-xl p-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg" />
                            <div>
                                <div className="h-4 w-40 bg-blue-100 rounded-lg mb-2" />
                                <div className="h-3 w-28 bg-blue-50 rounded-lg" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const activeJobCount = batchJobs.filter(j => j.status === 'QUEUED' || j.status === 'PROCESSING').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-xl">
                        <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Scheduled Audits</h3>
                        <p className="text-sm text-slate-500">
                            {schedules.filter(s => s.enabled).length} active schedule{schedules.filter(s => s.enabled).length !== 1 ? 's' : ''}
                            {activeJobCount > 0 && (
                                <span className="ml-2 text-blue-600 font-medium">· {activeJobCount} processing</span>
                            )}
                        </p>
                    </div>
                </div>
                {isOwnerOrAdmin && !showCreateForm && (
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Schedule
                    </button>
                )}
            </div>

            {/* Active Batch Jobs Banner */}
            {activeJobCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                        <Zap className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-blue-900">Batch processing in progress</p>
                        <p className="text-xs text-blue-700 mt-0.5">
                            {activeJobCount} audit{activeJobCount !== 1 ? 's are' : ' is'} being processed in the background using batch mode (50% cost savings). You'll be notified when ready.
                        </p>
                    </div>
                </div>
            )}

            {/* Create Form */}
            {showCreateForm && (
                <form onSubmit={handleCreateSchedule} className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4">Create New Schedule</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Domain URL</label>
                            <input
                                type="text"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                placeholder="example.com"
                                className="w-full bg-white border border-blue-200 text-slate-800 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none placeholder:text-slate-400"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Frequency</label>
                            <div className="flex gap-2">
                                {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                                    <button
                                        key={freq}
                                        type="button"
                                        onClick={() => setNewFrequency(freq)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${newFrequency === freq
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                            }`}
                                    >
                                        {freq}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Run at</label>
                                <input
                                    type="time"
                                    value={newTime}
                                    onChange={e => setNewTime(e.target.value)}
                                    className="w-full bg-white border border-blue-200 text-slate-800 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-400 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">Timezone</label>
                                <select
                                    value={newTimezone}
                                    onChange={e => setNewTimezone(e.target.value)}
                                    className="w-full bg-white border border-blue-200 text-slate-800 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                                >
                                    {[
                                        'America/New_York', 'America/Chicago', 'America/Denver',
                                        'America/Los_Angeles', 'America/Sao_Paulo',
                                        'Europe/London', 'Europe/Berlin', 'Europe/Paris',
                                        'Asia/Dubai', 'Asia/Kolkata', 'Asia/Shanghai',
                                        'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
                                    ].map(tz => (
                                        <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={creating || !newDomain.trim()}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Create Schedule
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Schedules List */}
            {schedules.length === 0 ? (
                <div className="bg-white border border-blue-100 rounded-xl p-10 text-center">
                    <div className="bg-blue-50 p-4 rounded-2xl inline-flex mb-4">
                        <Clock className="w-10 h-10 text-blue-400" />
                    </div>
                    <h4 className="font-bold text-slate-700 mb-2">No Schedules Yet</h4>
                    <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
                        Set up automated audits to track your AI visibility over time.
                    </p>
                    {isOwnerOrAdmin && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Schedule Your First Audit
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {schedules.map(schedule => {
                        const batchJob = getBatchJobForAudit(schedule.id);
                        return (
                            <div
                                key={schedule.id}
                                className={`bg-white border rounded-xl p-4 transition-colors ${schedule.enabled
                                    ? 'border-blue-100 hover:border-blue-200'
                                    : 'border-slate-100 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${schedule.enabled ? 'bg-blue-100' : 'bg-slate-100'}`}>
                                            <Globe className={`w-5 h-5 ${schedule.enabled ? 'text-blue-600' : 'text-slate-400'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-slate-800 truncate">
                                                    {new URL(schedule.domain_url).hostname}
                                                </p>
                                                <FrequencyBadge frequency={schedule.frequency} />
                                                {!schedule.enabled && (
                                                    <span className="text-xs text-slate-400">(paused)</span>
                                                )}
                                                {batchJob && (
                                                    <BatchStatusBadge job={batchJob} />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Next: {new Date(schedule.next_run_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                                {schedule.last_run_at && (
                                                    <span>
                                                        Last run: {new Date(schedule.last_run_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isOwnerOrAdmin && (
                                        <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                                            <button
                                                onClick={() => handleToggleSchedule(schedule.id, schedule.enabled)}
                                                className={`p-2 rounded-lg transition-colors ${schedule.enabled
                                                    ? 'text-blue-500 hover:bg-blue-50'
                                                    : 'text-slate-400 hover:bg-slate-100'
                                                    }`}
                                                title={schedule.enabled ? 'Pause' : 'Resume'}
                                                aria-label={schedule.enabled ? 'Pause schedule' : 'Resume schedule'}
                                            >
                                                {schedule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSchedule(schedule.id, new URL(schedule.domain_url).hostname)}
                                                className="text-slate-400 hover:text-red-500 transition-colors p-2"
                                                title="Delete"
                                                aria-label="Delete schedule"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Notification Settings */}
            <div className="bg-white border border-blue-100 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <div>
                        <p className="font-semibold text-slate-800 text-sm">Notification Preferences</p>
                        <p className="text-xs text-slate-500">Get notified when audits complete</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={handleToggleEmail}
                        disabled={savingNotifs}
                        className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-100 hover:border-blue-300 transition-colors text-left"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📧</span>
                            <span className="text-sm text-slate-700 font-medium">Email Reports</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emailNotifications
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                            {emailNotifications ? 'Active' : 'Off'}
                        </span>
                    </button>
                    <button
                        onClick={() => setShowSlackInput(!showSlackInput)}
                        className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-100 hover:border-blue-300 transition-colors text-left"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💬</span>
                            <span className="text-sm text-slate-700 font-medium">Slack Alerts</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${slackWebhookUrl
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                            {slackWebhookUrl ? 'Connected' : 'Connect'}
                        </span>
                    </button>
                </div>
                {showSlackInput && (
                    <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                        <label className="block text-xs font-medium text-slate-600">
                            Slack Incoming Webhook URL
                        </label>
                        <input
                            type="url"
                            value={slackWebhookUrl}
                            onChange={e => setSlackWebhookUrl(e.target.value)}
                            placeholder="https://hooks.slack.com/services/..."
                            className="w-full bg-white border border-blue-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none placeholder:text-slate-400"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveSlack}
                                disabled={savingNotifs}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                                {savingNotifs ? 'Saving...' : 'Save'}
                            </button>
                            {slackWebhookUrl && (
                                <button
                                    onClick={() => {
                                        setSlackWebhookUrl('');
                                        saveNotificationPrefs({ slack_webhook_url: '' });
                                        setShowSlackInput(false);
                                    }}
                                    className="text-red-500 hover:text-red-600 px-3 py-1.5 text-xs font-semibold transition-colors"
                                >
                                    Disconnect
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            Create an Incoming Webhook in your Slack workspace settings, then paste the URL here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
