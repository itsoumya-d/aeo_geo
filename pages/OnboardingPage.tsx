import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, CheckCircle2, Loader2, Rocket, Search,
    Sparkles, Building2, TrendingUp, Code2, BarChart2,
    Brain, Zap, Globe, ShieldCheck, Target, Plus, X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { bootstrapOrganization, createAudit, getOrganization, getOnboardingStatus, updateOnboardingStatus } from '../services/supabase';
import { useToast } from '../components/Toast';
import { AssetType, AnalysisStatus } from '../types';
import { normalizeUrl, validateUrl } from '../utils/validation';
import { saveAuditDraft } from '../utils/auditDraft';
import { supabase } from '../services/supabase';
import { BrandMark } from '../components/branding/BrandLogo';

function getReturnTo(search: string) {
    const params = new URLSearchParams(search);
    return params.get('returnTo') || sessionStorage.getItem('returnTo') || '';
}

const STEPS = [
    { id: 1, label: 'Welcome' },
    { id: 2, label: 'Tour' },
    { id: 3, label: 'Setup' },
    { id: 4, label: 'Launch' },
];

const QUICK_AUDIT_PRESETS = [
    'https://www.notion.so',
    'https://www.figma.com',
    'https://www.shopify.com',
];

const PERSONAS = [
    { id: 'agency' as const, label: 'Agency', desc: 'Managing AI audits for clients', icon: <Building2 className="w-5 h-5" />, color: 'indigo' },
    { id: 'brand' as const, label: 'Brand / SaaS', desc: 'Growing my own company', icon: <TrendingUp className="w-5 h-5" />, color: 'blue' },
    { id: 'developer' as const, label: 'Developer', desc: 'Building with AI visibility data', icon: <Code2 className="w-5 h-5" />, color: 'violet' },
    { id: 'seo' as const, label: 'SEO Pro', desc: 'Expanding into AI search', icon: <Target className="w-5 h-5" />, color: 'emerald' },
];

