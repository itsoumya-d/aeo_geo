import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../utils/errors';
import {
    Globe, ShieldCheck, ShieldAlert, Loader2, ArrowRight,
    Copy, Info, Globe2, Plus, Trash2, CheckCircle, ExternalLink
} from 'lucide-react';

interface Domain {
    id: string;
    domain: string;
    verified: boolean;
    verification_token: string;
    created_at: string;
}

export const DomainManagement: React.FC = () => {
    const { organization } = useAuth();
    const toast = useToast();
    const [domains, setDomains] = useState<Domain[]>([]);
    const [newDomain, setNewDomain] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [verifying, setVerifying] = useState<string | null>(null);

    const generateVerificationToken = () => {
        try {
            if (crypto?.randomUUID) return crypto.randomUUID().replace(/-/g, '');
            const bytes = crypto.getRandomValues(new Uint8Array(24));
            return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
        } catch {
            return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }
    };

    useEffect(() => {
        if (organization?.id) {
            loadDomains();
        }
    }, [organization?.id]);

    const loadDomains = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('domains')
            .select('*')
            .eq('organization_id', organization?.id)
            .order('created_at', { ascending: false });

        if (data) setDomains(data);
        setLoading(false);
    };

    const handleAddDomain = async () => {
        if (!newDomain || !organization?.id) return;
        setAdding(true);

        const cleanDomain = newDomain.replace(/https?:\/\//, '').split('/')[0].toLowerCase();
        const token = generateVerificationToken();

        const { data, error } = await supabase
            .from('domains')
            .insert({
                organization_id: organization.id,
                domain: cleanDomain,
                verification_token: token,
                verified: false
            })
            .select()
            .single();

        if (error) {
            console.error('Add domain failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } else {
            setDomains([data, ...domains]);
            setNewDomain('');
            toast.success('Domain Added', 'Follow the instructions below to verify ownership.');
        }
        setAdding(false);
    };

    const handleVerify = async (domainId: string) => {
        setVerifying(domainId);
        try {
            const { data, error } = await supabase.functions.invoke('verify-domain', {
                body: { domainId }
            });

            const verified = Boolean(data?.success ?? data?.verified ?? data?.data?.verified);
            const message =
                data?.message
                || data?.data?.message
                || data?.details?.message
                || (error ? String((error as any)?.message || error) : 'Verification failed');

            if (verified) {
                toast.success('Domain Verified', message);
                setDomains(domains.map(d => d.id === domainId ? { ...d, verified: true } : d));
            } else {
                const user = toUserMessage(message);
                toast.error(user.title, user.message);
            }
        } catch (e: any) {
            console.error('Verify domain failed:', getTechnicalErrorMessage(e));
            const user = toUserMessage(e);
            toast.error(user.title, user.message);
        } finally {
            setVerifying(null);
        }
    };

    const handleDelete = async (domainId: string) => {
        if (!confirm('Are you sure you want to remove this domain?')) return;

        const { error } = await supabase
            .from('domains')
            .delete()
            .eq('id', domainId);

        if (error) {
            console.error('Delete domain failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } else {
            setDomains(domains.filter(d => d.id !== domainId));
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info('Copied', 'Verification token copied to clipboard.');
    };

    if (loading) return (
        <div className="space-y-8 animate-pulse">
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-6 w-48 bg-surfaceHighlight rounded-lg mb-2" />
                    <div className="h-4 w-72 bg-surfaceHighlight rounded-lg" />
                </div>
            </div>
            <div className="bg-surfaceHighlight border border-border rounded-2xl p-6">
                <div className="flex gap-4">
                    <div className="flex-1 h-12 bg-surfaceHighlight rounded-xl" />
                    <div className="h-12 w-36 bg-surfaceHighlight rounded-xl" />
                </div>
            </div>
            {[1, 2].map(i => (
                <div key={i} className="bg-surface border border-border rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-surfaceHighlight rounded-xl" />
                        <div>
                            <div className="h-5 w-40 bg-surfaceHighlight rounded-lg mb-2" />
                            <div className="h-3 w-28 bg-surfaceHighlight rounded-lg" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        <Globe2 className="w-5 h-5 text-primary" />
                        Verified Domains
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Manage and verify ownership of your company domains.</p>
                </div>
            </div>

            {/* Add Domain */}
            <div className="bg-surfaceHighlight border border-border rounded-2xl p-6">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="example.com"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                            className="w-full bg-background border border-border text-text-primary rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <button
                        onClick={handleAddDomain}
                        disabled={adding || !newDomain}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Domain
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 uppercase tracking-widest font-bold">
                    <Info className="w-3 h-3" /> Note: Only verified domains can be audited on Professional plans.
                </p>
            </div>

            {/* Domain List */}
            <div className="grid grid-cols-1 gap-6">
                {domains.map((domain) => (
                    <div key={domain.id} className="bg-surface border border-border rounded-2xl overflow-hidden shadow-lg group">
                        <div className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${domain.verified ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                    {domain.verified ? (
                                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                    ) : (
                                        <ShieldAlert className="w-6 h-6 text-amber-400" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-text-primary text-lg flex items-center gap-2">
                                        {domain.domain}
                                        {domain.verified && (
                                            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                Verified
                                            </span>
                                        )}
                                    </h4>
                                    <p className="text-xs text-slate-500">Added on {new Date(domain.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {!domain.verified && (
                                    <button
                                        onClick={() => handleVerify(domain.id)}
                                        disabled={verifying === domain.id}
                                        className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                    >
                                        {verifying === domain.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Now'}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(domain.id)}
                                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {!domain.verified && (
                            <div className="bg-surfaceHighlight/20 border-t border-border p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* DNS Method */}
                                    <div className="space-y-4">
                                        <h5 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center">1</span>
                                            Via DNS TXT Record (Recommended)
                                        </h5>
                                        <div className="bg-surface rounded-xl p-4 border border-border">
                                            <p className="text-xs text-text-muted mb-3 leading-relaxed">Add the following TXT record to your DNS configuration:</p>
                                            <div className="flex items-center justify-between gap-3 bg-black/40 p-3 rounded-lg border border-border/50">
                                                <code className="text-xs text-emerald-400 font-mono break-all">cognition-v-token={domain.verification_token}</code>
                                                <button onClick={() => copyToClipboard(`cognition-v-token=${domain.verification_token}`)} className="text-slate-500 hover:text-text-primary transition-colors">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* HTML Method */}
                                    <div className="space-y-4">
                                        <h5 className="text-sm font-bold text-text-primary flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] flex items-center justify-center">2</span>
                                            Via HTML Meta Tag
                                        </h5>
                                        <div className="bg-surface rounded-xl p-4 border border-border">
                                            <p className="text-xs text-text-muted mb-3 leading-relaxed">Add this meta tag to the {`<head>`} section of your homepage:</p>
                                            <div className="flex items-center justify-between gap-3 bg-black/40 p-3 rounded-lg border border-border/50">
                                                <code className="text-[10px] text-blue-400 font-mono break-all">
                                                    {`<meta name="cognition-verification" content="${domain.verification_token}" />`}
                                                </code>
                                                <button onClick={() => copyToClipboard(`<meta name="cognition-verification" content="${domain.verification_token}" />`)} className="text-slate-500 hover:text-text-primary transition-colors">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {domains.length === 0 && (
                    <div className="bg-surfaceHighlight border border-border rounded-2xl p-12 text-center">
                        <Globe className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <h4 className="text-text-primary font-bold mb-1">No domains added yet</h4>
                        <p className="text-sm text-slate-500">Add your first domain to begin the verification process.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
