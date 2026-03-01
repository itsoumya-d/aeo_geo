import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Webhook as WebhookIcon,
    Plus,
    Trash2,
    Pencil,
    Save,
    X,
    Copy,
    Check,
    RefreshCw,
    Link as LinkIcon,
    Key,
    ShieldCheck,
    ArrowUpRight
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useToast } from '../Toast';
import { APIKeyManager } from '../APIKeyManager';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { getTechnicalErrorMessage, toUserMessage } from '../../utils/errors';

type WebhookRow = {
    id: string;
    url: string;
    events: string[];
    secret?: string;
    is_active: boolean;
    created_at: string;
    last_triggered_at?: string | null;
    failure_count?: number | null;
};

const WEBHOOK_EVENTS: Array<{ id: string; label: string; description: string }> = [
    { id: 'audit.completed', label: 'Audit completed', description: 'When an audit finishes successfully.' },
    { id: 'audit.failed', label: 'Audit failed', description: 'When an audit fails.' },
    { id: 'credits.low', label: 'Credits low', description: 'When credits drop below a safe threshold.' },
    { id: 'subscription.updated', label: 'Subscription updated', description: 'When a subscription changes.' },
    { id: 'competitor.visibility_change', label: 'Competitor change', description: 'When competitor visibility shifts.' },
];

function validateWebhookUrl(value: string): { ok: boolean; error?: string } {
    if (!value.trim()) return { ok: false, error: 'Enter a webhook URL.' };
    try {
        const url = new URL(value.trim());
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            return { ok: false, error: 'Webhook URL must start with http:// or https://.' };
        }
        return { ok: true };
    } catch {
        return { ok: false, error: 'Enter a valid URL.' };
    }
}

