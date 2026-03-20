import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const PLAN_FEATURES = [
    'Unlimited website audits',
    'AI visibility scoring',
    'Page-level recommendations',
    'Private dashboard access',
    'Email support',
];

export const PricingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-text-primary">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
                <div className="text-center max-w-2xl mx-auto">
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-secondary">Pricing</p>
                    <h1 className="mt-4 text-4xl sm:text-5xl font-display font-bold text-white">
                        Simple pricing for one focused plan
                    </h1>
                    <p className="mt-5 text-base sm:text-lg text-text-secondary leading-relaxed">
                        Everything you need to start monitoring how AI platforms understand and describe your brand.
                    </p>
                </div>

                <div className="mt-12 flex justify-center">
                    <Card variant="glass" className="w-full max-w-xl border-white/10 bg-surface/50 p-8 sm:p-10">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.24em] text-text-muted">Core Plan</p>
                                <h2 className="mt-3 text-3xl font-display font-bold text-white">$29<span className="text-lg text-text-muted">/month</span></h2>
                                <p className="mt-3 text-sm text-text-secondary">
                                    One premium plan for teams that want a clean, simple starting point.
                                </p>
                            </div>
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                                Launch offer
                            </span>
                        </div>

                        <ul className="mt-8 space-y-3">
                            {PLAN_FEATURES.map((feature) => (
                                <li key={feature} className="flex items-start gap-3 text-sm text-text-secondary">
                                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-8">
                            <Link to="/signup" className="block">
                                <Button variant="cta" size="lg" className="w-full">
                                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
