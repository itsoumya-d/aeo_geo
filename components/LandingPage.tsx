import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
    ArrowRight, Check, Cpu, Globe, LayoutDashboard, ShieldCheck, Menu, X,
    ChevronDown, ChevronUp, Play, BarChart2, Brain, Zap, Users,
    Building2, Code2, TrendingUp, Target, Minus
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { FadeIn, SlideUp, StaggerContainer } from './ui/Motion';
import { VideoModal } from './VideoModal';
import { insertFreeAuditLead } from '../services/supabase';
import { normalizeUrl, validateUrl } from '../utils/validation';

/* ─────────────────────────────────────────────────────── */
/*  Reusable sub-components                                 */
/* ─────────────────────────────────────────────────────── */

/**
 * Counts from 0 to `target` when the element scrolls into view.
 * Handles suffixes like '+', '%', 'B' so the display matches the raw value exactly.
 */
const AnimatedStat: React.FC<{ value: string; className?: string }> = ({ value, className = '' }) => {
    const ref = useRef<HTMLSpanElement>(null);
    const [displayed, setDisplayed] = useState('0');
    const prefersReduced = useReducedMotion();

    useEffect(() => {
        const el = ref.current;
        if (!el || prefersReduced) {
            setDisplayed(value);
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();

            // Parse numeric portion and suffix (e.g. '520%' → num=520, suffix='%')
            const match = value.match(/^([\d.]+)(.*)$/);
            if (!match) { setDisplayed(value); return; }

            const target = parseFloat(match[1]);
            const suffix = match[2];
            const isDecimal = match[1].includes('.');
            const duration = 1200;
            const start = performance.now();

            const tick = (now: number) => {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                // Ease-out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = target * eased;
                setDisplayed((isDecimal ? current.toFixed(1) : Math.round(current).toString()) + suffix);
                if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }, { threshold: 0.3 });

        observer.observe(el);
        return () => observer.disconnect();
    }, [value, prefersReduced]);

    return <span ref={ref} className={className}>{displayed}</span>;
};

const FeatureCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    desc: string;
}> = ({ icon, title, desc }) => (
    <Card variant="glass" className="p-6 border-white/10 hover:border-primary/20 transition-colors">
        <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary flex-shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <h3 className="text-white font-display font-bold text-lg leading-tight">{title}</h3>
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
        className={`p-7 border-white/10 flex flex-col ${featured ? 'ring-1 ring-primary/40 shadow-glow' : ''}`}
    >
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
                <h3 className="text-white font-display font-bold text-xl">{name}</h3>
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
                <p className="text-4xl font-display font-bold text-white">{price}</p>
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
                <Button variant={featured ? 'cta' : 'secondary'} size="lg" className="w-full">
                    {cta.label} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </Link>
        </div>
    </Card>
);