export const IntegrationsTab: React.FC = () => {
    const toast = useToast();
    const getInvokeErrorMessage = (data: any, error: any, fallback: string): string =>
        data?.error || data?.details?.message || error?.message || fallback;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);

    const [showCreate, setShowCreate] = useState(false);
    const [createUrl, setCreateUrl] = useState('');
    const [createEvents, setCreateEvents] = useState<string[]>(['audit.completed']);
    const [creating, setCreating] = useState(false);
    const [createdSecret, setCreatedSecret] = useState<string | null>(null);
    const [secretCopied, setSecretCopied] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editUrl, setEditUrl] = useState('');
    const [editEvents, setEditEvents] = useState<string[]>([]);
    const [editActive, setEditActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [revealSecret, setRevealSecret] = useState<Record<string, boolean>>({});

    const canCreate = useMemo(() => validateWebhookUrl(createUrl).ok && createEvents.length > 0, [createUrl, createEvents.length]);
    const canSave = useMemo(() => validateWebhookUrl(editUrl).ok && editEvents.length > 0, [editUrl, editEvents.length]);

    const fetchWebhooks = async () => {
        setRefreshing(true);
        try {
            const { data, error } = await supabase.functions.invoke('manage-webhooks', {
                body: { action: 'list' }
            });
            if (error) throw error;
            if (!data?.success) throw new Error(getInvokeErrorMessage(data, error, 'Failed to load webhooks'));
            setWebhooks((data.webhooks || data?.data?.webhooks || []) as WebhookRow[]);
        } catch (error: unknown) {
            console.error('Failed to load webhooks:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
            setWebhooks([]);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWebhooks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleCreateEvent = (eventId: string) => {
        setCreateEvents(prev => prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]);
    };

    const toggleEditEvent = (eventId: string) => {
        setEditEvents(prev => prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]);
    };

    const startEdit = (hook: WebhookRow) => {
        setEditingId(hook.id);
        setEditUrl(hook.url);
        setEditEvents(hook.events || []);
        setEditActive(Boolean(hook.is_active));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditUrl('');
        setEditEvents([]);
        setEditActive(true);
        setSaving(false);
    };

    const handleCreate = async () => {
        const valid = validateWebhookUrl(createUrl);
        if (!valid.ok) {
            toast.error('Invalid webhook', valid.error);
            return;
        }
        if (createEvents.length === 0) {
            toast.error('Select events', 'Choose at least one event.');
            return;
        }

        setCreating(true);
        try {
            const { data, error } = await supabase.functions.invoke('manage-webhooks', {
                body: { action: 'create', url: createUrl.trim(), events: createEvents }
            });
            if (error) throw error;
            if (!data?.success) throw new Error(getInvokeErrorMessage(data, error, 'Failed to create webhook'));

            const webhook = (data.webhook || data?.data?.webhook) as WebhookRow;
            setWebhooks((prev) => [webhook, ...prev]);
            setCreatedSecret(webhook.secret || null);
            setSecretCopied(false);
            toast.success('Webhook created', 'Events will be delivered to your endpoint.');

            setShowCreate(false);
            setCreateUrl('');
            setCreateEvents(['audit.completed']);
        } catch (error: unknown) {
            console.error('Create webhook failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setCreating(false);
        }
    };

    const handleSave = async () => {
        if (!editingId) return;

        const valid = validateWebhookUrl(editUrl);
        if (!valid.ok) {
            toast.error('Invalid webhook', valid.error);
            return;
        }
        if (editEvents.length === 0) {
            toast.error('Select events', 'Choose at least one event.');
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await supabase.functions.invoke('manage-webhooks', {
                body: { action: 'update', webhookId: editingId, url: editUrl.trim(), events: editEvents, isActive: editActive }
            });
            if (error) throw error;
            if (!data?.success) throw new Error(getInvokeErrorMessage(data, error, 'Failed to update webhook'));

            const updated = (data.webhook || data?.data?.webhook) as WebhookRow;
            setWebhooks((prev) => prev.map(w => w.id === updated.id ? updated : w));
            toast.success('Webhook updated', 'Changes saved.');
            cancelEdit();
        } catch (error: unknown) {
            console.error('Update webhook failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (hook: WebhookRow) => {
        if (!confirm('Delete this webhook? This cannot be undone.')) return;

        try {
            const { data, error } = await supabase.functions.invoke('manage-webhooks', {
                body: { action: 'delete', webhookId: hook.id }
            });
            if (error) throw error;
            if (!data?.success) throw new Error(getInvokeErrorMessage(data, error, 'Failed to delete webhook'));
            setWebhooks((prev) => prev.filter(w => w.id !== hook.id));
            toast.success('Webhook deleted', 'Your endpoint will no longer receive events.');
        } catch (error: unknown) {
            console.error('Delete webhook failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        }
    };

    const handleTestWebhook = async (hook: WebhookRow) => {
        toast.success('Sending Test...', 'Dispatching a sample event to your endpoint.');
        try {
            const { data, error } = await supabase.functions.invoke('manage-webhooks', {
                body: { action: 'test', webhookId: hook.id }
            });

            if (error) throw error;

            if (data?.success) {
                if (data.status >= 200 && data.status < 300) {
                    toast.success('Test Successful', `Endpoint returned ${data.status} ${data.statusText}`);
                } else {
                    toast.error('Test Failed', `Endpoint returned ${data.status} ${data.statusText}`);
                }
            } else {
                toast.error('Test Failed', getInvokeErrorMessage(data, error, 'Could not reach endpoint.'));
            }
        } catch (error: unknown) {
            console.error('Test webhook failed:', getTechnicalErrorMessage(error));
            toast.error('Test Failed', 'Could not send test event.');
        }
    };

    const copySecret = async (secret: string) => {
        try {
            await navigator.clipboard.writeText(secret);
            setSecretCopied(true);
            setTimeout(() => setSecretCopied(false), 2000);
        } catch (error) {
            toast.error('Copy failed', 'Select and copy manually.');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-8">
                <div>
                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg">
                            <WebhookIcon className="w-5 h-5 text-primary" />
                        </div>
                        Integrations
                    </h2>
                    <p className="text-text-secondary mt-2 max-w-2xl text-sm">
                        Connect Cognition AI to your tooling with signed webhooks and API access.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={fetchWebhooks}
                        isLoading={refreshing}
                        className="px-4"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={() => setShowCreate(true)} className="px-4">
                        <Plus className="w-4 h-4 mr-2" />
                        Add webhook
                    </Button>
                </div>
            </div>

            {createdSecret && (
                <Card className="p-6 border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white">Webhook secret</p>
                            <p className="text-xs text-text-secondary mt-1">
                                Save this secret now. You’ll use it to verify signatures on incoming requests.
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                                <code className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-emerald-300 break-all">
                                    {createdSecret}
                                </code>
                                <Button
                                    variant="secondary"
                                    onClick={() => copySecret(createdSecret)}
                                    className="px-3"
                                >
                                    {secretCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <button
                                onClick={() => setCreatedSecret(null)}
                                className="mt-3 text-xs text-text-muted hover:text-white transition-colors"
                            >
                                I’ve saved it
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            {/* No-Code Integrations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 border-border bg-gradient-to-br from-[#FF4F00]/10 to-transparent border-[#FF4F00]/20 relative overflow-hidden group hover:border-[#FF4F00]/40 transition-all cursor-pointer">
                    <div className="absolute top-0 right-0 p-3 opacity-50 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight className="w-5 h-5 text-[#FF4F00]" />
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#FF4F00] flex items-center justify-center mb-4 shadow-lg shadow-[#FF4F00]/20">
                        <span className="text-white font-black text-xl">*</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Zapier</h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Automate your visibility workflow. Trigger Zaps when audits complete or scores change.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#FF4F00]">
                        <span className="bg-[#FF4F00]/20 px-2 py-1 rounded-md">Early Access</span>
                    </div>
                </Card>

                <Card className="p-6 border-border bg-gradient-to-br from-[#6C5CE7]/10 to-transparent border-[#6C5CE7]/20 relative overflow-hidden group hover:border-[#6C5CE7]/40 transition-all cursor-pointer">
                    <div className="absolute top-0 right-0 p-3 opacity-50 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight className="w-5 h-5 text-[#6C5CE7]" />
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#6C5CE7] flex items-center justify-center mb-4 shadow-lg shadow-[#6C5CE7]/20">
                        <span className="text-white font-black text-xl">M</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Make.com</h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Build complex visual scenarios. Connect Cognition AI to Slack, Airtable, and more.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#6C5CE7]">
                        <span className="bg-[#6C5CE7]/20 px-2 py-1 rounded-md">Beta</span>
                    </div>
                </Card>

                <Card className="p-6 border-border bg-gradient-to-br from-[#21759B]/10 to-transparent border-[#21759B]/20 relative overflow-hidden group hover:border-[#21759B]/40 transition-all cursor-pointer">
                    <div className="absolute top-0 right-0 p-3 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="secondary"
                            className="h-8 text-xs bg-[#21759B]/20 hover:bg-[#21759B]/30 text-white border-transparent"
                            onClick={(e) => {
                                e.stopPropagation();
                                const link = document.createElement('a');
                                link.href = '/plugins/cognition-ai-visibility.php';
                                link.download = 'cognition-ai.php';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                        >
                            Download Plugin
                        </Button>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#21759B] flex items-center justify-center mb-4 shadow-lg shadow-[#21759B]/20">
                        <span className="text-white font-black text-xl">W</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">WordPress</h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Add a visibility score widget to your WP Admin dashboard. Track progress without leaving your CMS.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#21759B]">
                        <span className="bg-[#21759B]/20 px-2 py-1 rounded-md">New</span>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-7 space-y-6">
                    <Card className="p-6 border-border bg-surface/40">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <LinkIcon className="w-5 h-5 text-primary" />
                                    Webhooks
                                </h3>
                                <p className="text-sm text-text-secondary mt-1">
                                    Receive signed events when audits finish, credits change, or subscriptions update.
                                </p>
                            </div>
                            <Badge variant="default">{webhooks.length} total</Badge>
                        </div>

                        {loading ? (
                            <div className="py-10 text-center text-text-secondary">Loading…</div>
                        ) : webhooks.length === 0 ? (
                            <div className="py-10 text-center">
                                <WebhookIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                <p className="text-white font-semibold">No webhooks yet</p>
                                <p className="text-sm text-text-secondary mt-1">Add a webhook to start receiving events.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {webhooks.map((hook) => {
                                    const isEditing = editingId === hook.id;
                                    const secretVisible = Boolean(revealSecret[hook.id]);
                                    return (
                                        <motion.div
                                            key={hook.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden"
                                        >
                                            <div className="p-5 flex flex-col gap-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={hook.is_active ? 'success' : 'default'}>
                                                                {hook.is_active ? 'Active' : 'Paused'}
                                                            </Badge>
                                                            {hook.failure_count ? (
                                                                <Badge variant="warning">{hook.failure_count} failures</Badge>
                                                            ) : null}
                                                        </div>

                                                        {!isEditing ? (
                                                            <p className="mt-3 text-sm text-white font-semibold break-words">
                                                                {hook.url}
                                                            </p>
                                                        ) : (
                                                            <div className="mt-3">
                                                                <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted">
                                                                    Endpoint URL
                                                                </label>
                                                                <input
                                                                    value={editUrl}
                                                                    onChange={(e) => setEditUrl(e.target.value)}
                                                                    className="mt-2 w-full bg-background border border-border text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                                                                />
                                                                <div className="mt-3 flex items-center gap-2">
                                                                    <input
                                                                        id={`active-${hook.id}`}
                                                                        type="checkbox"
                                                                        checked={editActive}
                                                                        onChange={(e) => setEditActive(e.target.checked)}
                                                                        className="h-4 w-4 rounded border-border bg-background"
                                                                    />
                                                                    <label htmlFor={`active-${hook.id}`} className="text-sm text-text-secondary">
                                                                        Enabled
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                            {(isEditing ? editEvents : (hook.events || [])).map((e) => (
                                                                <span
                                                                    key={e}
                                                                    className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white/5 border border-white/10 text-text-secondary"
                                                                >
                                                                    {e}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {isEditing ? (
                                                            <>
                                                                <Button
                                                                    variant="secondary"
                                                                    onClick={cancelEdit}
                                                                    className="px-3"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    onClick={handleSave}
                                                                    disabled={!canSave}
                                                                    isLoading={saving}
                                                                    className="px-3"
                                                                >
                                                                    <Save className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="secondary"
                                                                    onClick={() => handleTestWebhook(hook)}
                                                                    disabled={!hook.is_active}
                                                                    title="Send Test Event"
                                                                    className="px-3"
                                                                >
                                                                    <ArrowUpRight className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="secondary"
                                                                    onClick={() => startEdit(hook)}
                                                                    className="px-3"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="secondary"
                                                                    onClick={() => handleDelete(hook)}
                                                                    className="px-3"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {isEditing ? (
                                                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted mb-3">
                                                            Events
                                                        </p>
                                                        <div className="grid sm:grid-cols-2 gap-2">
                                                            {WEBHOOK_EVENTS.map((evt) => (
                                                                <label
                                                                    key={evt.id}
                                                                    className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 cursor-pointer hover:border-primary/30 transition-colors"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={editEvents.includes(evt.id)}
                                                                        onChange={() => toggleEditEvent(evt.id)}
                                                                        className="mt-1 h-4 w-4 rounded border-border bg-background"
                                                                    />
                                                                    <span className="min-w-0">
                                                                        <span className="block text-xs font-semibold text-white truncate">{evt.label}</span>
                                                                        <span className="block text-[11px] text-text-muted leading-relaxed">
                                                                            {evt.description}
                                                                        </span>
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}

                                                {hook.secret ? (
                                                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted">
                                                                Signing secret
                                                            </p>
                                                            <button
                                                                onClick={() => setRevealSecret(prev => ({ ...prev, [hook.id]: !prev[hook.id] }))}
                                                                className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-secondary hover:text-white transition-colors"
                                                            >
                                                                {secretVisible ? 'Hide' : 'Show'}
                                                            </button>
                                                        </div>
                                                        <code className="mt-3 block bg-black/40 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-text-secondary break-all">
                                                            {secretVisible ? hook.secret : `${hook.secret.slice(0, 8)}…${hook.secret.slice(-6)}`}
                                                        </code>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    {showCreate && (
                        <Card className="p-6 border-border bg-surface/40">
                            <div className="flex items-center justify-between gap-4">
                                <h4 className="text-white font-semibold">Add webhook</h4>
                                <Button variant="secondary" onClick={() => setShowCreate(false)} className="px-3">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="mt-5 space-y-5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted">
                                        Endpoint URL
                                    </label>
                                    <input
                                        value={createUrl}
                                        onChange={(e) => setCreateUrl(e.target.value)}
                                        placeholder="https://example.com/webhooks/cognition"
                                        className="mt-2 w-full bg-background border border-border text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    {!validateWebhookUrl(createUrl).ok && createUrl.trim().length > 0 ? (
                                        <p className="mt-2 text-xs text-rose-400">{validateWebhookUrl(createUrl).error}</p>
                                    ) : null}
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted mb-3">
                                        Events
                                    </p>
                                    <div className="grid sm:grid-cols-2 gap-2">
                                        {WEBHOOK_EVENTS.map((evt) => (
                                            <label
                                                key={evt.id}
                                                className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 cursor-pointer hover:border-primary/30 transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={createEvents.includes(evt.id)}
                                                    onChange={() => toggleCreateEvent(evt.id)}
                                                    className="mt-1 h-4 w-4 rounded border-border bg-background"
                                                />
                                                <span className="min-w-0">
                                                    <span className="block text-xs font-semibold text-white truncate">{evt.label}</span>
                                                    <span className="block text-[11px] text-text-muted leading-relaxed">
                                                        {evt.description}
                                                    </span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        onClick={handleCreate}
                                        disabled={!canCreate}
                                        isLoading={creating}
                                        className="flex-1"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create webhook
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowCreate(false)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                <div className="xl:col-span-5 space-y-6">
                    <Card className="p-6 border-border bg-surface/40">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-purple-500/20 p-3 rounded-xl">
                                <Key className="w-5 h-5 text-purple-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">API access</h3>
                                <p className="text-sm text-text-secondary">Create and rotate API keys for your tools.</p>
                            </div>
                        </div>
                        <APIKeyManager />
                    </Card>

                    <Card className="p-6 border-border bg-surface/40">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold text-white">Webhook payloads</h3>
                                <p className="text-sm text-text-secondary mt-1">
                                    Requests include an HMAC signature in <code className="font-mono text-xs">X-Cognition-Signature</code>.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 bg-black/30 border border-white/10 rounded-xl p-4 overflow-x-auto">
                            <pre className="text-xs text-slate-300 font-mono">
                                {`{
  "id": "evt_…",
  "event": "audit.completed",
  "organization_id": "org_…",
  "created_at": "2026-02-05T12:00:00Z",
  "data": { "audit_id": "aud_…", "domain": "example.com" }
}`}
                            </pre>
                        </div>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
};
