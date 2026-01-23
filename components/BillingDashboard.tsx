import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useToast } from './Toast';
import {
    CreditCard, Zap, RefreshCw, TrendingUp, AlertTriangle,
    Check, ExternalLink, Loader2, Sparkles
} from 'lucide-react';

interface PlanConfig {
    name: string;
    price: string;
    priceMonthly: number; // For calculations
    audits: number;
    rewrites: number;
    priceId: string;
    features: string[];
    apiCostPerAudit: number; // Estimated Gemini + Perplexity cost
}

/**
 * Stripe Plan Configuration
 * 
 * To configure production Stripe IDs:
 * 1. Create products in Stripe Dashboard
 * 2. Copy the Price IDs (format: price_xxxxx)
 * 3. Set environment variables:
 *    - VITE_STRIPE_STARTER_PRICE_ID
 *    - VITE_STRIPE_PRO_PRICE_ID
 *    - VITE_STRIPE_AGENCY_PRICE_ID
 */
const PLANS: Record<string, PlanConfig> = {
    free: {
        name: 'Free',
        price: '$0',
        priceMonthly: 0,
        audits: 5,
        rewrites: 50,
        priceId: '',
        features: ['5 AI Audits', '50 Rewrite Simulations', 'Basic Reports'],
        apiCostPerAudit: 0.10
    },
    starter: {
        name: 'Starter',
        price: '$49',
        priceMonthly: 49,
        audits: 50,
        rewrites: 500,
        priceId: import.meta.env.VITE_STRIPE_STARTER_PRICE_ID || '',
        features: ['50 AI Audits/mo', '500 Simulations/mo', 'PDF Reports', 'Email Support'],
        apiCostPerAudit: 0.10
    },
    pro: {
        name: 'Professional',
        price: '$149',
        priceMonthly: 149,
        audits: 200,
        rewrites: 2000,
        priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || '',
        features: ['200 AI Audits/mo', '2000 Simulations/mo', 'API Access', 'Priority Support'],
        apiCostPerAudit: 0.08
    },
    agency: {
        name: 'Agency',
        price: '$399',
        priceMonthly: 399,
        audits: 1000,
        rewrites: 10000,
        priceId: import.meta.env.VITE_STRIPE_AGENCY_PRICE_ID || '',
        features: ['1000 AI Audits/mo', '10000 Simulations/mo', 'White-Label', 'Team Seats'],
        apiCostPerAudit: 0.05
    }
};


interface UsageBarProps {
    label: string;
    current: number;
    max: number;
    icon: React.ReactNode;
    colorClass?: string;
}