const HeroPreview: React.FC = () => (
    <div className="relative group">
        <div className="absolute -inset-6 bg-primary/10 blur-2xl rounded-[3rem] group-hover:bg-primary/15 transition-colors duration-500" aria-hidden="true" />
        <Card variant="glass" className="border-white/10 shadow-2xl overflow-hidden hover:border-primary/20 transition-colors duration-300">
            <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-gradient-to-tr from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-display font-bold truncate text-sm">AI Visibility Report</p>
                        <p className="text-xs text-text-muted font-bold uppercase tracking-[0.2em] truncate">yoursite.com</p>
                    </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full whitespace-nowrap flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                </span>
            </div>

            <div className="p-5 grid grid-cols-3 gap-3">
                {[
                    { label: 'Overall', value: '78', trend: '+12%', color: 'text-emerald-400' },
                    { label: 'Citations', value: '64', trend: '+8%', color: 'text-emerald-400' },
                    { label: 'Technical', value: '82', trend: '+5%', color: 'text-emerald-400' }
                ].map((m) => (
                    <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all duration-200">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-muted">{m.label}</p>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                            <p className="text-xl font-display font-bold text-white">{m.value}</p>
                            <span className={`text-xs font-bold ${m.color}`}>{m.trend}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-5 pb-5">
                <div className="bg-background/60 border border-white/5 rounded-2xl p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-muted mb-3">AI Platform Breakdown</p>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { name: 'ChatGPT', score: 85, color: 'bg-emerald-500' },
                            { name: 'Gemini', score: 72, color: 'bg-blue-500' },
                            { name: 'Claude', score: 68, color: 'bg-purple-500' },
                            { name: 'Perplexity', score: 91, color: 'bg-orange-500' }
                        ].map((p) => (
                            <div key={p.name} className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                                <div className="flex items-center justify-between">
                                    <p className="text-white text-xs font-semibold truncate">{p.name}</p>
                                    <span className="text-xs font-bold text-text-muted ml-1 flex-shrink-0">{p.score}</span>
                                </div>
                                <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                    <motion.div
                                        className={`h-full ${p.color}`}
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${p.score}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    </div>
);

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
                <span className="text-white font-semibold text-sm pr-4">{question}</span>
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
        question: 'How is Cognition AI different from traditional SEO tools?',
        answer: 'Traditional SEO tools measure Google rankings. Cognition AI measures AI visibility — how likely your brand is to be cited, quoted, or recommended by AI search engines. We analyze your semantic positioning, entity linking, quotability, and cross-platform consistency.'
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
        answer: 'Yes! Pro and Agency plans include full API access with SHA-256 authenticated API keys. You can run audits, fetch reports, and integrate Cognition data into your own dashboards and client workflows.'
    },
    {
        question: 'Do you offer white-label reports for agencies?',
        answer: 'Yes. Agency plan includes white-label branding — add your logo, custom colors, and hide Cognition branding in PDF reports. Perfect for agencies delivering AI visibility audits to their clients.'
    },
];

/* Mobile sticky CTA — only rendered on small screens */
const FreeAuditCaptureForm: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const [websiteUrl, setWebsiteUrl] = React.useState('');
    const [error, setError] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        const validation = validateUrl(websiteUrl);
        if (!validation.isValid) {
            const message = validation.error || 'Enter a valid website URL.';
            setError(message);
            console.error('Free audit insert failed:', message);
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await insertFreeAuditLead(websiteUrl);
            if (success) {
                setWebsiteUrl('');
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
                    }}
                    placeholder="Enter your website URL"
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 group cursor-pointer flex-shrink-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                            <Cpu className="text-white w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-white group-hover:text-primary transition-colors">
                            Cognition AI
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-semibold text-text-secondary">
                        <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
                        <Link to="/help" className="hover:text-white transition-colors">Help</Link>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
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
                        className="md:hidden p-2.5 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
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
            <header className="relative z-10 pt-12 pb-16 sm:pt-16 sm:pb-24 overflow-hidden">
                {/* Ambient gradient orbs */}
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <motion.div
                        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[140px]"
                        animate={shouldReduceMotion ? {} : { scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute top-1/4 right-0 w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[120px]"
                        animate={shouldReduceMotion ? {} : { scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                    />
                    <motion.div
                        className="absolute bottom-0 left-1/3 w-[300px] h-[300px] rounded-full bg-pink-600/8 blur-[100px]"
                        animate={shouldReduceMotion ? {} : { scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
                    />
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center relative">
                    <div className="min-w-0">
                        <SlideUp>
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold uppercase tracking-wider mb-5"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                AI Search Visibility Platform
                            </motion.div>

                            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-display font-bold text-white leading-[1.05] tracking-tight">
                                Make Your Brand<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                                    Impossible to Miss
                                </span>{' '}
                                in AI Search
                            </h1>
                            <p className="mt-5 text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl">
                                Find out exactly what ChatGPT, Gemini, Claude, and Perplexity say about your brand — then get a clear, prioritized action plan to get cited more.
                            </p>
                        </SlideUp>

                        <FadeIn delay={0.15} className="mt-7">
                            <FreeAuditCaptureForm />
                            <div className="mt-3 flex flex-col sm:flex-row gap-3">
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
                                Watch 2-min demo
                            </Button>
                            </div>
                        </FadeIn>

                        {/* Trust signals */}
                        <FadeIn delay={0.25} className="mt-8 flex flex-wrap gap-x-5 gap-y-2 items-center">
                            {[
                                { icon: <Check className="w-3.5 h-3.5 text-emerald-400" />, label: '3 free audits included' },
                                { icon: <Check className="w-3.5 h-3.5 text-emerald-400" />, label: 'No credit card required' },
                                { icon: <Check className="w-3.5 h-3.5 text-emerald-400" />, label: 'Results in minutes' },
                            ].map(({ icon, label }) => (
                                <div key={label} className="flex items-center gap-1.5">
                                    {icon}
                                    <span className="text-sm font-medium text-text-secondary">{label}</span>
                                </div>
                            ))}
                        </FadeIn>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="min-w-0 w-full"
                    >
                        <HeroPreview />
                    </motion.div>
                </div>
            </header>

            {/* ── Stats Bar ──────────────────────────────── */}
            <section className="relative z-10 border-y border-white/5 bg-white/[0.02]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
                        {[
                            { value: '8', label: 'AI platforms tracked', icon: <Globe className="w-5 h-5 text-primary" /> },
                            { value: '50%+', label: 'of searches show AI results', icon: <BarChart2 className="w-5 h-5 text-purple-400" /> },
                            { value: '520%', label: 'growth in AI-driven traffic', icon: <TrendingUp className="w-5 h-5 text-emerald-400" /> },
                            { value: '1.8B', label: 'generative AI users globally', icon: <Users className="w-5 h-5 text-amber-400" /> },
                        ].map((stat) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4 }}
                                className="flex flex-col items-center text-center gap-2"
                            >
                                {stat.icon}
                                <p className="text-3xl sm:text-4xl font-display font-bold text-white">
                                    <AnimatedStat value={stat.value} />
                                </p>
                                <p className="text-xs sm:text-sm text-text-muted leading-snug">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Problem Section ────────────────────────── */}
            <section className="relative z-10 py-20 sm:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <FadeIn>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary text-center">The Shift</p>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-white text-center mt-3">
                            Search changed. Your tools haven't caught up.
                        </h2>
                        <p className="text-text-secondary text-center mt-4 max-w-2xl mx-auto leading-relaxed">
                            When someone asks an AI assistant a question, it picks a brand to recommend. That brand is never chosen randomly — and traditional SEO tools have no way to measure or influence it.
                        </p>
                    </FadeIn>

                    <div className="mt-14 grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Minus className="w-6 h-6 text-rose-400" />,
                                iconBg: 'bg-rose-500/10 border-rose-500/20',
                                tag: 'Traditional SEO',
                                tagColor: 'text-rose-400',
                                title: 'Ranks for Google. That\'s it.',
                                desc: 'Traditional tools track keyword positions and backlinks — metrics that tell you nothing about whether AI recommends your brand when users ask questions.',
                            },
                            {
                                icon: <Brain className="w-6 h-6 text-amber-400" />,
                                iconBg: 'bg-amber-500/10 border-amber-500/20',
                                tag: 'The Gap',
                                tagColor: 'text-amber-400',
                                title: 'AI picks winners differently.',
                                desc: 'LLMs evaluate brands on semantic clarity, entity authority, quotability, and content consistency — none of which Google rankings measure.',
                            },
                            {
                                icon: <Target className="w-6 h-6 text-emerald-400" />,
                                iconBg: 'bg-emerald-500/10 border-emerald-500/20',
                                tag: 'Cognition AI',
                                tagColor: 'text-emerald-400',
                                title: 'Built for the AI era.',
                                desc: 'Cognition measures exactly what AI models use to evaluate your brand — and gives you specific, prioritized fixes that move the needle.',
                            },
                        ].map((item) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 14 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4 }}
                            >
                                <Card variant="glass" className="p-7 border-white/10 h-full flex flex-col">
                                    <div className={`w-12 h-12 rounded-2xl ${item.iconBg} border flex items-center justify-center mb-4 flex-shrink-0`}>
                                        {item.icon}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${item.tagColor} mb-2`}>{item.tag}</span>
                                    <h3 className="text-white font-display font-bold text-lg">{item.title}</h3>
                                    <p className="text-text-secondary mt-3 leading-relaxed text-sm flex-1">{item.desc}</p>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How It Works ───────────────────────────── */}
            <section id="how-it-works" className="relative z-10 py-20 sm:py-24 border-t border-white/5 bg-surface/30 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <FadeIn>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary text-center">How It Works</p>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-white text-center mt-3">
                            From URL to action plan in minutes
                        </h2>
                        <p className="text-text-secondary text-center mt-4 max-w-2xl mx-auto leading-relaxed">
                            No setup. No integrations needed. Just paste your URL and see exactly how AI perceives your brand.
                        </p>
                    </FadeIn>

                    <StaggerContainer className="mt-14 grid md:grid-cols-3 gap-8 relative">
                        <div className="hidden md:block absolute top-8 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden="true" />
                        {[
                            {
                                step: '01',
                                title: 'Enter your website URL',
                                desc: 'Paste any URL. Our engine automatically discovers your site structure, key pages, and content — no sitemap or configuration needed.',
                                color: 'from-primary to-purple-600',
                                icon: <Globe className="w-6 h-6 text-white" />,
                            },
                            {
                                step: '02',
                                title: 'AI analysis runs instantly',
                                desc: 'Gemini AI evaluates your content across 8 platforms — measuring semantic clarity, entity authority, citation potential, and brand consistency.',
                                color: 'from-purple-600 to-pink-600',
                                icon: <Brain className="w-6 h-6 text-white" />,
                            },
                            {
                                step: '03',
                                title: 'Get your prioritized action plan',
                                desc: 'Receive page-by-page recommendations ranked by impact. Simulate content changes and see predicted improvements before you publish anything.',
                                color: 'from-pink-600 to-orange-500',
                                icon: <Zap className="w-6 h-6 text-white" />,
                            },
                        ].map((item) => (
                            <motion.div
                                key={item.step}
                                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                                className="relative flex flex-col items-center text-center"
                            >
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${item.color} flex items-center justify-center shadow-lg mb-6`}>
                                    {item.icon}
                                </div>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.25em] mb-2">Step {item.step}</p>
                                <h3 className="text-white font-display font-bold text-lg">{item.title}</h3>
                                <p className="text-text-secondary mt-3 leading-relaxed text-sm">{item.desc}</p>
                            </motion.div>
                        ))}
                    </StaggerContainer>

                    <FadeIn delay={0.2} className="mt-12 text-center">
                        <Link to="/signup">
                            <Button variant="cta" size="lg">
                                Try it free — no credit card <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </FadeIn>
                </div>
            </section>

            {/* ── Features ───────────────────────────────── */}
            <section id="features" className="relative z-10 py-20 sm:py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <FadeIn>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary text-center">Features</p>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-white text-center mt-3">
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

            {/* ── Who It's For ───────────────────────────── */}
            <section className="relative z-10 py-20 sm:py-24 border-t border-white/5 bg-surface/30 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <FadeIn>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary text-center">Who It's For</p>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-white text-center mt-3">
                            Built for teams who can't afford to be invisible
                        </h2>
                    </FadeIn>

                    <StaggerContainer className="mt-12 grid md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Building2 className="w-7 h-7 text-primary" />,
                                bg: 'bg-primary/10 border-primary/20',
                                persona: 'Agencies',
                                headline: 'Deliver AI visibility as a service',
                                points: [
                                    'White-label PDF reports with your branding',
                                    'Manage unlimited client domains',
                                    '10-seat team collaboration',
                                    'API access for custom dashboards',
                                ],
                                cta: 'See Agency plan',
                                href: '#pricing',
                            },
                            {
                                icon: <Target className="w-7 h-7 text-purple-400" />,
                                bg: 'bg-purple-500/10 border-purple-500/20',
                                persona: 'Brands & Startups',
                                headline: 'Own the AI conversation in your niche',
                                points: [
                                    'Understand how AI perceives your product',
                                    'Get fixes you can ship this week',
                                    'Track score improvements over time',
                                    'Competitor benchmarking built in',
                                ],
                                cta: 'Start free',
                                href: '/signup',
                            },
                            {
                                icon: <Code2 className="w-7 h-7 text-emerald-400" />,
                                bg: 'bg-emerald-500/10 border-emerald-500/20',
                                persona: 'Developers & SEOs',
                                headline: 'Integrate AI visibility into your workflow',
                                points: [
                                    'Full REST API with authenticated keys',
                                    'Webhook integrations for CI/CD',
                                    'Scheduled auto-audits',
                                    'Looker Studio connector included',
                                ],
                                cta: 'View API docs',
                                href: '/docs/api',
                            },
                        ].map((item) => (
                            <motion.div
                                key={item.persona}
                                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                            >
                                <Card variant="glass" className="p-7 border-white/10 h-full flex flex-col hover:border-white/20 transition-colors">
                                    <div className={`w-14 h-14 rounded-2xl ${item.bg} border flex items-center justify-center mb-5 flex-shrink-0`}>
                                        {item.icon}
                                    </div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-muted mb-2">{item.persona}</p>
                                    <h3 className="text-white font-display font-bold text-xl leading-tight">{item.headline}</h3>
                                    <ul className="mt-5 space-y-3 flex-1">
                                        {item.points.map((pt) => (
                                            <li key={pt} className="flex items-start gap-3 text-sm text-text-secondary">
                                                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                                <span>{pt}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-7">
                                        {item.href.startsWith('/') && !item.href.startsWith('#') ? (
                                            <Link to={item.href}>
                                                <Button variant="secondary" className="w-full">
                                                    {item.cta} <ArrowRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            </Link>
                                        ) : (
                                            <a href={item.href}>
                                                <Button variant="secondary" className="w-full">
                                                    {item.cta} <ArrowRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            </a>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </StaggerContainer>
                </div>
            </section>

            {/* ── Platform Coverage ──────────────────────── */}
            <section className="relative z-10 py-14 border-t border-white/5">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <FadeIn>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-text-muted text-center mb-8">AI platforms we track</p>
                        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                            {['ChatGPT', 'Gemini', 'Claude', 'Perplexity', 'AI Overviews', 'Copilot', 'Meta AI', 'Grok'].map((name) => (
                                <span key={name} className="text-sm font-bold text-text-muted hover:text-text-secondary transition-colors">
                                    {name}
                                </span>
                            ))}
                        </div>
                        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                <span className="font-semibold">Data encrypted in transit &amp; at rest</span>
                            </div>
                            <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <Globe className="w-4 h-4 text-primary" />
                                <span className="font-semibold">Available worldwide · Paddle payments</span>
                            </div>
                            <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                            <div className="flex items-center gap-2 text-sm text-text-secondary">
                                <Users className="w-4 h-4 text-purple-400" />
                                <span className="font-semibold">Trusted by early adopters globally</span>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ── Social Proof / Testimonials ─────────────── */}
            <section className="relative z-10 py-20 sm:py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <FadeIn>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary text-center">Trusted by teams worldwide</p>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-white text-center mt-3">
                            What our users say
                        </h2>
                    </FadeIn>
                    <StaggerContainer className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                quote: "Cognition AI showed us we were invisible on Perplexity despite ranking #1 on Google. We fixed that in a week and our AI-sourced traffic grew 3x.",
                                name: "Sarah K.",
                                role: "SEO Director",
                                company: "Growth Agency",
                                avatar: "SK",
                                color: "from-primary/20 to-purple-500/10"
                            },
                            {
                                quote: "The AEO Forge tool alone is worth the subscription. We rewrote our product descriptions and went from 0 citations to appearing in 4 different AI platforms.",
                                name: "Marcus T.",
                                role: "Head of Content",
                                company: "B2B SaaS Brand",
                                avatar: "MT",
                                color: "from-emerald-500/20 to-teal-500/10"
                            },
                            {
                                quote: "Finally a tool that explains WHY an AI engine ignores your brand. The Vector Map made it instantly clear which pages were semantically redundant.",
                                name: "Priya L.",
                                role: "Product Marketer",
                                company: "Tech Startup",
                                avatar: "PL",
                                color: "from-amber-500/20 to-orange-500/10"
                            }
                        ].map((t) => (
                            <motion.div
                                key={t.name}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4 }}
                                className={`bg-gradient-to-br ${t.color} border border-white/10 rounded-2xl p-6 flex flex-col gap-4`}
                            >
                                <p className="text-text-secondary leading-relaxed text-sm flex-1">
                                    &ldquo;{t.quote}&rdquo;
                                </p>
                                <div className="flex items-center gap-3 border-t border-white/5 pt-4">
                                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-sm">{t.name}</p>
                                        <p className="text-text-muted text-xs">{t.role} · {t.company}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </StaggerContainer>
                </div>
            </section>

            {/* ── Comparison Table ──────────────────────── */}
            <section className="relative z-10 py-20 sm:py-24 border-t border-white/5 bg-surface/20">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <FadeIn>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary text-center">Why Cognition</p>
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-white text-center mt-3">
                            The only tool built for AI search
                        </h2>
                        <p className="text-text-secondary text-center mt-4 max-w-2xl mx-auto leading-relaxed">
                            See how Cognition AI stacks up against traditional SEO platforms and other AI visibility tools.
                        </p>
                    </FadeIn>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="mt-12 overflow-x-auto rounded-2xl border border-white/10"
                    >
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left p-4 pl-6 text-text-muted font-semibold w-[38%]">Feature</th>
                                    <th className="p-4 text-center">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-primary font-bold text-xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            Cognition AI
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
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-white text-center mt-3">
                            Start free, scale as you grow
                        </h2>
                        <p className="text-text-secondary text-center mt-4 max-w-2xl mx-auto leading-relaxed">
                            No hidden fees. Transparent pricing. Upgrade or cancel anytime.
                        </p>
                    </FadeIn>

                    {/* Annual/Monthly Toggle */}
                    <FadeIn delay={0.1} className="mt-8 flex items-center justify-center gap-4">
                        <span className={`text-sm font-semibold transition-colors ${!annualBilling ? 'text-white' : 'text-text-muted'}`}>Monthly</span>
                        <button
                            onClick={() => setAnnualBilling(!annualBilling)}
                            className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${annualBilling ? 'bg-primary' : 'bg-white/20'}`}
                            aria-label="Toggle annual billing"
                        >
                            <motion.span
                                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
                                animate={{ x: annualBilling ? 26 : 2 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        </button>
                        <span className={`text-sm font-semibold transition-colors ${annualBilling ? 'text-white' : 'text-text-muted'}`}>
                            Annual
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
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
                        <h2 className="text-3xl sm:text-4xl font-display font-bold text-white text-center mt-3">
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
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-xl shadow-primary/20 mb-6">
                            <Cpu className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white leading-tight">
                            Find out how AI sees<br />your brand — for free
                        </h2>
                        <p className="mt-5 text-lg text-text-secondary leading-relaxed max-w-xl mx-auto">
                            Get your first audit free. No credit card, no setup — just paste your URL and see your AI visibility score in minutes.
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                            <Link to="/signup" className="w-full sm:w-auto">
                                <Button variant="cta" size="lg" className="w-full sm:w-auto">
                                    Start your free audit <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                            <Link to="/help" className="w-full sm:w-auto">
                                <Button variant="ghost" size="lg" className="w-full sm:w-auto border border-white/10 hover:bg-white/5">
                                    Browse Help Center
                                </Button>
                            </Link>
                        </div>
                        <p className="mt-5 text-xs text-text-muted">3 free audits included · No credit card required · Cancel anytime</p>
                    </FadeIn>
                </div>
            </section>

            {/* ── Mobile Sticky CTA ──────────────────────── */}
            <MobileStickyCTA />

            {/* ── Footer ─────────────────────────────────── */}
            <footer className="relative z-10 border-t border-white/5 py-12 sm:py-14 pb-32 sm:pb-14">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-gradient-to-tr from-primary to-purple-600 rounded-lg flex items-center justify-center">
                                    <Cpu className="text-white w-4 h-4" />
                                </div>
                                <p className="text-white font-display font-bold">Cognition AI</p>
                            </div>
                            <p className="text-sm text-text-secondary mt-3 max-w-md leading-relaxed">
                                Measure and improve how AI assistants cite and understand your brand. Built for the AI-first search era.
                            </p>
                            <div className="flex items-center gap-5 mt-4">
                                <a href="https://twitter.com/cognition_ai" target="_blank" rel="noopener noreferrer" aria-label="Follow on Twitter/X" className="text-text-muted hover:text-white transition-colors text-xs font-semibold">Twitter / X</a>
                                <a href="https://linkedin.com/company/cognition-ai" target="_blank" rel="noopener noreferrer" aria-label="Follow on LinkedIn" className="text-text-muted hover:text-white transition-colors text-xs font-semibold">LinkedIn</a>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-3 text-sm font-semibold text-text-secondary">
                            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                            <Link to="/docs/api" className="hover:text-white transition-colors">API Docs</Link>
                            <Link to="/help" className="hover:text-white transition-colors">Help Center</Link>
                            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                            <a href="mailto:support@cognition-ai.com" className="hover:text-white transition-colors">Contact</a>
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <p className="text-xs text-text-muted font-semibold">
                            © {new Date().getFullYear()} Cognition AI. All rights reserved.
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
