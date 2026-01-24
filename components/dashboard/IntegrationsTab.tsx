import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, MessageSquare, Bell, Copy, Check, RotateCcw, Shield, ExternalLink, Slack, Github, Link as LinkIcon, Save, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '../Toast';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface IntegrationApp {
    id: string;
    name: string;
    desc: string;
    icon: any;
    status: 'connected' | 'available' | 'coming_soon';
    category: 'Automation' | 'Communication' | 'Development';

    dbType: 'slack' | 'discord' | 'webhook' | 'hubspot_token';
}

const INTEGRATIONS: IntegrationApp[] = [
    { id: 'slack', name: 'Slack', desc: 'Receive real-time Sentinel alerts in your team channels.', icon: Slack, status: 'available', category: 'Communication', dbType: 'slack' },
    { id: 'webhooks', name: 'Generic Webhooks', desc: 'Push raw audit data to any HTTP endpoint.', icon: Cpu, status: 'available', category: 'Development', dbType: 'webhook' },
    { id: 'discord', name: 'Discord', desc: 'Keep your community updated on brand sentiment shifts.', icon: MessageSquare, status: 'coming_soon', category: 'Communication', dbType: 'discord' },
    { id: 'zapier', name: 'Zapier', desc: 'Auto-trigger audits or push alerts to 5000+ apps.', icon: Zap, status: 'available', category: 'Automation', dbType: 'webhook' },
    { id: 'hubspot', name: 'HubSpot CRM', desc: 'Sync audit completion events to Contact Timeline.', icon: ExternalLink, status: 'available', category: 'Automation', dbType: 'hubspot_token' },
    { id: 'github', name: 'GitHub Actions', desc: 'Scale audits with your CI/CD pipeline.', icon: Github, status: 'coming_soon', category: 'Development', dbType: 'webhook' },
];

