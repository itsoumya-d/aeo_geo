import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, updateOnboardingStatus, upsertDomain } from '../services/supabase';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Rocket, Building2, Globe, Users, Check, ChevronRight, ChevronLeft,
    Loader2, Sparkles, Briefcase, ShieldCheck, Zap, Search, AlertCircle,
    Copy, ExternalLink
} from 'lucide-react';

interface OnboardingData {
    persona: 'agency' | 'brand';
    companyName: string;
    websiteUrl: string;
    teamSize: 'solo' | 'small' | 'medium' | 'large';
    primaryGoal: 'visibility' | 'content' | 'competitive' | 'monitoring';
    keywords: string[];
    competitors: string[];
}

const PERSONAS = [
    {
        id: 'brand',
        label: 'I work for a Brand',
        description: 'Optimizing my own company\'s AI footprint',
        icon: Building2,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10'
    },
    {
        id: 'agency',
        label: 'I work for an Agency',
        description: 'Managing AI visibility for multiple clients',
        icon: Briefcase,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10'
    },
];

const TEAM_SIZES = [
    { id: 'solo', label: 'Just me', description: 'Solopreneur or freelancer' },
    { id: 'small', label: '2-10', description: 'Small team' },
    { id: 'medium', label: '11-50', description: 'Growing company' },
    { id: 'large', label: '50+', description: 'Enterprise' },
];

const GOALS = [
    { id: 'visibility', label: 'Improve AI Visibility', description: 'Get seen by ChatGPT, Gemini, Perplexity' },
    { id: 'content', label: 'Optimize Content', description: 'Make existing pages more "AEO-friendly"' },
    { id: 'competitive', label: 'Competitive Gap', description: 'Identify where competitors outrank you' },
    { id: 'monitoring', label: 'Threat Monitoring', description: 'Alerts when AI brand perception changes' },
];

