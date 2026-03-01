import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ChevronLeft, ChevronRight, Search, BarChart3,
    Sparkles, Target, Zap, TrendingUp
} from 'lucide-react';
import { trapFocus } from '../utils/accessibility';

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface TourStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    visual: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
    {
        title: 'Enter Any URL',
        description: 'Paste your website URL and our engine crawls every page, extracting content, structure, and schema markup that AI models use to build answers.',
        icon: <Search className="w-6 h-6" />,
        visual: (
            <div className="bg-slate-900 rounded-xl p-6 border border-white/10 w-full max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="bg-slate-800 rounded-lg p-4 flex items-center gap-3 border border-white/5">
                    <Search className="w-5 h-5 text-slate-500 shrink-0" />
                    <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, ease: 'easeInOut' }}
                        className="text-primary font-mono text-sm overflow-hidden whitespace-nowrap block"
                    >
                        https://yourcompany.com
                    </motion.span>
                </div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="mt-3 text-xs text-emerald-400 font-medium"
                >
                    Crawling 12 pages...
                </motion.div>
            </div>
        ),
    },
    {
        title: 'AI Visibility Score',
        description: 'Get a 0-100 visibility score across 8 major AI platforms: ChatGPT, Gemini, Claude, Perplexity, Google AI Overviews, Microsoft Copilot, Meta AI, and Grok. See exactly how each platform understands and ranks your content.',
        icon: <BarChart3 className="w-6 h-6" />,
        visual: (
            <div className="flex items-center justify-center gap-8 w-full">
                <div className="relative w-28 h-28">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                        <motion.circle
                            cx="18" cy="18" r="15.5" fill="none" stroke="#6366f1" strokeWidth="3"
                            strokeLinecap="round" strokeDasharray="97.4"
                            initial={{ strokeDashoffset: 97.4 }}
                            animate={{ strokeDashoffset: 22.4 }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                    </svg>
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center text-white font-bold text-2xl"
                    >
                        77
                    </motion.span>
                </div>
                <div className="space-y-2">
                    {[
                        { name: 'ChatGPT', score: 82, color: 'bg-emerald-500' },
                        { name: 'Gemini', score: 71, color: 'bg-blue-500' },
                        { name: 'Claude', score: 68, color: 'bg-purple-500' },
                        { name: 'Perplexity', score: 85, color: 'bg-amber-500' },
                    ].map((p, i) => (
                        <div key={p.name} className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 w-16">{p.name}</span>
                            <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${p.score}%` }}
                                    transition={{ delay: 0.3 + i * 0.15, duration: 0.8 }}
                                    className={`h-full ${p.color} rounded-full`}
                                />
                            </div>
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 + i * 0.15 }}
                                className="text-xs text-white font-bold"
                            >
                                {p.score}
                            </motion.span>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        title: 'AEO Forge: AI-Powered Rewrites',
        description: 'Our AI content optimizer rewrites your content to maximize citation probability, entity linking, and quotability across all AI search engines.',
        icon: <Sparkles className="w-6 h-6" />,
        visual: (
            <div className="w-full max-w-md mx-auto space-y-3">
                <div className="bg-slate-900 rounded-lg p-4 border border-white/10">
                    <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mb-2">Original</div>
                    <p className="text-xs text-slate-400 leading-relaxed line-through decoration-rose-500/30">
                        We offer solutions for businesses looking to improve their online presence.
                    </p>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-center"
                >
                    <Zap className="w-5 h-5 text-primary" />
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="bg-slate-900 rounded-lg p-4 border border-emerald-500/30"
                >
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2">Optimized</div>
                    <p className="text-xs text-white leading-relaxed">
                        Cognition AI provides enterprise-grade AEO tools that help B2B SaaS companies increase AI search visibility by up to 3x.
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-400">
                        <TrendingUp className="w-3 h-3" /> +23 citation score
                    </div>
                </motion.div>
            </div>
        ),
    },
    {
        title: 'Semantic Vector Map',
        description: 'Visualize exactly where your brand sits relative to competitors in AI embedding space. Track semantic positioning over time.',
        icon: <Target className="w-6 h-6" />,
        visual: (
            <div className="relative w-full max-w-xs mx-auto aspect-square">
                <div className="absolute inset-0 border border-white/5 rounded-full" />
                <div className="absolute inset-[15%] border border-white/5 rounded-full" />
                <div className="absolute inset-[30%] border border-white/5 rounded-full" />
                <div className="absolute top-1/2 left-0 w-full h-px bg-white/5" />
                <div className="absolute top-0 left-1/2 h-full w-px bg-white/5" />
                {[
                    { x: 45, y: 35, label: 'You', color: 'bg-primary', size: 'w-4 h-4' },
                    { x: 70, y: 55, label: 'Comp A', color: 'bg-rose-500', size: 'w-3 h-3' },
                    { x: 30, y: 65, label: 'Comp B', color: 'bg-rose-500', size: 'w-3 h-3' },
                    { x: 55, y: 25, label: 'keyword', color: 'bg-blue-400', size: 'w-2 h-2' },
                    { x: 60, y: 70, label: 'keyword', color: 'bg-blue-400', size: 'w-2 h-2' },
                ].map((dot, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + i * 0.2 }}
                        className={`absolute ${dot.size} ${dot.color} rounded-full shadow-lg`}
                        style={{ left: `${dot.x}%`, top: `${dot.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-slate-400 font-bold whitespace-nowrap">
                            {dot.label}
                        </span>
                    </motion.div>
                ))}
            </div>
        ),
    },
];

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(0);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) setStep(0);
    }, [isOpen]);

    const next = useCallback(() => setStep(s => Math.min(s + 1, TOUR_STEPS.length - 1)), []);
    const prev = useCallback(() => setStep(s => Math.max(s - 1, 0)), []);

    useEffect(() => {
        if (!isOpen || !modalRef.current) return;
        const cleanupFocus = trapFocus(modalRef.current);
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') next();
            else if (e.key === 'ArrowLeft') prev();
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => { cleanupFocus(); window.removeEventListener('keydown', handler); };
    }, [isOpen, next, prev, onClose]);

    const current = TOUR_STEPS[step];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        aria-hidden="true"
                    />

                    <motion.div
                        ref={modalRef}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="tour-modal-title"
                        className="relative w-full max-w-3xl bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <button
                            onClick={onClose}
                            aria-label="Close product tour"
                            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white transition-colors backdrop-blur-md"
                        >
                            <X className="w-5 h-5" aria-hidden="true" />
                        </button>

                        {/* Progress bar */}
                        <div className="h-1 bg-white/5">
                            <motion.div
                                className="h-full bg-primary"
                                animate={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>

                        <div className="p-8 sm:p-12">
                            {/* Step indicator */}
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                    {current.icon}
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Step {step + 1} of {TOUR_STEPS.length}
                                </span>
                            </div>

                            {/* Content */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <h2 id="tour-modal-title" className="text-2xl font-bold text-white mb-3">{current.title}</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-lg">
                                        {current.description}
                                    </p>

                                    {/* Visual */}
                                    <div className="min-h-[200px] flex items-center justify-center">
                                        {current.visual}
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Navigation */}
                            <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/5">
                                <button
                                    onClick={prev}
                                    disabled={step === 0}
                                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>

                                <div className="flex gap-1.5" role="tablist" aria-label="Tour steps">
                                    {TOUR_STEPS.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setStep(i)}
                                            role="tab"
                                            aria-selected={i === step}
                                            aria-label={`Step ${i + 1}: ${s.title}`}
                                            className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-white/10 hover:bg-white/20'}`}
                                        />
                                    ))}
                                </div>

                                {step < TOUR_STEPS.length - 1 ? (
                                    <button
                                        onClick={next}
                                        className="flex items-center gap-2 text-sm text-white bg-primary hover:bg-primary/80 px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={onClose}
                                        className="flex items-center gap-2 text-sm text-white bg-primary hover:bg-primary/80 px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        Get Started
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