const FEATURE_PREVIEWS = [
    { icon: <BarChart2 className="w-5 h-5 text-blue-600" />, title: 'Multi-platform scores', desc: '8 AI platforms in one view — ChatGPT, Gemini, Claude, Perplexity, and more.' },
    { icon: <Brain className="w-5 h-5 text-violet-600" />, title: 'Semantic analysis', desc: 'Understand how LLMs categorize your brand and what they are missing.' },
    { icon: <Zap className="w-5 h-5 text-amber-500" />, title: 'Content rewriter', desc: 'AI-generated rewrites that predict score improvement before you publish.' },
    { icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />, title: 'Schema generation', desc: 'Auto-generated JSON-LD schema for every page type on your site.' },
    { icon: <Globe className="w-5 h-5 text-sky-600" />, title: 'Site crawl + discovery', desc: 'Smart discovery maps every page that shapes your AI visibility.' },
    { icon: <Target className="w-5 h-5 text-red-500" />, title: 'Competitor benchmarks', desc: 'Side-by-side citation comparison with your direct competitors.' },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <div className="flex items-center gap-1.5 justify-center">
            {STEPS.map((s, idx) => (
                <React.Fragment key={s.id}>
                    <div className="flex items-center gap-1.5">
                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border transition-all duration-300 ${
                            currentStep === s.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : currentStep > s.id
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-white text-slate-400 border-slate-200'
                        }`}>
                            {currentStep > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                        </div>
                        <span className={`hidden sm:block text-xs font-semibold transition-colors ${
                            currentStep === s.id ? 'text-blue-600' : currentStep > s.id ? 'text-emerald-600' : 'text-slate-400'
                        }`}>{s.label}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                        <div className={`w-8 h-0.5 rounded-full transition-colors ${currentStep > s.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

export const OnboardingPage: React.FC = () => {
    const auth = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const returnTo = useMemo(() => getReturnTo(location.search), [location.search]);

    const [step, setStep] = useState(() => {
        const saved = auth.onboarding?.current_step;
        return saved && saved >= 1 && saved <= 4 ? saved : 1;
    });
    const [bootstrapping, setBootstrapping] = useState(false);
    const [bootstrapFailed, setBootstrapFailed] = useState(false);
    const [bootstrapRetries, setBootstrapRetries] = useState(0);
    const [retryCountdown, setRetryCountdown] = useState(0);
    const [saving, setSaving] = useState(false);
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [competitors, setCompetitors] = useState<string[]>([]);
    const [competitorInput, setCompetitorInput] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [keywordInput, setKeywordInput] = useState('');
    const [localError, setLocalError] = useState('');
    const [selectedPersona, setSelectedPersona] = useState<'agency' | 'brand' | 'developer' | 'seo' | null>(null);

    useEffect(() => {
        if (auth.loading) return;
        if (!auth.user) return;

        if (auth.onboarding?.is_completed) {
            navigate(returnTo || '/dashboard', { replace: true });
            return;
        }

        const saved = auth.onboarding?.current_step;
        if (saved && saved >= 1 && saved <= 4) {
            setStep(saved);
        }
    }, [auth.loading, auth.user, auth.onboarding?.is_completed, auth.onboarding?.current_step, navigate, returnTo]);

    const attemptBootstrap = React.useCallback(async () => {
        setBootstrapping(true);
        setBootstrapFailed(false);
        try {
            const { organization, onboarding } = await bootstrapOrganization();
            await auth.refreshOrganization();

            const refreshedOrg = await getOrganization();
            const refreshedOnboarding = await getOnboardingStatus();

            if (refreshedOnboarding?.current_step && refreshedOnboarding.current_step >= 1 && refreshedOnboarding.current_step <= 4) {
                setStep(refreshedOnboarding.current_step);
            } else if (onboarding?.current_step && onboarding.current_step >= 1 && onboarding.current_step <= 4) {
                setStep(onboarding.current_step);
            }

            if (!organization && !refreshedOrg) {
                setBootstrapFailed(true);
            }
        } catch {
            setBootstrapFailed(true);
        } finally {
            setBootstrapping(false);
        }
    }, [auth]);

    useEffect(() => {
        if (auth.loading) return;
        if (!auth.user) return;
        if (auth.organization) return;
        attemptBootstrap();
    }, [auth.loading, auth.user, auth.organization, attemptBootstrap]);

    const handleRetryBootstrap = () => {
        const nextRetry = bootstrapRetries + 1;
        setBootstrapRetries(nextRetry);
        const delay = nextRetry === 1 ? 3 : nextRetry === 2 ? 5 : 10;
        setRetryCountdown(delay);
        const interval = setInterval(() => {
            setRetryCountdown(prev => {
                if (prev <= 1) { clearInterval(interval); attemptBootstrap(); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const persistStep = async (nextStep: number) => {
        await updateOnboardingStatus({ current_step: nextStep, ...(selectedPersona ? { persona: selectedPersona } : {}) });
    };

    const completeOnboarding = async () => {
        await updateOnboardingStatus({ current_step: 4, is_completed: true, completed_at: new Date().toISOString() });
        try { await supabase.auth.updateUser({ data: { onboarding_completed: true } }); } catch { }
    };

    const goNext = async () => {
        const next = Math.min(step + 1, 4);
        setStep(next);
        try { await persistStep(next); } catch (e) { console.error('Step persist failed', e); }
    };

    const goBack = async () => {
        const prev = Math.max(step - 1, 1);
        setStep(prev);
        try { await persistStep(prev); } catch (e) { console.error('Step persist failed', e); }
    };

    const getPersonaDestination = () => {
        if (returnTo) return returnTo;
        if (selectedPersona === 'agency') return '/dashboard?tab=benchmark';
        if (selectedPersona === 'developer') return '/settings?tab=api';
        return '/dashboard';
    };

    const handleSkipForNow = async () => {
        setSaving(true);
        try {
            await completeOnboarding();
            sessionStorage.removeItem('returnTo');
            navigate(getPersonaDestination(), { replace: true });
        } finally {
            setSaving(false);
        }
    };

    const handleAddCompetitor = () => {
        const val = competitorInput.trim();
        if (val && !competitors.includes(val) && competitors.length < 5) {
            setCompetitors([...competitors, val]);
            setCompetitorInput('');
        }
    };

    const handleAddKeyword = () => {
        const val = keywordInput.trim();
        if (val && !keywords.includes(val) && keywords.length < 8) {
            setKeywords([...keywords, val]);
            setKeywordInput('');
        }
    };

    const handleStartFirstAudit = async (quickUrl?: string) => {
        setLocalError('');
        const candidateUrl = quickUrl || websiteUrl;
        const urlCheck = validateUrl(candidateUrl);
        if (!urlCheck.isValid) {
            setLocalError(urlCheck.error || 'Enter a valid website URL.');
            return;
        }

        const normalizedWebsite = normalizeUrl(candidateUrl);
        setSaving(true);
        try {
            await completeOnboarding();
            await auth.refreshOrganization();

            const audit = await createAudit(normalizedWebsite, auth.currentWorkspace?.id);
            if (!audit) {
                toast.error("Couldn't start audit", 'Please try again.');
                return;
            }

            try { localStorage.setItem('cognition:first-audit-started-at', String(Date.now())); } catch { }

            saveAuditDraft(audit.id, {
                createdAt: Date.now(),
                assets: [{ id: `website-${audit.id}`, type: AssetType.WEBSITE, url: normalizedWebsite, status: AnalysisStatus.IDLE }]
            });

            sessionStorage.removeItem('returnTo');
            navigate(`/analysis/${audit.id}`, { replace: true });
        } catch (err) {
            console.error(err);
            toast.error('Setup failed', 'Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (auth.loading || bootstrapping) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.25em]">Preparing your workspace…</p>
                </div>
            </div>
        );
    }

    if (bootstrapFailed) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                        <Rocket className="w-7 h-7 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">Account setup failed</h1>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        We couldn't set up your workspace. This sometimes happens due to a slow connection.
                        {bootstrapRetries >= 3 && (
                            <span> If it keeps failing, <a href="mailto:support@cognition-ai.com" className="text-blue-600 underline">contact support</a>.</span>
                        )}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={handleRetryBootstrap}
                            disabled={retryCountdown > 0}
                            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                        >
                            {retryCountdown > 0 ? `Retrying in ${retryCountdown}s…` : `Try again ${bootstrapRetries > 0 ? `(attempt ${bootstrapRetries + 1})` : ''}`}
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                        >
                            Refresh page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Subtle bg decoration */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200/20 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10 w-full max-w-2xl">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-5">
                        <BrandMark className="h-10 w-10" />
                        <span className="text-xl font-bold text-slate-800">GOATAEO</span>
                    </div>
                    <StepIndicator currentStep={step} />
                </div>

                {/* Card */}
                <div className="bg-white border border-blue-100 rounded-2xl shadow-[0_8px_40px_rgba(37,99,235,0.10)] overflow-hidden">
                    <div className="p-6 sm:p-8">
                        {/* Skip button */}
                        <div className="flex justify-end mb-6">
                            <button
                                onClick={handleSkipForNow}
                                disabled={saving}
                                className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-semibold disabled:opacity-50"
                            >
                                Skip setup →
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {/* ── Step 1: Welcome + Persona ── */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                                            <Sparkles className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800">Welcome to GOATAEO</h2>
                                            <p className="text-sm text-slate-500">Tell us a bit about how you'll use it.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">I'm a…</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {PERSONAS.map(persona => (
                                                <button
                                                    key={persona.id}
                                                    onClick={() => setSelectedPersona(persona.id)}
                                                    className={`flex items-start gap-3 rounded-xl p-4 text-left transition-all border ${selectedPersona === persona.id
                                                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                        : 'border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50'
                                                    }`}
                                                >
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedPersona === persona.id ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                        {persona.icon}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-800 text-sm">{persona.label}</p>
                                                        <p className="text-slate-500 text-xs mt-0.5">{persona.desc}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button onClick={goNext} size="lg">
                                            Continue <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Step 2: Feature Tour ── */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">What you'll get</h2>
                                        <p className="text-sm text-slate-500 mt-1">GOATAEO gives your team a single view across all major AI platforms.</p>
                                    </div>

                                    {/* Mini dashboard preview */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Dashboard preview</p>
                                            <span className="text-[10px] text-slate-400 font-semibold">example.com</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { label: 'AI Visibility', value: '78', color: 'text-emerald-600' },
                                                { label: 'Citations', value: '64', color: 'text-amber-600' },
                                                { label: 'Technical', value: '82', color: 'text-blue-600' },
                                            ].map(m => (
                                                <div key={m.label} className="bg-white border border-blue-100 rounded-lg p-3 text-center">
                                                    <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{m.label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {FEATURE_PREVIEWS.map(f => (
                                            <div key={f.title} className="flex items-start gap-2.5 p-3 bg-white border border-blue-50 rounded-xl">
                                                <div className="flex-shrink-0 mt-0.5">{f.icon}</div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">{f.title}</p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between">
                                        <Button variant="ghost" onClick={goBack} className="text-slate-500">← Back</Button>
                                        <Button onClick={goNext} size="lg">
                                            Set up my workspace <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Step 3: Setup (Competitors + Keywords) ── */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">Set up your workspace</h2>
                                        <p className="text-sm text-slate-500 mt-1">Optional: add competitors and target keywords to track from day one.</p>
                                    </div>

                                    {/* Competitors */}
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Competitors to track <span className="text-slate-300 normal-case">(up to 5)</span></p>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={competitorInput}
                                                onChange={e => setCompetitorInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddCompetitor()}
                                                placeholder="competitor.com"
                                                className="flex-1 bg-white border border-blue-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none placeholder:text-slate-400"
                                            />
                                            <button
                                                onClick={handleAddCompetitor}
                                                disabled={!competitorInput.trim() || competitors.length >= 5}
                                                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {competitors.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {competitors.map(c => (
                                                    <span key={c} className="flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-700 font-semibold px-2.5 py-1 rounded-full">
                                                        {c}
                                                        <button onClick={() => setCompetitors(competitors.filter(x => x !== c))}>
                                                            <X className="w-3 h-3 text-blue-400 hover:text-red-500" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Keywords */}
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Target keywords <span className="text-slate-300 normal-case">(up to 8)</span></p>
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={keywordInput}
                                                onChange={e => setKeywordInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleAddKeyword()}
                                                placeholder="e.g. AI project management tool"
                                                className="flex-1 bg-white border border-blue-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none placeholder:text-slate-400"
                                            />
                                            <button
                                                onClick={handleAddKeyword}
                                                disabled={!keywordInput.trim() || keywords.length >= 8}
                                                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {keywords.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {keywords.map(k => (
                                                    <span key={k} className="flex items-center gap-1 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">
                                                        {k}
                                                        <button onClick={() => setKeywords(keywords.filter(x => x !== k))}>
                                                            <X className="w-3 h-3 text-emerald-400 hover:text-red-500" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between">
                                        <Button variant="ghost" onClick={goBack} className="text-slate-500">← Back</Button>
                                        <Button onClick={goNext} size="lg">
                                            Launch audit <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Step 4: First Audit ── */}
                            {step === 4 && (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                                            <Rocket className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800">Run your first audit</h2>
                                            <p className="text-sm text-slate-500">Enter the website you want to analyze. Results in minutes.</p>
                                        </div>
                                    </div>

                                    <Input
                                        label="Website URL"
                                        value={websiteUrl}
                                        onChange={e => { setWebsiteUrl(e.target.value); setLocalError(''); }}
                                        placeholder="e.g. example.com"
                                        icon={<Search className="w-4 h-4" />}
                                        error={localError || undefined}
                                        disabled={saving}
                                    />

                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Quick presets</p>
                                        <div className="flex flex-wrap gap-2">
                                            {QUICK_AUDIT_PRESETS.map(preset => (
                                                <button
                                                    key={preset}
                                                    onClick={() => { setWebsiteUrl(preset); setLocalError(''); }}
                                                    disabled={saving}
                                                    className="text-xs px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors disabled:opacity-50"
                                                >
                                                    {preset.replace('https://www.', '')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* What happens next */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-3">What happens next</p>
                                        <div className="space-y-2">
                                            {[
                                                'We discover and crawl your key pages (homepage, pricing, docs)',
                                                'Gemini AI analyzes each page for citation signals',
                                                'You get a scored report with specific improvements to ship',
                                            ].map((step, i) => (
                                                <div key={i} className="flex items-start gap-2.5">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                                                    <p className="text-xs text-slate-600 leading-relaxed">{step}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 justify-between">
                                        <Button variant="ghost" onClick={goBack} className="text-slate-500" disabled={saving}>← Back</Button>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <Button
                                                variant="secondary"
                                                onClick={handleSkipForNow}
                                                className="border-slate-200 text-slate-600"
                                                isLoading={saving}
                                            >
                                                Skip for now
                                            </Button>
                                            <Button
                                                onClick={() => handleStartFirstAudit()}
                                                isLoading={saving}
                                                size="lg"
                                            >
                                                Start analysis <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-blue-50 px-6 py-3 bg-blue-50/50 flex items-center justify-between">
                        <p className="text-xs text-slate-400">Step {step} of {STEPS.length}</p>
                        <div className="flex gap-1.5">
                            {STEPS.map(s => (
                                <div key={s.id} className={`w-6 h-1 rounded-full transition-colors ${step >= s.id ? 'bg-blue-500' : 'bg-slate-200'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400 mt-5">
                    3 free audits included · No credit card required
                </p>
            </div>
        </div>
    );
};