export const OnboardingWizard: React.FC<{
    onComplete: () => void,
    onStartFirstAudit?: (domain: string) => void
}> = ({ onComplete, onStartFirstAudit }) => {
    const { user, organization, onboarding, refreshOrganization } = useAuth();
    const toast = useToast();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verificationSuccess, setVerificationSuccess] = useState<boolean | null>(null);
    const [domainData, setDomainData] = useState<any>(null);

    const [data, setData] = useState<OnboardingData>({
        persona: 'brand',
        companyName: '',
        websiteUrl: '',
        teamSize: 'solo',
        primaryGoal: 'visibility',
        keywords: [],
        competitors: [],
    });

    // Load initial state if exists
    useEffect(() => {
        if (onboarding?.persona) {
            setData(prev => ({
                ...prev,
                persona: onboarding.persona as 'agency' | 'brand',
                ...onboarding.onboarding_data
            }));
            setStep(onboarding.current_step || 1);
        } else if (organization?.name) {
            setData(prev => ({ ...prev, companyName: organization.name }));
        }
    }, [onboarding, organization]);

    const totalSteps = 5;

    const handleNext = async () => {
        if (step === 1) {
            // Save persona immediately
            await updateOnboardingStatus({ persona: data.persona, current_step: 2 });
            setStep(2);
        } else if (step === 2) {
            if (!data.companyName.trim()) {
                toast.error('Company name is required');
                return;
            }
            // Create org if doesn't exist (handled by createOrg in AuthContext usually, but here we update)
            setLoading(true);
            try {
                if (!organization) {
                    await supabase.from('organizations').insert({ name: data.companyName }).select().single();
                } else {
                    await supabase.from('organizations').update({ name: data.companyName }).eq('id', organization.id);
                }

                if (data.websiteUrl) {
                    const d = await upsertDomain(data.websiteUrl);
                    setDomainData(d);
                }

                await updateOnboardingStatus({
                    current_step: 3,
                    onboarding_data: { ...data, companyName: data.companyName, websiteUrl: data.websiteUrl }
                });
                setStep(3);
            } finally {
                setLoading(false);
            }
        } else if (step === 3) {
            setStep(4);
        } else if (step === 4) {
            await updateOnboardingStatus({
                current_step: 5,
                onboarding_data: { ...data }
            });
            setStep(5);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleVerifyToken = async () => {
        if (!domainData?.id) return;
        setVerifying(true);
        setVerificationSuccess(null);

        try {
            const { data: result, error } = await supabase.functions.invoke('verify-domain', {
                body: { domainId: domainData.id }
            });

            if (error) throw error;

            if (result.success) {
                setVerificationSuccess(true);
                toast.success('Domain Verified!', 'Your brand identity is confirmed.');
            } else {
                setVerificationSuccess(false);
                toast.error('Verification Failed', result.message || 'We couldn\'t find the token yet.');
            }
        } catch (err: any) {
            toast.error('Verification Error', err.message);
            setVerificationSuccess(false);
        } finally {
            setVerifying(false);
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            await updateOnboardingStatus({
                is_completed: true,
                completed_at: new Date().toISOString(),
                onboarding_data: data
            });
            await refreshOrganization();
            if (data.websiteUrl && onStartFirstAudit) {
                onStartFirstAudit(data.websiteUrl);
            }
            onComplete();
        } catch (error: any) {
            toast.error('Setup failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateData = (updates: Partial<OnboardingData>) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    const stepVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-2xl z-10">
                {/* Header */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold uppercase tracking-wider mb-4"
                    >
                        <Zap className="w-3 h-3 text-primary-light" />
                        AEO Engine Setup
                    </motion.div>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        Forge your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">AI Identity</span>
                    </h1>
                </div>

                {/* Progress Indicators */}
                <div className="flex gap-2 mb-8 justify-center">
                    {Array.from({ length: totalSteps }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-500 ${step > i + 1 ? 'w-8 bg-primary' :
                                step === i + 1 ? 'w-12 bg-primary' : 'w-4 bg-slate-800'
                                }`}
                        />
                    ))}
                </div>

                {/* Main Card */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                    <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden min-h-[480px] flex flex-col">

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                variants={stepVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="flex-1"
                            >
                                {/* Step 1: Persona */}
                                {step === 1 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-8">
                                            <h2 className="text-2xl font-bold text-white">Who are you?</h2>
                                            <p className="text-slate-400 mt-2">Help us tailor the metrics to your workflow</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {PERSONAS.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => updateData({ persona: p.id as any })}
                                                    className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group/card ${data.persona === p.id
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-white/5 bg-white/5 hover:border-white/10'
                                                        }`}
                                                >
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${p.bg}`}>
                                                        <p.icon className={`w-6 h-6 ${p.color}`} />
                                                    </div>
                                                    <h3 className="font-bold text-lg text-white mb-1">{p.label}</h3>
                                                    <p className="text-sm text-slate-400">{p.description}</p>
                                                    {data.persona === p.id && (
                                                        <div className="absolute top-4 right-4">
                                                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                                                <Check className="w-4 h-4 text-white" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Identity */}
                                {step === 2 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-8">
                                            <h2 className="text-2xl font-bold text-white">Brand Identity</h2>
                                            <p className="text-slate-400 mt-2">Which brand are we optimizing today?</p>
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Company Name</label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                                    <input
                                                        type="text"
                                                        value={data.companyName}
                                                        onChange={(e) => updateData({ companyName: e.target.value })}
                                                        placeholder="e.g. Acme SaaS"
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2 px-1">Primary Website</label>
                                                <div className="relative">
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                                    <input
                                                        type="url"
                                                        value={data.websiteUrl}
                                                        onChange={(e) => updateData({ websiteUrl: e.target.value })}
                                                        placeholder="https://acme.com"
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-2 px-1 italic">We'll use this as the baseline for your Knowledge Graph</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Verification */}
                                {step === 3 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-6">
                                            <h2 className="text-2xl font-bold text-white">Confirm Ownership</h2>
                                            <p className="text-slate-400 mt-2">Validate your domain to unlock premium visibility depth</p>
                                        </div>

                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                            <p className="text-sm text-slate-300 mb-4">Add this meta-tag to your site's <code className="text-primary-light">&lt;head&gt;</code> section:</p>
                                            <div className="bg-black/40 rounded-xl p-4 flex items-center justify-between border border-white/5 group/code">
                                                <code className="text-xs text-blue-300 font-mono overflow-x-auto whitespace-nowrap mr-3">
                                                    {`<meta name="cognition-verification" content="${domainData?.verification_token || 'generating...'}" />`}
                                                </code>
                                                <button
                                                    onClick={() => {
                                                        const token = domainData?.verification_token;
                                                        if (token) {
                                                            navigator.clipboard.writeText(`<meta name="cognition-verification" content="${token}" />`);
                                                            toast.success('Copied to clipboard');
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-500">
                                                <AlertCircle className="w-3 h-3" />
                                                <span>Alternative: Add a TXT record to your DNS with the token value.</span>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                onClick={handleVerifyToken}
                                                disabled={verifying || verificationSuccess === true}
                                                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${verificationSuccess === true
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                                    : 'bg-white/10 text-white hover:bg-white/15'
                                                    }`}
                                            >
                                                {verifying ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Checking...
                                                    </>
                                                ) : verificationSuccess === true ? (
                                                    <>
                                                        <ShieldCheck className="w-5 h-5" />
                                                        Verified successfully
                                                    </>
                                                ) : (
                                                    'Verify Connection'
                                                )}
                                            </button>
                                            {!verificationSuccess && verificationSuccess !== null && (
                                                <p className="text-center text-[11px] text-rose-400 mt-2">Unable to find token. Ensure it's in the &lt;head&gt; and try again.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Semantic Territory */}
                                {step === 4 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-8">
                                            <h2 className="text-2xl font-bold text-white">Semantic Territory</h2>
                                            <p className="text-slate-400 mt-2">Who are your rivals in the latent space?</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Competitors</label>
                                                <input
                                                    type="text"
                                                    placeholder="Competitor domains (comma separated)"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                                                    onBlur={(e) => updateData({ competitors: e.target.value.split(',').map(s => s.trim()) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Target Keywords</label>
                                                <input
                                                    type="text"
                                                    placeholder="Focus keywords (comma separated)"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                                                    onBlur={(e) => updateData({ keywords: e.target.value.split(',').map(s => s.trim()) })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 5: Final Goal */}
                                {step === 5 && (
                                    <div className="space-y-6">
                                        <div className="text-center mb-6">
                                            <h2 className="text-2xl font-bold text-white">Final Touches</h2>
                                            <p className="text-slate-400 mt-2">How should we prioritize your results?</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {GOALS.map(g => (
                                                <button
                                                    key={g.id}
                                                    onClick={() => updateData({ primaryGoal: g.id as any })}
                                                    className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${data.primaryGoal === g.id
                                                        ? 'border-primary bg-primary/10'
                                                        : 'border-white/5 bg-white/5 hover:border-white/10'
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${data.primaryGoal === g.id ? 'bg-primary' : 'bg-slate-800'}`}>
                                                        {data.primaryGoal === g.id ? <Check className="w-5 h-5 text-white" /> : <Rocket className="w-5 h-5 text-slate-500" />}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-sm">{g.label}</h4>
                                                        <p className="text-xs text-slate-500">{g.description}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation */}
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                            <button
                                onClick={handleBack}
                                disabled={step === 1}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${step === 1 ? 'opacity-0' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>

                            {step < totalSteps ? (
                                <button
                                    onClick={handleNext}
                                    disabled={loading || (step === 2 && !data.companyName)}
                                    className="px-8 py-3 bg-white text-slate-950 rounded-2xl font-bold hover:bg-slate-100 transition-all flex items-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleComplete}
                                    disabled={loading}
                                    className="px-8 py-3 bg-gradient-to-r from-primary to-purple-500 text-white rounded-2xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    Launch Engine
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <button
                        onClick={onComplete}
                        className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 mx-auto"
                    >
                        I'll finish this later
                        <ExternalLink className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};
