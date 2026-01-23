import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './Toast';
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

    const loadKeys = async () => {
        if (!organization?.id) return;
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('manage-api-keys', {
                body: { action: 'list' }
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error);

            setKeys(data.keys || []);
        } catch (error: any) {
            console.error('Failed to load API keys:', error);
            // Don't show error toast if table doesn't exist yet
            if (!error.message?.includes('relation') && !error.message?.includes('does not exist')) {
                toast.error('Failed to load API keys', error.message);
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
            if (!data.success) throw new Error(data.error);

            toast.success('API Key Created', 'Copy it now - you won\'t be able to see it again.');
            setNewlyCreatedKey(data.apiKey);
            setNewKeyName('');
            setShowCreateForm(false);
            loadKeys(); // Refresh list
        } catch (error: any) {
            toast.error('Failed to create key', error.message);
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
            if (!data.success) throw new Error(data.error);

            toast.success('Key revoked', `"${keyName}" has been revoked.`);
            loadKeys();
        } catch (error: any) {
            toast.error('Failed to revoke', error.message);
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
            if (!data.success) throw new Error(data.error);

            toast.success('Key Rotated', 'New key generated successfully. Copy it now.');
            setNewlyCreatedKey(data.apiKey);
            loadKeys();
        } catch (error: any) {
            toast.error('Rotation failed', error.message);
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
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">API Access</h3>
                <p className="text-sm text-slate-400 mb-4">
                    API access is available on Pro and Agency plans.
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-500/20 p-3 rounded-xl">
                        <Key className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">API Keys</h3>
                        <p className="text-sm text-slate-400">{keys.length} key{keys.length !== 1 ? 's' : ''} active</p>
                    </div>
                </div>
                {isOwnerOrAdmin && !showCreateForm && (
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Key
                    </button>
                )}
            </div>

            {/* Newly Created Key Display */}
            {newlyCreatedKey && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-medium text-emerald-400 mb-2">API Key Created!</h4>
                            <p className="text-xs text-slate-400 mb-3">
                                Copy this key now. You won't be able to see it again.
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-slate-900 text-white px-3 py-2 rounded-lg font-mono text-sm break-all">
                                    {newlyCreatedKey}
                                </code>
                                <button
                                    onClick={handleCopyKey}
                                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg transition-colors"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <button
                                onClick={() => setNewlyCreatedKey(null)}
                                className="text-sm text-slate-500 hover:text-white mt-3 transition-colors"
                            >
                                I've saved my key
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Form */}
            {showCreateForm && (
                <form onSubmit={handleCreateKey} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <h4 className="font-medium text-white mb-3">Create New API Key</h4>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="Key name (e.g., Production)"
                            className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-500"
                            required
                        />
                        <button
                            type="submit"
                            disabled={creating || !newKeyName.trim()}
                            className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateForm(false)}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Keys List */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : keys.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                    <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h4 className="font-medium text-white mb-2">No API Keys Yet</h4>
                    <p className="text-sm text-slate-400">
                        Create an API key to integrate Cognition with your tools.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {keys.map(key => (
                        <div
                            key={key.id}
                            className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                                        <Key className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-white">{key.name}</p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span className="font-mono">cog_•••{key.key_preview}</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Created {new Date(key.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {isOwnerOrAdmin && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleRotateKey(key.id, key.name)}
                                            className="text-slate-400 hover:text-primary transition-colors p-2"
                                            title="Rotate key"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleRevokeKey(key.id, key.name)}
                                            className="text-slate-400 hover:text-rose-400 transition-colors p-2"
                                            title="Revoke key"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <BarChart2 className="w-3.5 h-3.5" />
                                        <span>Daily Usage</span>
                                    </div>
                                    <span className="text-slate-300 font-medium">
                                        {key.usage_count.toLocaleString()} / {key.rate_limit.toLocaleString()} calls
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${(key.usage_count / key.rate_limit) > 0.9 ? 'bg-rose-500' :
                                                (key.usage_count / key.rate_limit) > 0.7 ? 'bg-amber-500' : 'bg-primary'
                                            }`}
                                        style={{ width: `${Math.min(100, (key.usage_count / key.rate_limit) * 100)}%` }}
                                    />
                                </div>
                                {key.last_used_at && (
                                    <p className="text-[10px] text-slate-500 italic">
                                        Last used {new Date(key.last_used_at).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Notice */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="text-sm text-slate-400">
                    <p className="font-medium text-slate-300 mb-1">Keep your API keys secure</p>
                    <p>Never share or commit API keys to public repositories. Rotate keys periodically.</p>
                </div>
            </div>
        </div>
    );
};
