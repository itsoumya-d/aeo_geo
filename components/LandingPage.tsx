import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    ArrowRight, Check, Globe, LayoutDashboard, ShieldCheck, Menu, X,
    ChevronDown, ChevronUp, Play, BarChart2, Brain, Zap, Users,
    Building2, Code2, TrendingUp, Target, Minus
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { FadeIn, SlideUp, StaggerContainer } from './ui/Motion';
import { HeroGlobeBackground } from './hero/HeroGlobeBackground';
import { BrandLockup, BrandMark } from './branding/BrandLogo';
import { VideoModal } from './VideoModal';
import { insertFreeAuditLead } from '../services/supabase';
import { normalizeUrl, validateUrl } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';

/* ─────────────────────────────────────────────────────── */
/*  Reusable sub-components                                 */
/* ─────────────────────────────────────────────────────── */

const StaticStat: React.FC<{ value: string; className?: string }> = ({ value, className = '' }) => (
    <span className={className}>{value}</span>
);

const FeatureCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    desc: string;
}> = ({ icon, title, desc }) => (
    <Card variant="glass" className="group h-full p-6 border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.28)] bg-surface/45">
        <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary flex-shrink-0 transition-all duration-300 group-hover:scale-105">
                {icon}
            </div>
            <div className="min-w-0">
                <h3 className="text-text-primary font-display font-bold text-lg leading-tight">{title}</h3>
                <p className="text-text-secondary mt-2 leading-relaxed text-sm">{desc}</p>
            </div>
        </div>
    </Card>
);

const PricingCard: React.FC<{
    name: string;
    price: string;
    annualTotal?: string;
    description: string;
    features: string[];
    cta: { label: string; to: string };
    featured?: boolean;
    annualBilling?: boolean;
}> = ({ name, price, annualTotal, description, features, cta, featured, annualBilling }) => (
    <Card
        variant="glass"
        className={`h-full p-7 border-white/10 flex flex-col transition-all duration-300 hover:border-white/20 hover:shadow-[0_28px_72px_rgba(15,23,42,0.3)] ${featured ? 'ring-1 ring-primary/40 shadow-glow bg-white/[0.04]' : 'bg-surface/45'}`}
    >
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
                <h3 className="text-text-primary font-display font-bold text-xl">{name}</h3>
                <p className="text-text-secondary text-sm mt-1">{description}</p>
            </div>
            {featured ? (
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                    Popular
                </span>
            ) : null}
        </div>

        <div className="mt-6">
            <div className="flex items-end gap-2">
                <p className="text-4xl font-display font-bold text-text-primary">{price}</p>
                <p className="text-sm text-text-muted mb-1">/month</p>
            </div>
            {annualBilling && annualTotal && (
                <p className="text-xs text-emerald-400 font-semibold mt-1">
                    Billed annually — {annualTotal}/yr
                </p>
            )}
        </div>

        <ul className="mt-6 space-y-3 flex-1">
            {features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-text-secondary">
                    <span className="mt-0.5 text-emerald-400 flex-shrink-0">
                        <Check className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">{f}</span>
                </li>
            ))}
        </ul>

        <div className="mt-8">
            <Link to={cta.to} className="block">
                <Button variant="cta" size="lg" className="w-full">
                    {cta.label} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </Link>
        </div>
    </Card>
);

