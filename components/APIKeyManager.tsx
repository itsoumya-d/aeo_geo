import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../utils/errors';
import {
    Key, Plus, Trash2, Copy, Check, Eye, EyeOff,
    Loader2, AlertTriangle, Clock, RefreshCw, BarChart2
} from 'lucide-react';

interface APIKey {
    id: string;
    name: string;
    key_preview: string;
    permissions: string[];
    created_at: string;
    last_used_at: string | null;
    expires_at: string | null;
    usage_count: number;
    rate_limit: number;
}

export const APIKeyManager: React.FC = () => {
    const { profile, organization } = useAuth();
    const toast = useToast();

    const [keys, setKeys] = useState<APIKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const isOwnerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin';
    const isPaidPlan = organization?.plan !== 'free';

    useEffect(() => {
        if (organization?.id) {
            loadKeys();
        }
    }, [organization?.id]);

    const getInvokeErrorMessage = (data: any, error: any): string => {
        if (data?.error && typeof data.error === 'string') return data.error;
        if (data?.details?.message) return data.details.message;
        if (error?.message) return error.message;
        return 'Request failed';
    };

    const loadKeys = async () => {
        if (!organization?.id) return;
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('manage-api-keys', {
                body: { action: 'list' }
            });

            if (error) throw error;
            if (!data.success) throw new Error(getInvokeErrorMessage(data, error));

            setKeys(data.keys || data?.data?.keys || []);
        } catch (error: any) {
            console.error('Failed to load API keys:', getTechnicalErrorMessage(error));
            // Don't show error toast if table doesn't exist yet
            if (!error.message?.includes('relation') && !error.message?.includes('does not exist')) {
                const user = toUserMessage(error);
                toast.error(user.title, user.message);
            }
            setKeys([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName.trim() || !organization?.id) return;

        setCreating(true);
        try {
            const { data, error } = await supabase.functions.invoke('manage-api-keys', {
                body: { action: 'create', name: newKeyName.trim() }
            });

            if (error) throw error;
            if (!data.success) throw new Error(getInvokeErrorMessage(data, error));

            toast.success('API Key Created', 'Copy it now - you won\'t be able to see it again.');
            setNewlyCreatedKey(data.apiKey || data?.data?.apiKey);
            setNewKeyName('');
            setShowCreateForm(false);
            loadKeys(); // Refresh list
        } catch (error: any) {
            console.error('Create API key failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setCreating(false);
        }
    };

    const handleRevokeKey = async (keyId: string, keyName: string) => {
        if (!confirm(`Revoke API key "${keyName}"? This action cannot be undone.`)) return;

        try {
            const { data, error } = await supabase.functions.invoke('manage-api-keys', {
                body: { action: 'revoke', keyId }
            });

            if (error) throw error;
            if (!data.success) throw new Error(getInvokeErrorMessage(data, error));

            toast.success('Key revoked', `"${keyName}" has been revoked.`);
            loadKeys();
        } catch (error: any) {
            console.error('Revoke API key failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        }
    };

    const handleRotateKey = async (keyId: string, keyName: string) => {
        if (!confirm(`Rotate API key "${keyName}"? This will invalidate the existing key and generate a new one. Current applications using this key will stop working until updated.`)) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('manage-api-keys', {
                body: { action: 'rotate', keyId }
            });

            if (error) throw error;
            if (!data.success) throw new Error(getInvokeErrorMessage(data, error));

            toast.success('Key Rotated', 'New key generated successfully. Copy it now.');
            setNewlyCreatedKey(data.apiKey || data?.data?.apiKey);
            loadKeys();
        } catch (error: any) {
            console.error('Rotate API key failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyKey = async () => {
        if (!newlyCreatedKey) return;
        try {
            await navigator.clipboard.writeText(newlyCreatedKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Copy failed', 'Please select and copy manually.');
        }
    };

    if (!isPaidPlan) {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Key className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">Developer API Access</h3>
                <p className="text-sm text-blue-700 mb-2 max-w-sm mx-auto">
                    Integrate Cognition into your workflows with our REST API. Available on Pro and Agency plans.
                </p>
                <div className="flex justify-center gap-4 text-xs text-blue-600 font-semibold mb-6">
                    <span>Pro: 1,000 calls/day</span>
                    <span>·</span>
                    <span>Agency: 5,000 calls/day</span>
                </div>
                <a
                    href="/settings/billing"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                    Upgrade to Pro — $149/mo
                </a>
            </div>
        );
    }

    const planRateLimit = organization?.plan === 'agency' ? '5,000' : organization?.plan === 'pro' ? '1,000' : '100';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-blue-100">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <Key className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Developer API Keys</h3>
                        <p className="text-sm text-slate-500">
                            {keys.length} key{keys.length !== 1 ? 's' : ''} active · {planRateLimit} calls/day limit
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href="/docs/api"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-xl px-3 py-1.5 transition-all bg-white"
                    >
                        API Docs →
                    </a>
                    {isOwnerOrAdmin && !showCreateForm && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Key
                        </button>
                    )}
                </div>
            </div>

            {/* Newly Created Key — one-time reveal */}
            {newlyCreatedKey && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-bold text-emerald-700 mb-1">API Key Created!</h4>
                            <p className="text-xs text-emerald-600 mb-3">
                                Copy this key now — it won't be shown again for security.
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-white border border-emerald-200 text-slate-700 px-3 py-2.5 rounded-xl font-mono text-sm break-all">
                                    {newlyCreatedKey}
                                </code>
                                <button
                                    onClick={handleCopyKey}
                                    className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-xl transition-colors"
                                    title="Copy key"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <button
                                onClick={() => setNewlyCreatedKey(null)}
                                className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold mt-3 transition-colors"
                            >
                                ✓ I've saved my key
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Form */}
            {showCreateForm && (
                <form onSubmit={handleCreateKey} className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <h4 className="font-bold text-slate-700 mb-3 text-sm">Name Your API Key</h4>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="e.g. Production, Staging, My App"
                            className="flex-1 bg-white border border-blue-200 text-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none placeholder:text-slate-400 text-sm"
                            autoFocus
                            required
                        />
                        <button
                            type="submit"
                            disabled={creating || !newKeyName.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateForm(false)}
                            className="bg-white border border-blue-200 text-slate-600 hover:bg-blue-50 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Keys List */}
            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                </div>
            ) : keys.length === 0 ? (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-10 text-center">
                    <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Key className="w-6 h-6 text-blue-400" />
                    </div>
                    <h4 className="font-bold text-slate-700 mb-1">No API Keys Yet</h4>
                    <p className="text-sm text-slate-500">Create a key to integrate Cognition with your tools and workflows.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {keys.map(key => {
                        const usagePct = Math.min(100, (key.usage_count / key.rate_limit) * 100);
                        const barColor = usagePct > 90 ? 'bg-red-500' : usagePct > 70 ? 'bg-amber-400' : 'bg-blue-500';
                        return (
                            <div
                                key={key.id}
                                className="bg-white border border-blue-100 rounded-xl p-5 hover:border-blue-200 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                            <Key className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate">{key.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                                <span className="font-mono bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">cog_•••{key.key_preview}</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(key.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {isOwnerOrAdmin && (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => handleRotateKey(key.id, key.name)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 hover:bg-blue-50 rounded-lg"
                                                title="Rotate key"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleRevokeKey(key.id, key.name)}
                                                className="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                                                title="Revoke key"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <BarChart2 className="w-3 h-3" />
                                            <span>Daily usage</span>
                                        </div>
                                        <span className="font-semibold text-slate-600">
                                            {key.usage_count.toLocaleString()} / {key.rate_limit.toLocaleString()} calls
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                            style={{ width: `${usagePct}%` }}
                                        />
                                    </div>
                                    {key.last_used_at && (
                                        <p className="text-[10px] text-slate-400">
                                            Last used {new Date(key.last_used_at).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Rate Limits by Plan */}
            <div className="bg-slate-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Rate Limits by Plan</p>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className={`rounded-lg p-2.5 border ${organization?.plan === 'starter' ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                        <p className="font-bold text-slate-700">Starter</p>
                        <p className="text-blue-600 font-semibold">100/day</p>
                    </div>
                    <div className={`rounded-lg p-2.5 border ${organization?.plan === 'pro' ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                        <p className="font-bold text-slate-700">Pro</p>
                        <p className="text-blue-600 font-semibold">1,000/day</p>
                    </div>
                    <div className={`rounded-lg p-2.5 border ${organization?.plan === 'agency' ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                        <p className="font-bold text-slate-700">Agency</p>
                        <p className="text-blue-600 font-semibold">5,000/day</p>
                    </div>
                </div>
            </div>

            {/* Security notice */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">Keep keys secure.</span>{' '}
                    Never share or commit API keys to public repositories. Rotate keys if you suspect exposure.
                </p>
            </div>
        </div>
    );
};