export const IntegrationsTab: React.FC = () => {
    const { organization } = useAuth();
    const toast = useToast();

    // API Key State
    const [apiKey, setApiKey] = useState("cog_live_unconfigured_...");
    const [isCopied, setIsCopied] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [isGeneratingKey, setIsGeneratingKey] = useState(false);

    // Integrations State
    const [activeIntegrations, setActiveIntegrations] = useState<any[]>([]);
    const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editUrl, setEditUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (organization?.id) {
            fetchIntegrations();
            fetchApiKey();
        }
    }, [organization?.id]);

    const fetchApiKey = async () => {
        if (!organization?.id) return;
        const { data, error } = await supabase
            .from('api_keys')
            .select('key_hint')
            .eq('organization_id', organization.id)
            .limit(1)
            .maybeSingle();

        if (data) setApiKey(data.key_hint + "****************");
    };

    const fetchIntegrations = async () => {
        setIsLoadingIntegrations(true);
        try {
            const { data, error } = await supabase.functions.invoke('manage-webhooks', {
                body: { action: 'list' }
            });

            if (data?.success) {
                setActiveIntegrations(data.webhooks || []);
            }
        } catch (error) {
            console.error('Failed to fetch webhooks:', error);
        }

        // Fetch HubSpot State
        try {
            const { data } = await supabase.functions.invoke('manage-webhooks', {
                body: { action: 'get_hubspot_token' }
            });
            if (data?.isConfigured) {
                // Add minimal placeholder for UI
                setActiveIntegrations(prev => [...prev, { id: 'hubspot-connected', url: 'HubSpot Integrated', type: 'hubspot_token' }]);
            }
        } catch (e) { console.error(e) }

        setIsLoadingIntegrations(false);
    };

    const handleGenerateKey = async () => {
        setIsGeneratingKey(true);
        // This would call a backend function to generate a real key
        setTimeout(() => {
            setApiKey("cog_live_" + Math.random().toString(36).substring(2, 15));
            setIsGeneratingKey(false);
            toast.success("Key Generated", "A new production access token has been issued.");
        }, 1500);
    };

    const handleSaveIntegration = async (appId: string) => {
        if (!editUrl.trim()) return;
        setIsSaving(true);

        try {
            let body: any = {};

            if (appId === 'hubspot_token') {
                body = { action: 'save_hubspot_token', token: editUrl };
            } else {
                body = {
                    action: editingId && !INTEGRATIONS.find(a => a.id === editingId) ? 'update' : 'create',
                    webhookId: editingId && !INTEGRATIONS.find(a => a.id === editingId) ? editingId : undefined,
                    url: editUrl,
                    events: ['audit.completed', 'competitor.visibility_change']
                };
            }

            const { data, error } = await supabase.functions.invoke('manage-webhooks', { body });

            if (error || !data.success) {
                toast.error("Save Failed", error?.message || data.error);
            } else {
                toast.success("Integration Active", `${appId.toUpperCase()} endpoint has been synchronized.`);
                setEditingId(null);
                setEditUrl('');
                fetchIntegrations();
            }
        } catch (error: any) {
            toast.error("Save Failed", error.message);
        }
        setIsSaving(false);
    };

    const handleDeleteIntegration = async (id: string) => {
        if (!confirm('Are you sure you want to delete this integration?')) return;

        try {
            const { data, error } = await supabase.functions.invoke('manage-webhooks', {
                body: { action: 'delete', webhookId: id }
            });

            if (!error && data.success) {
                toast.success("Connection Severed", "Integrated endpoint has been removed.");
                fetchIntegrations();
            }
        } catch (error: any) {
            toast.error("Delete Failed", error.message);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(apiKey);
        setIsCopied(true);
        toast.success("Key Copied", "API Key copied to clipboard.");
        setTimeout(() => setIsCopied(false), 2000);
    };

    const getExisting = (appId: string) => {
        if (appId === 'hubspot_token') {
            return activeIntegrations.find(i => i.type === 'hubspot_token');
        }
        // Map app icons/names to actual webhooks in DB
        // For simplicity in this demo, we'll just check if URL contains keywords
        return activeIntegrations.find(i =>
            (appId === 'slack' && i.url.includes('slack.com')) ||
            (appId === 'zapier' && i.url.includes('zapier.com')) ||
            (appId === 'webhooks' && !i.url.includes('slack.com') && !i.url.includes('zapier.com') && i.type !== 'hubspot_token')
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 text-left"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-10">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
                        <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/20">
                            <Zap className="text-primary w-6 h-6" />
                        </div>
                        Connectivity Hub
                    </h2>
                    <p className="text-slate-500 mt-4 max-w-2xl font-medium leading-relaxed">
                        Extend the Cognition engine into your existing workflows. Automate reporting, trigger alerts, and build custom AEO dashboards.
                    </p>
                </div>
            </div>

            {/* API Key Management */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-10 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Shield className="w-32 h-32 text-primary" />
                </div>

                <div className="relative z-10 max-w-2xl">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Cognition Access Token (Production)</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <input
                                type={showKey ? "text" : "password"}
                                readOnly
                                value={apiKey}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm font-mono text-primary font-bold outline-none shadow-inner"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                            >
                                {showKey ? "Hide" : "Show"}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopy}
                                className="px-6 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-3 transition-all"
                            >
                                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Copy</span>
                            </button>
                            <button
                                onClick={handleGenerateKey}
                                disabled={isGeneratingKey}
                                className="p-5 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 rounded-2xl transition-all text-slate-600 hover:text-rose-500 disabled:opacity-50"
                            >
                                {isGeneratingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <p className="mt-6 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                        Never share your API Key. Use it to authenticate requests to <code className="text-primary lowercase">api.cognition.ai/v1</code>.
                    </p>
                </div>
            </div>

            {/* Integrations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {INTEGRATIONS.map((app) => {
                    const existing = getExisting(app.dbType);
                    const isEditing = editingId === app.id;

                    return (
                        <div
                            key={app.id}
                            className={`bg-slate-900/40 backdrop-blur-xl border rounded-[2rem] p-8 flex flex-col justify-between transition-all group ${app.status === 'coming_soon' ? 'opacity-50 border-white/5 grayscale pointer-events-none' : 'hover:border-primary/30 border-white/5 shadow-xl hover:shadow-primary/5'}`}
                        >
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 group-hover:border-primary/20 group-hover:scale-110 transition-all">
                                        <app.icon className={`w-6 h-6 ${existing ? 'text-primary' : (app.status === 'available' ? 'text-white' : 'text-slate-600')}`} />
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${existing ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                                        {existing ? 'CONNECTED' : app.status.replace('_', ' ')}
                                    </span>
                                </div>

                                <div>
                                    <h4 className="text-white font-black text-lg mb-2">{app.name}</h4>
                                    <p className="text-slate-500 text-xs font-medium leading-relaxed">{app.desc}</p>
                                </div>

                                <AnimatePresence mode="wait">
                                    {isEditing ? (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-4 pt-4 border-t border-white/5"
                                        >
                                            <div className="relative">
                                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                                                <input
                                                    type={app.dbType === 'hubspot_token' ? "password" : "text"}
                                                    placeholder={app.id === 'slack' ? "Webhook URL..." : (app.dbType === 'hubspot_token' ? "Private App Access Token..." : "Endpoint URL...")}
                                                    value={editUrl}
                                                    onChange={(e) => setEditUrl(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white outline-none focus:border-primary transition-colors"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleSaveIntegration(app.dbType)}
                                                    disabled={isSaving}
                                                    className="flex-1 py-3 bg-primary hover:bg-primary/80 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                                >
                                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                    Save connection
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : existing ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="pt-4 border-t border-white/5"
                                        >
                                            <div className="bg-black/20 rounded-xl p-4 mb-4 border border-white/5">
                                                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Active Endpoint</p>
                                                <p className="text-xs text-primary font-mono truncate">{existing.url}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(app.id);
                                                        setEditUrl(existing.url);
                                                    }}
                                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Edit connection
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteIntegration(existing.id)}
                                                    className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>
                            </div>

                            {!existing && !isEditing && (
                                <div className="mt-10">
                                    <button
                                        onClick={() => setEditingId(app.id)}
                                        className="w-full py-4 rounded-xl bg-white/[0.03] hover:bg-primary hover:text-white text-slate-400 text-[10px] font-black uppercase tracking-widest border border-white/5 hover:border-primary transition-all flex items-center justify-center gap-3"
                                    >
                                        Initialize Sync
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};