const HeroPreview: React.FC = () => {
    const platformScores = [
        { name: 'ChatGPT', score: 82, color: 'bg-emerald-400' },
        { name: 'Gemini', score: 76, color: 'bg-sky-400' },
        { name: 'Claude', score: 69, color: 'bg-violet-400' },
        { name: 'Perplexity', score: 88, color: 'bg-amber-400' },
    ];

    const pageSignals = [
        { page: '/pricing', state: 'Strong commercial clarity', tone: 'text-emerald-300', bar: 'bg-emerald-400', width: '88%' },
        { page: '/docs/get-started', state: 'Missing proof + evidence', tone: 'text-amber-300', bar: 'bg-amber-400', width: '58%' },
        { page: '/compare', state: 'Low entity confidence', tone: 'text-rose-300', bar: 'bg-rose-400', width: '42%' },
    ];

    const nextMoves = [
        'Add first-party proof and statistics to high-intent pages.',
        'Tighten brand language so product positioning stays consistent.',
        'Expand docs and help pages that AI tools use for factual grounding.',
    ];

    return (
        <motion.div
            className="relative z-10 w-full lg:w-[calc(100%+3rem)] xl:w-[calc(100%+7rem)] lg:-mr-12 xl:-mr-28 max-w-none origin-left"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            viewport={{ once: true, amount: 0.35 }}
        >
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.08),transparent_32%)]" aria-hidden="true" />
            <Card variant="glass" className="relative overflow-hidden border-white/70 bg-white/90 shadow-2xl shadow-black/25">
                <div className="border-b border-slate-200/80 px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <LayoutDashboard className="w-5 h-5 text-sky-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-slate-700 font-display font-bold text-base truncate">Visibility command center</p>
                            <p className="text-xs text-text-muted font-bold uppercase tracking-[0.22em] truncate">example.com · weekly snapshot</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-500 bg-sky-100 border border-sky-200 px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                        Operator view
                    </span>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-[1.08fr_0.92fr]">
                    <div className="space-y-4">
                        <div className="rounded-[1.5rem] border border-white/10 bg-[#08111f] p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted">Current posture</p>
                                    <div className="mt-3 flex items-end gap-3">
                                        <p className="text-5xl font-display font-bold text-white leading-none">74</p>
                                        <p className="text-sm font-semibold text-emerald-300 pb-1">+6 this week</p>
                                    </div>
                                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
                                        Strong commercial pages. Weak supporting evidence on docs and help content.
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 sm:max-w-[180px]">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">Movement</p>
                                    <p className="mt-2 text-sm font-semibold text-white">Citation readiness is climbing</p>
                                    <p className="mt-1 text-xs leading-relaxed text-emerald-200/80">Pricing copy and FAQ clarity improved recall signals.</p>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Citations', value: '64', note: 'Needs more proof' },
                                    { label: 'Entity Trust', value: '71', note: 'Mostly consistent' },
                                    { label: 'Technical', value: '83', note: 'Healthy baseline' },
                                ].map((metric) => (
                                    <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{metric.label}</p>
                                        <p className="mt-2 text-2xl font-display font-bold text-white">{metric.value}</p>
                                        <p className="mt-1 text-xs text-text-muted">{metric.note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/10 bg-background/50 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted">Pages shaping brand recall</p>
                                    <p className="mt-1 text-sm text-text-secondary">The pages most likely to influence how AI describes you.</p>
                                </div>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">
                                    page level
                                </span>
                            </div>

                            <div className="mt-4 space-y-3">
                                {pageSignals.map((item) => (
                                    <div key={item.page} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-text-primary">{item.page}</p>
                                            <p className={`text-xs font-semibold ${item.tone}`}>{item.state}</p>
                                        </div>
                                        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                            <motion.div
                                                className={`h-full ${item.bar}`}
                                                initial={{ width: 0 }}
                                                whileInView={{ width: item.width }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-[1.5rem] border border-white/10 bg-background/50 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted">Answer-engine spread</p>
                            <p className="mt-1 text-sm text-text-secondary">Compare how each platform currently interprets the same brand.</p>
                            <div className="mt-4 space-y-3">
                                {platformScores.map((platform) => (
                                    <div key={platform.name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-text-primary">{platform.name}</p>
                                            <p className="text-xs font-bold text-text-muted">{platform.score}/100</p>
                                        </div>
                                        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                            <motion.div
                                                className={`h-full ${platform.color}`}
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${platform.score}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 0.85, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-white/10 bg-background/50 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted">Next moves</p>
                            <p className="mt-1 text-sm text-text-secondary">A focused list your content, SEO, and growth teams can ship this week.</p>
                            <div className="mt-4 space-y-3">
                                {nextMoves.map((item, index) => (
                                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] font-bold text-text-muted">
                                            0{index + 1}
                                        </span>
                                        <p className="text-sm leading-relaxed text-text-secondary">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [open, setOpen] = React.useState(false);
    const shouldReduceMotion = useReducedMotion();
    return (
        <div className="border border-white/10 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-5 text-left bg-white/5 hover:bg-white/10 transition-colors min-h-[60px] touch-manipulation"
                aria-expanded={open}
            >
                <span className="text-text-primary font-semibold text-sm pr-4">{question}</span>
                {open
                    ? <ChevronUp className="w-4 h-4 text-primary flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />}
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={shouldReduceMotion ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <p className="px-5 py-4 text-sm text-text-secondary leading-relaxed border-t border-white/5">
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─────────────────────────────────────────────────────── */
/*  Static data                                            */
/* ─────────────────────────────────────────────────────── */

const FAQ_ITEMS = [
    {
        question: 'What is Answer Engine Optimization (AEO)?',
        answer: 'AEO is the practice of optimizing your content to be cited and recommended by AI assistants like ChatGPT, Gemini, Claude, and Perplexity. Unlike traditional SEO which focuses on Google rankings, AEO focuses on how LLMs perceive and reference your brand when users ask questions.'
    },
    {
        question: 'How is GOATAEO different from traditional SEO tools?',
        answer: 'Traditional SEO tools measure Google rankings. GOATAEO measures AI visibility — how likely your brand is to be cited, quoted, or recommended by AI search engines. We analyze your semantic positioning, entity linking, quotability, and cross-platform consistency.'
    },
    {
        question: 'Which AI platforms do you track?',
        answer: 'We track 8 major AI platforms: ChatGPT, Gemini, Claude, Perplexity, Google AI Overviews, Microsoft Copilot, Meta AI, and Grok — giving you the most comprehensive coverage in the market.'
    },
    {
        question: 'How does the credit system work?',
        answer: 'Each plan includes monthly audit credits. One credit = one full website audit (discovery + crawl + AI analysis). You can top up credits at any time or upgrade your plan for more. Credits reset monthly on your billing date.'
    },
    {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit and debit cards (Visa, Mastercard, Amex) globally via Paddle, our payments partner. Paddle handles all tax compliance, so you pay a simple monthly or annual price regardless of where you are in the world. UPI and other local payment methods are supported where available.'
    },
    {
        question: 'Is there an API for agencies?',
        answer: 'Yes! Pro and Agency plans include full API access with SHA-256 authenticated API keys. You can run audits, fetch reports, and integrate GOATAEO data into your own dashboards and client workflows.'
    },
    {
        question: 'Do you offer white-label reports for agencies?',
        answer: 'Yes. Agency plan includes white-label branding — add your logo, custom colors, and hide Cognition branding in PDF reports. Perfect for agencies delivering AI visibility audits to their clients.'
    },
];

const HERO_SIGNAL_CHIPS = [
    'B2B SaaS',
    'Agencies',
    'Growth teams',
    'Private dashboard',
];

const FIRST_AUDIT_CARDS = [
    {
        value: '8',
        title: 'platforms in one baseline',
        detail: 'See how ChatGPT, Gemini, Claude, Perplexity, and others interpret the same brand at the same time.',
        icon: <Globe className="w-5 h-5 text-sky-300" />,
    },
    {
        value: '3',
        title: 'priority lanes to improve',
        detail: 'Separate visibility, authority, and technical trust so the team knows what to ship first.',
        icon: <Target className="w-5 h-5 text-amber-300" />,
    },
    {
        value: '1',
        title: 'shared view for the team',
        detail: 'Give content, SEO, growth, and founder-led teams one dashboard instead of scattered screenshots.',
        icon: <Users className="w-5 h-5 text-emerald-300" />,
    },
];

const SHIFT_FRAMES = [
    {
        kicker: 'SEO-only view',
        title: 'What the old stack tells you',
        signal: 'Rankings, impressions, crawl errors, backlinks.',
        detail: 'Helpful context, but not enough to predict whether an answer engine will confidently cite you.',
    },
    {
        kicker: 'Model behavior',
        title: 'What AI systems actually use',
        signal: 'Entity clarity, quotability, evidence density, and message consistency.',
        detail: 'These are the signals that shape recommendation confidence when a user asks for the best option.',
    },
    {
        kicker: 'Operator workflow',
        title: 'What the product should give you',
        signal: 'A page-level brief of what is strong, weak, missing, and commercially important.',
        detail: 'Not more abstract scoring. A sharper weekly operating view your team can act on.',
    },
];

const WORKFLOW_STEPS = [
    {
        step: '01',
        title: 'Start with the pages that define your brand',
        description: 'Enter the domain. The audit maps the pages most likely to shape how AI explains you to buyers.',
        outcome: 'Homepage, docs, pricing, help, and about pages come into focus first.',
        icon: <Globe className="w-5 h-5 text-sky-300" />,
    },
    {
        step: '02',
        title: 'See where the narrative breaks',
        description: 'The report surfaces weak citations, missing proof, thin entity detail, and inconsistent positioning.',
        outcome: 'You get a ranked list of issues instead of a noisy wall of metrics.',
        icon: <Brain className="w-5 h-5 text-violet-300" />,
    },
    {
        step: '03',
        title: 'Ship the next fix with confidence',
        description: 'Turn the findings into clearer copy, stronger evidence, and more useful support pages.',
        outcome: 'The goal is cleaner brand recall and better citation odds, not vanity movement.',
        icon: <Zap className="w-5 h-5 text-emerald-300" />,
    },
];

const FREE_AUDIT_URL_STORAGE_KEY = 'cognition:pendingFreeAuditUrl';

/* Mobile sticky CTA — only rendered on small screens */
const FreeAuditCaptureForm: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const auth = useAuth();
    const navigate = useNavigate();
    const [websiteUrl, setWebsiteUrl] = React.useState('');
    const [error, setError] = React.useState('');
    const [successMessage, setSuccessMessage] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        try {
            const pendingUrl = sessionStorage.getItem(FREE_AUDIT_URL_STORAGE_KEY);
            if (pendingUrl) {
                setWebsiteUrl(pendingUrl);
            }
        } catch {
            // Ignore storage access errors.
        }
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');

        const validation = validateUrl(websiteUrl);
        if (!validation.isValid) {
            const message = validation.error || 'Enter a valid website URL.';
            setError(message);
            console.error('Free audit insert failed:', message);
            return;
        }

        if (!auth.user) {
            try {
                sessionStorage.setItem(FREE_AUDIT_URL_STORAGE_KEY, websiteUrl);
            } catch {
                // Ignore storage access errors.
            }

            navigate('/signup?returnTo=%2F');
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await insertFreeAuditLead(websiteUrl);
            if (success) {
                setWebsiteUrl('');
                setSuccessMessage('Audit request saved successfully.');
                try {
                    sessionStorage.removeItem(FREE_AUDIT_URL_STORAGE_KEY);
                } catch {
                    // Ignore storage access errors.
                }
            } else {
                setError('Could not save your audit request.');
            }
        } catch (submitError) {
            console.error('Free audit insert failed:', submitError);
            setError('Could not save your audit request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`w-full ${compact ? '' : 'max-w-2xl'}`}>
            <div className={`flex items-stretch ${compact ? 'flex-col gap-2' : 'flex-col sm:flex-row gap-3'}`}>
                <Input
                    type="text"
                    value={websiteUrl}
                    onChange={(event) => {
                        setWebsiteUrl(event.target.value);
                        if (error) setError('');
                        if (successMessage) setSuccessMessage('');
                    }}
                    placeholder="Enter your website URL (e.g. https://example.com)"
                    error={error}
                    disabled={isSubmitting}
                    className={compact ? 'h-11' : 'h-12 text-base'}
                />
                <Button
                    type="submit"
                    variant="cta"
                    size="lg"
                    className={`${compact ? 'w-full' : 'w-full sm:w-auto'} whitespace-nowrap`}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Get your free AI audit'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
            {successMessage ? (
                <p className="mt-2 text-sm text-emerald-400">{successMessage}</p>
            ) : null}
        </form>
    );
};

const MobileStickyCTA: React.FC = () => (
    <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.4, ease: 'easeOut' }}
        className="md:hidden fixed bottom-0 inset-x-0 z-40 p-4 bg-background/90 backdrop-blur-xl border-t border-white/10 safe-area-inset-bottom"
    >
        <FreeAuditCaptureForm compact />
        <p className="text-center text-[11px] text-text-muted mt-1.5">No credit card · 3 free audits</p>
    </motion.div>
);

/* ─────────────────────────────────────────────────────── */
/*  Main Component                                          */
/* ─────────────────────────────────────────────────────── */

export const LandingPage: React.FC = () => {
    const [showVideo, setShowVideo] = React.useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [annualBilling, setAnnualBilling] = React.useState(false);
    const [scrolled, setScrolled] = React.useState(false);
    const shouldReduceMotion = useReducedMotion();

    React.useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="w-full">
            <VideoModal isOpen={showVideo} onClose={() => setShowVideo(false)} />

            {/* ── Navigation ─────────────────────────────── */}
            <nav className={`sticky top-0 z-30 w-full backdrop-blur-xl border-b transition-all duration-300 ${scrolled ? 'bg-background/95 border-white/10 shadow-lg shadow-black/30' : 'bg-background/80 border-white/5'}`}>
                <div className="w-full px-4 sm:px-6 h-16 sm:h-20 flex items-center">
                    <Link to="/" className="group cursor-pointer flex-shrink-0 transition-transform duration-300 hover:-translate-y-0.5">
                        <BrandLockup showTagline={false} />
                    </Link>

                    <div className="hidden md:flex flex-1 items-center justify-center gap-6 lg:gap-8 px-8 text-sm font-semibold text-text-secondary">
                        <a href="#how-it-works" className="hover:text-white transition-colors duration-300">How it works</a>
                        <a href="#features" className="hover:text-white transition-colors duration-300">Features</a>
                        <a href="#pricing" className="hover:text-white transition-colors duration-300">Pricing</a>
                        <a href="#faq" className="hover:text-white transition-colors duration-300">FAQ</a>
                        <Link to="/help" className="hover:text-white transition-colors duration-300">Help</Link>
                    </div>

                    <div className="hidden md:flex items-center gap-3 ml-auto">
                        <Link to="/login">
                            <Button variant="ghost" className="px-4">Sign in</Button>
                        </Link>
                        <Link to="/signup">
                            <Button variant="cta">
                                {scrolled ? 'Start free' : 'Get started free'} <ArrowRight className="w-4 h-4 ml-1.5" />
                            </Button>
                        </Link>
                    </div>

                    <button
                        className="ml-auto md:hidden p-2.5 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="relative z-20 md:hidden bg-surface/95 backdrop-blur-xl border-b border-white/10 px-5 py-5 space-y-1"
                    >
                        {[
                            { href: '#how-it-works', label: 'How it works' },
                            { href: '#features', label: 'Features' },
                            { href: '#pricing', label: 'Pricing' },
                            { href: '#faq', label: 'FAQ' },
                        ].map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-2 py-3 text-base font-semibold text-text-secondary hover:text-white transition-colors touch-manipulation"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <ChevronDown className="w-4 h-4 -rotate-90" />
                                {item.label}
                            </a>
                        ))}
                        <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
                            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                                <Button variant="secondary" className="w-full" size="lg">Sign in</Button>
                            </Link>
                            <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                                <Button variant="cta" className="w-full" size="lg">
                                    Get started free <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Hero ───────────────────────────────────── */}
            <header className="relative z-10 overflow-hidden border-b border-white/5">
                <HeroGlobeBackground />
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_26%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-18 sm:pb-24 relative">
                    <div className="relative z-10 grid gap-12 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:gap-14 xl:gap-16 items-center">
                        <div className="min-w-0">
                            <SlideUp>
                                <motion.div
                                    initial={{ scale: 0.985, opacity: 0, y: 10 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-sky-200"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                                    AI visibility for operator teams
                                </motion.div>

                                <h1 className="mt-6 max-w-[12.5ch] sm:max-w-4xl text-[3.15rem] sm:text-5xl lg:text-[3.65rem] xl:text-[4.2rem] font-display font-bold leading-[0.96] sm:leading-[1.02] tracking-[-0.05em] sm:tracking-[-0.04em] text-white drop-shadow-[0_12px_36px_rgba(8,18,33,0.26)]">
                                    Know what AI says about your brand
                                    <span className="block text-white/80">before your market does.</span>
                                </h1>

                                <p className="mt-5 max-w-xl text-[1.02rem] sm:text-lg leading-7 sm:leading-relaxed text-white/80 sm:text-text-secondary">
                                    Audit the pages, citations, and brand signals shaping how ChatGPT, Gemini, Claude, and Perplexity describe you. Then fix the specific gaps that actually matter.
                                </p>
                            </SlideUp>

                            <FadeIn delay={0.12} className="mt-6 flex flex-wrap gap-2">
                                {HERO_SIGNAL_CHIPS.map((chip) => (
                                    <motion.span
                                        key={chip}
                                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-text-secondary"
                                        whileHover={shouldReduceMotion ? undefined : { y: -2, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {chip}
                                    </motion.span>
                                ))}
                            </FadeIn>

                            <FadeIn delay={0.18} className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5 backdrop-blur-[10px]">
                                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70 sm:text-text-muted">
                                    Start with one URL. Create an account before the audit runs.
                                </p>
                                <div className="mt-4">
                                    <FreeAuditCaptureForm />
                                </div>
                                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                    <Link to="/signup" className="w-full sm:w-auto">
                                        <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                                            Start free — no card needed <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="lg"
                                        className="w-full sm:w-auto group border border-white/10 hover:bg-white/5"
                                        onClick={() => setShowVideo(true)}
                                    >
                                        <Play className="w-4 h-4 mr-2 fill-current group-hover:text-primary transition-colors" />
                                        Watch 2-min walkthrough
                                    </Button>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                                    {[
                                        '3 free audits included',
                                        'Private dashboard',
                                        'Results in minutes',
                                    ].map((label) => (
                                        <div key={label} className="flex items-center gap-1.5 text-sm text-text-secondary">
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </FadeIn>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            className="min-w-0 w-full justify-self-end"
                        >
                            <HeroPreview />
                        </motion.div>
                    </div>
                </div>
            </header>

            {/* ── Stats Bar ──────────────────────────────── */}
            <section className="relative z-10 border-b border-white/5 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
                    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                        <FadeIn>
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary">What The First Audit Gives You</p>
                            <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-text-primary">
                                A tighter view of what AI trusts, ignores, and repeats.
                            </h2>
                            <p className="mt-4 max-w-xl text-text-secondary leading-relaxed">
                                The point is not another vanity dashboard. It is one practical read on brand visibility that your team can use to make sharper content and product marketing decisions.
                            </p>
                        </FadeIn>

                        <StaggerContainer staggerDelay={0.08} className="grid gap-4 sm:grid-cols-3">
                            {FIRST_AUDIT_CARDS.map((card, index) => (
                                <motion.div
                                    key={card.title}
                                    variants={{ hidden: { opacity: 0, y: 24, scale: 0.985 }, show: { opacity: 1, y: 0, scale: 1 } }}
                                    transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <Card variant="glass" className="h-full border-white/10 p-5 bg-surface/50 transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_22px_50px_rgba(15,23,42,0.24)]">
                                        <div className="flex items-center justify-between gap-3">
                                            {card.icon}
                                            <p className="text-3xl font-display font-bold text-text-primary">
                                                <StaticStat value={card.value} />
                                            </p>
                                        </div>
                                        <p className="mt-4 text-sm font-semibold text-text-primary">{card.title}</p>
                                        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{card.detail}</p>
                                    </Card>
                                </motion.div>
                            ))}
                        </StaggerContainer>
                    </div>
                </div>
            </section>

            {/* ── Problem Section ────────────────────────── */}
            <section className="relative z-10 py-20 sm:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
                        <FadeIn>
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary">Why Teams Switch</p>
                            <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-text-primary">
                                Google rankings do not tell you if AI will cite you.
                            </h2>
                            <p className="mt-4 max-w-xl text-text-secondary leading-relaxed">
                                Buyers are increasingly getting their first recommendation from an answer engine, not a search results page. That changes what your team needs to measure.
                            </p>
                            <div className="mt-6 space-y-3">
                                {[
                                    'See where your commercial pages are strong but your support content is weak.',
                                    'Find missing proof, claims, and entity detail that reduce citation confidence.',
                                    'Turn abstract model behavior into page-level work your team can actually ship.',
                                ].map((point) => (
                                    <div key={point} className="flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm leading-relaxed text-text-secondary">{point}</p>
                                    </div>
                                ))}
                            </div>
                        </FadeIn>

                        <StaggerContainer staggerDelay={0.08} className="space-y-4">
                            {SHIFT_FRAMES.map((item, index) => (
                                <motion.div
                                    key={item.title}
                                    variants={{ hidden: { opacity: 0, y: 22, scale: 0.99 }, show: { opacity: 1, y: 0, scale: 1 } }}
                                    transition={{ duration: 0.42, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <Card variant="glass" className="border-white/10 bg-surface/45 p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_24px_58px_rgba(15,23,42,0.26)]">
                                        <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-start">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-text-muted">{item.kicker}</p>
                                                <h3 className="mt-2 text-lg font-display font-bold text-text-primary">{item.title}</h3>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Signals</p>
                                                    <p className="mt-2 text-sm leading-relaxed text-text-primary">{item.signal}</p>
                                                </div>
                                                <div className="rounded-2xl border border-white/10 bg-background/50 p-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Why it matters</p>
                                                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.detail}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </StaggerContainer>
                    </div>
                </div>
            </section>

            {/* ── How It Works ───────────────────────────── */}
            <section id="how-it-works" className="relative z-10 py-20 sm:py-24 border-t border-white/5 bg-surface/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:items-start">
                        <FadeIn>
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary">Workflow</p>
                            <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-text-primary">
                                A calmer way to run your first AI visibility audit.
                            </h2>
                            <p className="mt-4 max-w-xl text-text-secondary leading-relaxed">
                                The product is designed to get you from raw website to focused next move without making you wade through a maze of charts.
                            </p>
                            <div className="mt-6">
                                <Link to="/signup">
                                    <Button variant="cta" size="lg">
                                        Try it free — no credit card <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </div>
                        </FadeIn>

                        <StaggerContainer staggerDelay={0.08} className="space-y-4">
                            {WORKFLOW_STEPS.map((item, index) => (
                                <motion.div
                                    key={item.step}
                                    variants={{ hidden: { opacity: 0, y: 24, scale: 0.99 }, show: { opacity: 1, y: 0, scale: 1 } }}
                                    transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <Card variant="glass" className="border-white/10 bg-surface/45 p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_24px_58px_rgba(15,23,42,0.26)]">
                                        <div className="grid gap-4 md:grid-cols-[82px_1fr_220px] md:items-start">
                                            <div className="flex md:flex-col items-center md:items-start gap-3">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                                                    {item.icon}
                                                </div>
                                                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-text-muted">Step {item.step}</p>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-display font-bold text-text-primary">{item.title}</h3>
                                                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.description}</p>
                                            </div>
                                            <div className="rounded-2xl border border-white/10 bg-background/55 p-4">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Outcome</p>
                                                <p className="mt-2 text-sm leading-relaxed text-text-primary">{item.outcome}</p>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </StaggerContainer>
                    </div>
                </div>
            </section>

            {/* ── Features ───────────────────────────────── */}
            <section id="features" className="relative z-10 py-20 sm:py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <FadeIn>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary text-center">Features</p>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary text-center mt-3">
                            Everything you need to win in AI search
                        </h2>
                        <p className="text-text-secondary text-center mt-4 max-w-2xl mx-auto leading-relaxed">
                            One unified report across all major AI platforms — designed to turn complex data into clear, shippable actions.
                        </p>
                    </FadeIn>

                    <StaggerContainer className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            {
                                icon: <BarChart2 className="w-6 h-6" />,
                                title: 'Multi-platform scoring',
                                desc: 'Score your brand across ChatGPT, Gemini, Claude, Perplexity, Copilot, and more — with per-platform breakdowns that show exactly where you stand.'
                            },
                            {
                                icon: <Brain className="w-6 h-6" />,
                                title: 'Semantic & entity analysis',
                                desc: 'Understand how AI models "see" your brand: what concepts it associates with you, what it misunderstands, and what content gaps are hurting your citations.'
                            },
                            {
                                icon: <Zap className="w-6 h-6" />,
                                title: 'Rewrite simulation engine',
                                desc: 'Preview the impact of content changes before you publish. Our vector-math engine predicts how rewrites will shift your AI visibility score.'
                            },
                            {
                                icon: <Globe className="w-6 h-6" />,
                                title: 'Site discovery & crawl',
                                desc: 'Automatically find and prioritize the pages that matter most — your homepage, product pages, and content that AI is most likely to reference.'
                            },
                            {
                                icon: <ShieldCheck className="w-6 h-6" />,
                                title: 'Schema & technical audit',
                                desc: 'Detect missing structured data, weak entity signals, and technical issues that reduce how confidently AI models reference your content.'
                            },
                            {
                                icon: <Target className="w-6 h-6" />,
                                title: 'Competitor benchmarking',
                                desc: 'Compare your AI visibility against competitors. See exactly which platforms they dominate and what content strategy is working for them.'
                            },
                        ].map((f) => (
                            <motion.div key={f.title} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
                                <FeatureCard icon={f.icon} title={f.title} desc={f.desc} />
                            </motion.div>
                        ))}
                    </StaggerContainer>
                </div>
            </section>

            {/* ── Comparison Table ──────────────────────── */}
            <section className="relative z-10 py-20 sm:py-24 border-t border-white/5 bg-surface/20">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <FadeIn>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary text-center">Why GOATAEO</p>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary text-center mt-3">
                            The only tool built for AI search
                        </h2>
                        <p className="text-text-secondary text-center mt-4 max-w-2xl mx-auto leading-relaxed">
                            See how GOATAEO stacks up against traditional SEO platforms and other AI visibility tools.
                        </p>
                    </FadeIn>

                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.99 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        whileHover={{ y: -4 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-12 overflow-x-auto rounded-2xl border border-white/10 bg-surface/35 shadow-[0_24px_60px_rgba(15,23,42,0.22)]"
                    >
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left p-4 pl-6 text-text-muted font-semibold w-[38%]">Feature</th>
                                    <th className="p-4 text-center">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-primary font-bold text-xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            GOATAEO
                                        </span>
                                    </th>
                                    <th className="p-4 text-center text-text-muted font-semibold text-xs">Traditional SEO</th>
                                    <th className="p-4 text-center text-text-muted font-semibold text-xs pr-6">Other AI SEO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { feature: 'AI platform tracking', cognition: '8 platforms', seo: false, other: '1–2 platforms' },
                                    { feature: 'Page-level analysis', cognition: true, seo: false, other: 'Domain only' },
                                    { feature: 'Content rewrite simulation', cognition: true, seo: false, other: false },
                                    { feature: 'Competitor AI benchmarking', cognition: true, seo: 'Google only', other: 'Basic' },
                                    { feature: 'Quote likelihood scoring', cognition: true, seo: false, other: false },
                                    { feature: 'White-label reports', cognition: 'Agency plan', seo: false, other: 'Enterprise' },
                                    { feature: 'REST API access', cognition: 'Pro+ plan', seo: false, other: 'Enterprise' },
                                    { feature: 'Free tier available', cognition: '3 audits/mo', seo: false, other: false },
                                ].map((row, i) => {
                                    const renderCell = (val: boolean | string) => {
                                        if (val === true) return <span className="inline-flex justify-center"><Check className="w-5 h-5 text-emerald-400" /></span>;
                                        if (val === false) return <span className="text-rose-400/70 font-bold text-lg leading-none">–</span>;
                                        return <span className="text-text-secondary text-xs font-medium">{val}</span>;
                                    };
                                    return (
                                        <tr key={row.feature} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                                            <td className="p-4 pl-6 text-text-secondary font-medium">{row.feature}</td>
                                            <td className="p-4 text-center">{renderCell(row.cognition)}</td>
                                            <td className="p-4 text-center">{renderCell(row.seo)}</td>
                                            <td className="p-4 pr-6 text-center">{renderCell(row.other)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </motion.div>

                    <FadeIn delay={0.2} className="mt-8 text-center">
                        <Link to="/signup">
                            <Button variant="cta" size="lg">
                                Start free — see for yourself <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </FadeIn>
                </div>
            </section>

            {/* ── Pricing ────────────────────────────────── */}
            <section id="pricing" className="relative z-10 py-20 sm:py-24 border-t border-white/5 bg-surface/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <FadeIn>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary text-center">Pricing</p>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary text-center mt-3">
                            Start free, scale as you grow
                        </h2>
                        <p className="text-text-secondary text-center mt-4 max-w-2xl mx-auto leading-relaxed">
                            No hidden fees. Transparent pricing. Upgrade or cancel anytime.
                        </p>
                    </FadeIn>

                    {/* Annual/Monthly Toggle */}
                    <FadeIn delay={0.1} className="mt-8 flex items-center justify-center gap-3 sm:gap-4">
                        <span className={`text-sm font-semibold transition-colors ${!annualBilling ? 'text-text-primary' : 'text-text-muted'}`}>Monthly</span>
                        <button
                            type="button"
                            onClick={() => setAnnualBilling(!annualBilling)}
                            className={`relative h-7 w-14 flex-shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${annualBilling ? 'border-primary/60 bg-primary/90' : 'border-slate-500 bg-slate-600'}`}
                            aria-label="Toggle annual billing"
                            aria-pressed={annualBilling}
                        >
                            <motion.span
                                className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.35)]"
                                animate={{ x: annualBilling ? 24 : 0 }}
                                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                            />
                        </button>
                        <span className={`flex items-center gap-2 text-sm font-semibold transition-colors ${annualBilling ? 'text-text-primary' : 'text-text-muted'}`}>
                            Annual
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                Save 20%
                            </span>
                        </span>
                    </FadeIn>

                    <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
                        <PricingCard
                            name="Free"
                            price="$0"
                            description="Explore your first insights."
                            features={[
                                '3 audits / month',
                                '1 domain',
                                '3 pages per audit',
                                'Basic recommendations',
                            ]}
                            cta={{ label: 'Get started free', to: '/signup' }}
                            annualBilling={annualBilling}
                        />
                        <PricingCard
                            name="Starter"
                            price={annualBilling ? '$39' : '$49'}
                            annualTotal={annualBilling ? '$468' : undefined}
                            description="For brands tracking visibility."
                            features={[
                                '25 audits / month',
                                '5 domains',
                                '10 pages per audit',
                                'Keyword tracking',
                                'CSV export',
                            ]}
                            cta={{ label: 'Start Starter', to: '/signup' }}
                            annualBilling={annualBilling}
                        />
                        <PricingCard
                            name="Pro"
                            price={annualBilling ? '$119' : '$149'}
                            annualTotal={annualBilling ? '$1,428' : undefined}
                            description="For teams running weekly audits."
                            features={[
                                '100 audits / month',
                                'Unlimited domains',
                                '25 pages per audit',
                                'Competitor benchmarking',
                                'API access',
                                'Scheduled audits',
                                'PDF reports',
                            ]}
                            cta={{ label: 'Start Pro', to: '/signup' }}
                            featured
                            annualBilling={annualBilling}
                        />
                        <PricingCard
                            name="Agency"
                            price={annualBilling ? '$319' : '$399'}
                            annualTotal={annualBilling ? '$3,828' : undefined}
                            description="For agencies and large teams."
                            features={[
                                '500 audits / month',
                                'White-label branding',
                                '10-seat team management',
                                'SSO / SAML',
                                'Custom dashboard',
                                'Priority support',
                                'Webhook integrations',
                            ]}
                            cta={{ label: 'Start Agency', to: '/signup' }}
                            annualBilling={annualBilling}
                        />
                    </div>

                    {annualBilling && (
                        <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center text-sm text-emerald-400 font-semibold mt-6"
                        >
                            Annual billing saves you up to $960/year
                        </motion.p>
                    )}

                    <FadeIn delay={0.2} className="mt-10 text-center">
                        <p className="text-xs text-text-muted">
                            Need a custom plan?{' '}
                            <a href="mailto:support@cognition-ai.com" className="text-primary hover:text-white transition-colors font-semibold">
                                Contact us
                            </a>
                            {' '}— enterprise pricing available.
                        </p>
                    </FadeIn>
                </div>
            </section>

            {/* ── FAQ ────────────────────────────────────── */}
            <section id="faq" className="relative z-10 py-20 sm:py-24 border-t border-white/5">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <FadeIn>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary text-center">FAQ</p>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary text-center mt-3">
                            Questions? We have answers.
                        </h2>
                        <p className="text-text-secondary text-center mt-4 leading-relaxed">
                            Everything you need to know before getting started.
                        </p>
                    </FadeIn>
                    <div className="mt-10 space-y-3">
                        {FAQ_ITEMS.map((item) => (
                            <FAQItem key={item.question} question={item.question} answer={item.answer} />
                        ))}
                    </div>
                    <FadeIn delay={0.1} className="mt-10 text-center">
                        <p className="text-text-secondary text-sm mb-4">Still have questions?</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link to="/help">
                                <Button variant="secondary" className="w-full sm:w-auto">Browse Help Center</Button>
                            </Link>
                            <a href="mailto:support@cognition-ai.com">
                                <Button variant="ghost" className="w-full sm:w-auto border border-white/10">Email Support</Button>
                            </a>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ── Final CTA ──────────────────────────────── */}
            <section className="relative z-10 py-20 sm:py-28 border-t border-white/5 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/15 blur-[120px] rounded-full" />
                </div>
                <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
                    <FadeIn>
                        <div className="mx-auto mb-6 flex justify-center">
                            <BrandMark className="h-14 w-14" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-text-primary leading-tight">
                            Find out how AI sees<br />your brand — for free
                        </h2>
                        <p className="mt-5 text-lg text-text-secondary leading-relaxed max-w-xl mx-auto">
                            Get your first audit free. No credit card, no setup — just paste your URL and see your AI visibility score in minutes.
                        </p>
                        <div className="mt-8 flex justify-center">
                            <Link to="/help" className="w-full sm:w-auto">
                                <Button variant="ghost" size="lg" className="w-full sm:w-auto border border-white/10 hover:bg-white/5">
                                    Browse Help Center
                                </Button>
                            </Link>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ── Mobile Sticky CTA ──────────────────────── */}
            {false && <MobileStickyCTA />}

            {/* ── Footer ─────────────────────────────────── */}
            <footer className="relative z-10 border-t border-white/5 py-12 sm:py-14 pb-32 sm:pb-14">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                                <BrandMark className="h-8 w-8 rounded-lg" />
                                <p className="text-text-primary font-display font-bold">GOATAEO</p>
                            </div>
                            <p className="text-sm text-text-secondary mt-3 max-w-md leading-relaxed">
                                Measure and improve how AI assistants cite and understand your brand. Built for the AI-first search era.
                            </p>
                            <div className="flex items-center gap-5 mt-4">
                                <a href="#" aria-label="Follow on Twitter/X" className="text-text-muted hover:text-text-primary transition-colors text-xs font-semibold">Twitter / X</a>
                                <a href="#" aria-label="Follow on LinkedIn" className="text-text-muted hover:text-text-primary transition-colors text-xs font-semibold">LinkedIn</a>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-3 text-sm font-semibold text-text-secondary">
                            <a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a>
                            <Link to="/docs/api" className="hover:text-text-primary transition-colors">API Docs</Link>
                            <Link to="/help" className="hover:text-text-primary transition-colors">Help Center</Link>
                            <Link to="/terms" className="hover:text-text-primary transition-colors">Terms</Link>
                            <Link to="/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
                            <a href="mailto:support@cognition-ai.com" className="hover:text-text-primary transition-colors">Contact</a>
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <p className="text-xs text-text-muted font-semibold">
                            © {new Date().getFullYear()} GOATAEO. All rights reserved.
                        </p>
                        <p className="text-xs text-text-muted font-semibold">
                            Payments by Paddle · Available worldwide
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