const UsageBar: React.FC<UsageBarProps> = ({ label, current, max, icon, colorClass = 'bg-primary' }) => {
    const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const remaining = max - current;
    const isLow = percentage >= 80;
    const isEmpty = remaining <= 0;

    return (
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    {icon}
                    {label}
                </div>
                <div className="text-right">
                    <span className={`text-lg font-bold ${isEmpty ? 'text-rose-400' : 'text-white'}`}>
                        {remaining}
                    </span>
                    <span className="text-slate-500 text-sm"> / {max}</span>
                </div>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-amber-500' : isEmpty ? 'bg-rose-500' : colorClass
                        }`}
                    style={{ width: `${100 - percentage}%` }}
                />
            </div>
            {isLow && !isEmpty && (
                <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Running low - consider upgrading
                </p>
            )}
            {isEmpty && (
                <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    No credits remaining - upgrade to continue
                </p>
            )}
        </div>
    );
};

export const BillingDashboard: React.FC = () => {
    const { organization, refreshOrganization } = useAuth();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const currentPlan = PLANS[organization?.plan || 'free'] || PLANS.free;
    const auditCredits = organization?.audit_credits_remaining ?? 5;
    const rewriteCredits = organization?.rewrite_credits_remaining ?? 50;

    const handleUpgrade = async (priceId: string, planName: string) => {
        if (!priceId) {
            toast.info("You're on the Free plan", "Select a paid plan to upgrade.");
            return;
        }

        setLoadingAction(planName);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    priceId,
                    successUrl: `${window.location.origin}/settings?tab=billing&success=true`,
                    cancelUrl: `${window.location.origin}/settings?tab=billing`
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            console.error("Checkout Error:", error);
            toast.error("Checkout Failed", error.message || "Please try again later.");
        } finally {
            setLoadingAction(null);
        }
    };

    const handleManageBilling = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    portal: true, // Signal to create a portal session
                    returnUrl: window.location.href
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                toast.info("No Active Subscription", "You are on the free plan.");
            }
        } catch (error: any) {
            console.error("Billing Portal Error:", error);
            toast.error("Error", "Could not access billing settings.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshCredits = async () => {
        setIsLoading(true);
        await refreshOrganization();
        toast.success("Refreshed", "Credit balance updated.");
        setIsLoading(false);
    };

    return (
        <div className="space-y-8">
            {/* Current Plan Header */}
            <div className="bg-gradient-to-br from-primary/20 via-purple-500/10 to-slate-900 border border-primary/30 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10">
                    <Sparkles className="w-32 h-32 text-primary" />
                </div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <p className="text-sm text-slate-400 mb-1">Current Plan</p>
                            <h2 className="text-3xl font-bold text-white">{currentPlan.name}</h2>
                            <p className="text-primary font-semibold">{currentPlan.price}/month</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleRefreshCredits}
                                disabled={isLoading}
                                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <button
                                onClick={handleManageBilling}
                                disabled={isLoading}
                                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Manage Billing
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Usage Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UsageBar
                    label="AI Audits"
                    current={currentPlan.audits - auditCredits}
                    max={currentPlan.audits}
                    icon={<TrendingUp className="w-4 h-4 text-primary" />}
                    colorClass="bg-primary"
                />
                <UsageBar
                    label="Rewrite Simulations"
                    current={currentPlan.rewrites - rewriteCredits}
                    max={currentPlan.rewrites}
                    icon={<Zap className="w-4 h-4 text-amber-400" />}
                    colorClass="bg-amber-500"
                />
            </div>

            {/* Upgrade Prompt for Free Users */}
            {organization?.plan === 'free' && (
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-amber-500/20 p-3 rounded-xl">
                            <Zap className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-1">
                                Unlock More AI Audits
                            </h3>
                            <p className="text-sm text-slate-400 mb-4">
                                You're on the Free plan with limited audits. Upgrade to run unlimited analyses
                                and access advanced features like API access and white-label reports.
                            </p>
                            <button
                                onClick={() => handleUpgrade(PLANS.starter.priceId, 'starter')}
                                disabled={loadingAction === 'starter'}
                                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                            >
                                {loadingAction === 'starter' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CreditCard className="w-4 h-4" />
                                )}
                                Upgrade to Starter ($49/mo)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Plan Comparison */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Available Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(PLANS).filter(([key]) => key !== 'free').map(([key, plan]) => {
                        const isCurrent = organization?.plan === key;
                        return (
                            <div
                                key={key}
                                className={`relative rounded-xl p-5 border transition-all ${isCurrent
                                    ? 'bg-primary/10 border-primary'
                                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                                    }`}
                            >
                                {isCurrent && (
                                    <div className="absolute -top-3 left-4 bg-primary text-white text-xs font-bold px-2 py-1 rounded">
                                        Current
                                    </div>
                                )}
                                <h4 className="text-lg font-semibold text-white mb-1">{plan.name}</h4>
                                <p className="text-2xl font-bold text-white mb-4">
                                    {plan.price}<span className="text-sm text-slate-500">/mo</span>
                                </p>
                                <ul className="space-y-2 mb-5">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="text-sm text-slate-400 flex items-center gap-2">
                                            <Check className="w-4 h-4 text-primary" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                {!isCurrent && (
                                    <button
                                        onClick={() => handleUpgrade(plan.priceId, key)}
                                        disabled={loadingAction === key}
                                        className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        {loadingAction === key ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            'Select Plan'
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
