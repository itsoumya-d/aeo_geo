import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../utils/errors';
import {
    Clock, Plus, Trash2, Play, Pause, Calendar, Globe,
    Loader2, RefreshCw, Bell, ChevronDown
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

const FrequencyBadge: React.FC<{ frequency: string }> = ({ frequency }) => {
    const styles = {
        daily: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        weekly: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        monthly: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${styles[frequency as keyof typeof styles]}`}>
            {frequency}
        </span>
    );
};

export const ScheduledAudits: React.FC = () => {
    const { organization, profile } = useAuth();
    const toast = useToast();

    const [schedules, setSchedules] = useState<ScheduledAudit[]>([]);
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
            loadSchedules();
            loadNotificationPrefs();
        }
    }, [organization?.id]);

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

    const loadSchedules = async () => {
        if (!organization?.id) return;
        setLoading(true);

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
            // Don't show error if table doesn't exist yet
            if (!error.message?.includes('relation')) {
                const user = toUserMessage(error);
                toast.error(user.title, user.message);
            }
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomain.trim() || !organization?.id) return;

        setCreating(true);
        try {
            // Validate URL
            let url = newDomain.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`;
            }
            new URL(url); // Validate

            // Calculate next run time using preferred time
            const [hours, minutes] = newTime.split(':').map(Number);
            const now = new Date();
            const nextRun = new Date(now);
            nextRun.setHours(hours, minutes, 0, 0);
            // If the selected time is already past today, start from tomorrow
            if (nextRun <= now) {
                nextRun.setDate(nextRun.getDate() + 1);
            }
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
            loadSchedules();
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
            loadSchedules();
        } catch (error: any) {
            console.error('Delete schedule failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        }
    };

    if (!isPaidPlan) {
        return (
            <div className="bg-surfaceHighlight border border-border rounded-xl p-6 text-center">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">Scheduled Audits</h3>
                <p className="text-sm text-text-muted mb-4">
                    Automate recurring audits on Pro and Agency plans.
                </p>
                <a
                    href="/settings/billing"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                    Upgrade to Pro
                </a>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-surfaceHighlight rounded-xl" />
                        <div>
                            <div className="h-5 w-36 bg-surfaceHighlight rounded-lg mb-2" />
                            <div className="h-3 w-24 bg-surfaceHighlight rounded-lg" />
                        </div>
                    </div>
                    <div className="h-10 w-32 bg-surfaceHighlight rounded-lg" />
                </div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-surfaceHighlight border border-border rounded-xl p-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-surfaceHighlight rounded-lg" />
                            <div>
                                <div className="h-4 w-40 bg-surfaceHighlight rounded-lg mb-2" />
                                <div className="h-3 w-28 bg-surfaceHighlight rounded-lg" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-500/20 p-3 rounded-xl">
                        <Clock className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary">Scheduled Audits</h3>
                        <p className="text-sm text-text-muted">{schedules.filter(s => s.enabled).length} active schedules</p>
                    </div>
                </div>
                {isOwnerOrAdmin && !showCreateForm && (
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Schedule
                    </button>
                )}
            </div>

            {/* Create Form */}
            {showCreateForm && (
                <form onSubmit={handleCreateSchedule} className="bg-surface border border-border rounded-xl p-4">
                    <h4 className="font-medium text-text-primary mb-4">Create New Schedule</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-text-muted mb-2">Domain URL</label>
                            <input
                                type="text"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                placeholder="example.com"
                                className="w-full bg-background border border-border text-text-primary rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none placeholder:text-text-muted"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted mb-2">Frequency</label>
                            <div className="flex gap-2">
                                {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                                    <button
                                        key={freq}
                                        type="button"
                                        onClick={() => setNewFrequency(freq)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${newFrequency === freq
                                            ? 'bg-primary text-white'
                                            : 'bg-background text-text-muted hover:bg-surfaceHighlight'
                                            }`}
                                    >
                                        {freq}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-text-muted mb-2">Run at</label>
                                <input
                                    type="time"
                                    value={newTime}
                                    onChange={e => setNewTime(e.target.value)}
                                    className="w-full bg-background border border-border text-text-primary rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-text-muted mb-2">Timezone</label>
                                <select
                                    value={newTimezone}
                                    onChange={e => setNewTimezone(e.target.value)}
                                    className="w-full bg-background border border-border text-text-primary rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none text-sm"
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
                                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Create Schedule
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateForm(false)}
                                className="bg-background hover:bg-surfaceHighlight text-text-primary border border-border px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Schedules List */}
            {schedules.length === 0 ? (
                <div className="bg-surfaceHighlight border border-border rounded-xl p-8 text-center">
                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h4 className="font-medium text-text-primary mb-2">No Schedules Yet</h4>
                    <p className="text-sm text-text-muted mb-5">
                        Set up automated audits to track your AI visibility over time.
                    </p>
                    {isOwnerOrAdmin && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Schedule Your First Audit
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {schedules.map(schedule => (
                        <div
                            key={schedule.id}
                            className={`bg-surfaceHighlight border rounded-xl p-4 transition-colors ${schedule.enabled
                                ? 'border-border hover:border-border'
                                : 'border-border/50 opacity-60'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${schedule.enabled ? 'bg-amber-500/20' : 'bg-surfaceHighlight'
                                        }`}>
                                        <Globe className={`w-5 h-5 ${schedule.enabled ? 'text-amber-400' : 'text-slate-500'}`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-text-primary">
                                                {new URL(schedule.domain_url).hostname}
                                            </p>
                                            <FrequencyBadge frequency={schedule.frequency} />
                                            {!schedule.enabled && (
                                                <span className="text-xs text-slate-500">(paused)</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
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
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleSchedule(schedule.id, schedule.enabled)}
                                            className={`p-2 rounded-lg transition-colors ${schedule.enabled
                                                ? 'text-amber-400 hover:bg-amber-500/10'
                                                : 'text-slate-500 hover:bg-surfaceHighlight'
                                                }`}
                                            title={schedule.enabled ? 'Pause' : 'Resume'}
                                            aria-label={schedule.enabled ? 'Pause schedule' : 'Resume schedule'}
                                        >
                                            {schedule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSchedule(schedule.id, new URL(schedule.domain_url).hostname)}
                                            className="text-text-muted hover:text-rose-400 transition-colors p-2"
                                            title="Delete"
                                            aria-label="Delete schedule"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Notification Settings */}
            <div className="bg-surfaceHighlight border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-blue-400" />
                        <div>
                            <p className="font-medium text-text-primary text-sm">Notification Preferences</p>
                            <p className="text-xs text-slate-500">Get notified when audits complete</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={handleToggleEmail}
                        disabled={savingNotifs}
                        className="flex items-center justify-between bg-surfaceHighlight rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-colors text-left"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📧</span>
                            <span className="text-sm text-text-secondary">Email Reports</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${emailNotifications
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-text-muted'
                        }`}>
                            {emailNotifications ? 'Active' : 'Off'}
                        </span>
                    </button>
                    <button
                        onClick={() => setShowSlackInput(!showSlackInput)}
                        className="flex items-center justify-between bg-surfaceHighlight rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-colors text-left"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💬</span>
                            <span className="text-sm text-text-secondary">Slack Alerts</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${slackWebhookUrl
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-text-muted'
                        }`}>
                            {slackWebhookUrl ? 'Connected' : 'Connect'}
                        </span>
                    </button>
                </div>
                {showSlackInput && (
                    <div className="mt-3 p-3 bg-surfaceHighlight rounded-lg border border-border/50 space-y-3">
                        <label className="block text-xs text-text-muted">
                            Slack Incoming Webhook URL
                        </label>
                        <input
                            type="url"
                            value={slackWebhookUrl}
                            onChange={e => setSlackWebhookUrl(e.target.value)}
                            placeholder="https://hooks.slack.com/services/..."
                            className="w-full bg-background border border-border text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none placeholder:text-text-muted"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveSlack}
                                disabled={savingNotifs}
                                className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
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
                                    className="text-rose-400 hover:text-rose-300 px-3 py-1.5 text-xs font-medium transition-colors"
                                >
                                    Disconnect
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-600 leading-relaxed">
                            Create an Incoming Webhook in your Slack workspace settings, then paste the URL here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
