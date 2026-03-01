import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Loader2, Rocket, Search, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { bootstrapOrganization, createAudit, updateOnboardingStatus } from '../services/supabase';
import { useToast } from '../components/Toast';
import { AssetType, AnalysisStatus } from '../types';
import { normalizeUrl, validateUrl } from '../utils/validation';
import { saveAuditDraft } from '../utils/auditDraft';
import { supabase } from '../services/supabase';

function getReturnTo(search: string) {
    const params = new URLSearchParams(search);
    return params.get('returnTo') || sessionStorage.getItem('returnTo') || '';
}

const steps = [
    { id: 1, label: 'Welcome' },
    { id: 2, label: 'Tour' },
    { id: 3, label: 'First Audit' }
];

const QUICK_AUDIT_PRESETS = [
    'https://www.notion.so',
    'https://www.figma.com',
    'https://www.shopify.com',
];

export const OnboardingPage: React.FC = () => {
    const auth = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const returnTo = useMemo(() => getReturnTo(location.search), [location.search]);

    const [step, setStep] = useState(() => {
        // Eagerly restore saved step from onboarding record if already loaded
        const saved = auth.onboarding?.current_step;
        return saved && saved >= 1 && saved <= 3 ? saved : 1;
    });
    const [bootstrapping, setBootstrapping] = useState(false);
    const [bootstrapFailed, setBootstrapFailed] = useState(false);
    const [bootstrapRetries, setBootstrapRetries] = useState(0);
    const [retryCountdown, setRetryCountdown] = useState(0);
    const [saving, setSaving] = useState(false);
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [localError, setLocalError] = useState('');
    const [selectedPersona, setSelectedPersona] = useState<'agency' | 'brand' | 'developer' | null>(null);

    useEffect(() => {
        if (auth.loading) return;
        if (!auth.user) return;

        if (auth.onboarding?.is_completed) {
            navigate(returnTo || '/dashboard', { replace: true });
            return;
        }

        // Restore step from persisted onboarding state once auth loads
        const saved = auth.onboarding?.current_step;
        if (saved && saved >= 1 && saved <= 3) {
            setStep(saved);
        }
    }, [auth.loading, auth.user, auth.onboarding?.is_completed, auth.onboarding?.current_step, navigate, returnTo]);

    const attemptBootstrap = React.useCallback(async () => {
        setBootstrapping(true);
        setBootstrapFailed(false);
        try {
            const { organization } = await bootstrapOrganization();
            if (!organization) {
                setBootstrapFailed(true);
                return;
            }
            await auth.refreshOrganization();
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
        // Countdown before retry: 3s, 5s, 10s
        const delay = nextRetry === 1 ? 3 : nextRetry === 2 ? 5 : 10;
        setRetryCountdown(delay);
        const interval = setInterval(() => {
            setRetryCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    attemptBootstrap();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const persistStep = async (nextStep: number) => {
        await updateOnboardingStatus({ current_step: nextStep, ...(selectedPersona ? { persona: selectedPersona } : {}) });
    };

    const completeOnboarding = async () => {
        await updateOnboardingStatus({
            current_step: 3,
            is_completed: true,
            completed_at: new Date().toISOString(),
        });

        try {
            await supabase.auth.updateUser({ data: { onboarding_completed: true } });
        } catch {
            // Ignore
        }
    };

    const goNext = async () => {
        const next = Math.min(step + 1, 3);
        setStep(next);
        try { await persistStep(next); } catch (e) { console.error('Step persist failed', e); }
    };

    const goBack = async () => {
        const prev = Math.max(step - 1, 1);
        setStep(prev);
        try { await persistStep(prev); } catch (e) { console.error('Step persist failed', e); }
    };

    const handleSkipTour = async () => {
        setStep(3);
        try { await persistStep(3); } catch (e) { console.error('Step persist failed', e); }
    };

    // Route to the most relevant dashboard tab based on persona
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

            try {
                localStorage.setItem('cognition:first-audit-started-at', String(Date.now()));
            } catch {
                // Ignore storage errors in private mode.
            }

            saveAuditDraft(audit.id, {
                createdAt: Date.now(),
                assets: [{
                    id: `website-${audit.id}`,
                    type: AssetType.WEBSITE,
                    url: normalizedWebsite,
                    status: AnalysisStatus.IDLE
                }]
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
            <div className="min-h-screen bg-background text-text-primary flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-xs font-bold text-text-muted uppercase tracking-[0.25em]">Preparing your workspace…</p>
                </div>
            </div>
        );
    }

    if (bootstrapFailed) {
        return (
            <div className="min-h-screen bg-background text-text-primary flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <Rocket className="w-7 h-7 text-rose-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white">Account setup failed</h1>
                    <p className="text-text-secondary text-sm leading-relaxed">
                        We couldn't set up your workspace. This sometimes happens due to a slow connection.
                        {bootstrapRetries >= 3 && (
                            <span> If it keeps failing, <a href="mailto:support@cognition-ai.com" className="text-primary underline">contact support</a>.</span>
                        )}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={handleRetryBootstrap}
                            disabled={retryCountdown > 0}
                            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                        >
                            {retryCountdown > 0 ? (
                                <>Retrying in {retryCountdown}s…</>
                            ) : (
                                <>Try again {bootstrapRetries > 0 ? `(attempt ${bootstrapRetries + 1})` : ''}</>
                            )}
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary hover:text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                        >
                            Refresh page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text-primary flex items-center justify-center px-6 py-14 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-2xl">
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold uppercase tracking-wider mb-4"
                    >
                        <Sparkles className="w-3 h-3" />
                        Onboarding
                    </motion.div>
                    <h1 className="text-4xl font-display font-bold text-white tracking-tight">
                        Welcome to Cognition AI
                    </h1>
                    <p className="text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">
                        We help you understand and improve how AI search engines perceive your brand.
                    </p>
                </div>

                <Card variant="glass" className="border-white/10 shadow-2xl">
                    <div className="flex items-center justify-between gap-3 mb-8">
                        <div className="flex items-center gap-2">
                            {steps.map((s, idx) => (
                                <React.Fragment key={s.id}>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold border transition-colors ${step === s.id ? 'bg-primary/20 border-primary/30 text-primary' : step > s.id ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-text-muted'}`}>
                                        {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                                    </div>
                                    {idx < steps.length - 1 ? (
                                        <div className={`w-10 h-0.5 ${step > s.id ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
                                    ) : null}
                                </React.Fragment>
                            ))}
                        </div>
                        <button
                            onClick={handleSkipForNow}
                            disabled={saving}
                            className="text-xs text-text-muted hover:text-white transition-colors font-bold uppercase tracking-wider disabled:opacity-50"
                        >
                            Skip
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                        <Rocket className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-xl font-display font-bold text-white">Let's get you set up</h2>
                                        <p className="text-sm text-text-secondary">
                                            In under a minute, you'll be ready to run your first audit.
                                        </p>
                                    </div>
                                </div>

                                {/* Persona Selector */}
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-3">I'm a...</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'agency' as const, label: 'Agency', desc: 'Managing multiple clients', icon: '🏢' },
                                            { id: 'brand' as const, label: 'Brand', desc: 'Growing my company', icon: '🚀' },
                                            { id: 'developer' as const, label: 'Developer', desc: 'Building with AI', icon: '💻' }
                                        ].map((persona) => (
                                            <button
                                                key={persona.id}
                                                onClick={() => setSelectedPersona(persona.id)}
                                                className={`bg-white/5 border rounded-xl p-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${selectedPersona === persona.id ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/30' : 'border-white/10 hover:bg-primary/10 hover:border-primary/20'}`}
                                            >
                                                <span className="text-2xl mb-2 block">{persona.icon}</span>
                                                <p className="text-white font-bold text-sm">{persona.label}</p>
                                                <p className="text-text-muted text-xs mt-0.5">{persona.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    {[
                                        { title: 'Multi-platform scoring', desc: 'See performance across ChatGPT, Gemini, Claude, and Perplexity.' },
                                        { title: 'Actionable recommendations', desc: 'Get prioritized fixes you can ship immediately.' },
                                        { title: 'Schema & SEO checks', desc: 'Surface issues that reduce citation likelihood.' },
                                        { title: 'Historical tracking', desc: 'Track progress over time with audit history.' }
                                    ].map((item) => (
                                        <div key={item.title} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                            <p className="text-white font-bold text-sm">{item.title}</p>
                                            <p className="text-text-secondary text-sm mt-1 leading-relaxed">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                                    <Button onClick={goNext} size="lg" className="w-full sm:w-auto">
                                        Next <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-xl font-display font-bold text-white">A quick tour</h2>
                                    <p className="text-sm text-text-secondary mt-2">
                                        Here’s what you’ll see after your first audit.
                                    </p>
                                </div>

                                <div className="bg-background/60 border border-white/5 rounded-2xl p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-text-muted">Preview</p>
                                        <span className="text-xs text-text-secondary font-semibold">Dashboard</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Overall', value: '78' },
                                            { label: 'Citations', value: '64' },
                                            { label: 'Technical', value: '82' }
                                        ].map((m) => (
                                            <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{m.label}</p>
                                                <p className="text-2xl font-display font-bold text-white mt-2">{m.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                                    <Button variant="ghost" onClick={goBack} className="w-full sm:w-auto">
                                        Back
                                    </Button>
                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                        <Button variant="secondary" onClick={handleSkipTour} className="w-full sm:w-auto">
                                            Skip tour
                                        </Button>
                                        <Button onClick={goNext} className="w-full sm:w-auto">
                                            Next <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-xl font-display font-bold text-white">Run your first audit</h2>
                                    <p className="text-sm text-text-secondary mt-2">
                                        Enter the website you want to analyze.
                                    </p>
                                </div>

                                <Input
                                    label="Website URL"
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    placeholder="e.g. example.com"
                                    icon={<Search className="w-4 h-4" />}
                                    error={localError || undefined}
                                    disabled={saving}
                                />

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-2">Quick Audit Presets</p>
                                    <div className="flex flex-wrap gap-2">
                                        {QUICK_AUDIT_PRESETS.map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => {
                                                    setWebsiteUrl(preset);
                                                    setLocalError('');
                                                }}
                                                disabled={saving}
                                                className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-primary/10 hover:border-primary/30 text-text-secondary hover:text-white transition-colors disabled:opacity-50"
                                                aria-label={`Use ${preset} as quick audit URL`}
                                            >
                                                {preset.replace('https://www.', '').replace('https://', '')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                                    <Button variant="ghost" onClick={goBack} className="w-full sm:w-auto" disabled={saving}>
                                        Back
                                    </Button>
                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                        <Button
                                            variant="secondary"
                                            onClick={() => handleStartFirstAudit(QUICK_AUDIT_PRESETS[0])}
                                            className="w-full sm:w-auto"
                                            isLoading={saving}
                                        >
                                            Quick audit
                                        </Button>
                                        <Button variant="secondary" onClick={handleSkipForNow} className="w-full sm:w-auto" isLoading={saving}>
                                            Skip for now
                                        </Button>
                                        <Button onClick={() => handleStartFirstAudit()} className="w-full sm:w-auto" isLoading={saving}>
                                            Start analysis <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </div>
        </div>
    );
};
