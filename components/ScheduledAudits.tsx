import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './Toast';
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

    const isPaidPlan = organization?.plan !== 'free';
    const isOwnerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin';

    useEffect(() => {
        if (organization?.id) {
            loadSchedules();
        }
    }, [organization?.id]);

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
            console.error('Failed to load schedules:', error);
            // Don't show error if table doesn't exist yet
            if (!error.message?.includes('relation')) {
                toast.error('Failed to load schedules', error.message);
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

            // Calculate next run time
            const now = new Date();
            let nextRun: Date;
            switch (newFrequency) {
                case 'daily':
                    nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    break;
                case 'weekly':
                    nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'monthly':
                    nextRun = new Date(now.setMonth(now.getMonth() + 1));
                    break;
            }

            const { error } = await supabase
                .from('scheduled_audits')
                .insert({
                    organization_id: organization.id,
                    domain_url: url,
                    frequency: newFrequency,
                    next_run_at: nextRun.toISOString(),
                    enabled: true,
                });

            if (error) throw error;

            toast.success('Schedule created', `${url} will be audited ${newFrequency}`);
            setNewDomain('');
            setShowCreateForm(false);
            loadSchedules();
        } catch (error: any) {
            toast.error('Failed to create schedule', error.message);
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
            toast.error('Failed to update', error.message);
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
            toast.error('Failed to delete', error.message);
        }
    };

    if (!isPaidPlan) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Scheduled Audits</h3>
                <p className="text-sm text-slate-400 mb-4">
                    Automate recurring audits on Pro and Agency plans.
                </p>
                <a
                    href="/settings?tab=billing"
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                    Upgrade to Pro
                </a>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
                        <h3 className="text-lg font-semibold text-white">Scheduled Audits</h3>
                        <p className="text-sm text-slate-400">{schedules.filter(s => s.enabled).length} active schedules</p>
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
                <form onSubmit={handleCreateSchedule} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <h4 className="font-medium text-white mb-4">Create New Schedule</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Domain URL</label>
                            <input
                                type="text"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                placeholder="example.com"
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Frequency</label>
                            <div className="flex gap-2">
                                {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                                    <button
                                        key={freq}
                                        type="button"
                                        onClick={() => setNewFrequency(freq)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${newFrequency === freq
                                                ? 'bg-primary text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {freq}
                                    </button>
                                ))}
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
                                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Schedules List */}
            {schedules.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                    <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h4 className="font-medium text-white mb-2">No Schedules Yet</h4>
                    <p className="text-sm text-slate-400">
                        Set up automated audits to track your AI visibility over time.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {schedules.map(schedule => (
                        <div
                            key={schedule.id}
                            className={`bg-slate-900/50 border rounded-xl p-4 transition-colors ${schedule.enabled
                                    ? 'border-slate-800 hover:border-slate-700'
                                    : 'border-slate-800/50 opacity-60'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${schedule.enabled ? 'bg-amber-500/20' : 'bg-slate-800'
                                        }`}>
                                        <Globe className={`w-5 h-5 ${schedule.enabled ? 'text-amber-400' : 'text-slate-500'}`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-white">
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
                                                    : 'text-slate-500 hover:bg-slate-800'
                                                }`}
                                            title={schedule.enabled ? 'Pause' : 'Resume'}
                                        >
                                            {schedule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSchedule(schedule.id, new URL(schedule.domain_url).hostname)}
                                            className="text-slate-400 hover:text-rose-400 transition-colors p-2"
                                            title="Delete"
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

            {/* Info Notice */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                <Bell className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div className="text-sm text-slate-400">
                    <p className="font-medium text-slate-300 mb-1">Email Notifications</p>
                    <p>You'll receive an email when scheduled audits complete with a summary of the results.</p>
                </div>
            </div>
        </div>
    );
};
