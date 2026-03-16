import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../utils/errors';
import {
    CreditCard, Zap, RefreshCw, TrendingUp, AlertTriangle,
    Check, ExternalLink, Loader2, Sparkles, FileText, Download, Mail
} from 'lucide-react';

interface PlanConfig {
    name: string;
    priceMonthly: number;
    priceAnnual: number;
    audits: number;
    rewrites: number;
    priceId: string;
    annualPriceId: string;
    features: string[];
}

/**
 * Paddle Plan Configuration
 *
 * To configure production Paddle IDs:
 * 1. Create monthly + annual products in Paddle Dashboard → Catalog
 * 2. Copy the Price IDs (format: pri_xxxxx)
 * 3. Set environment variables for both monthly and annual variants.
 */
const PLANS: Record<string, PlanConfig> = {
    free: {
        name: 'Free',
        priceMonthly: 0,
        priceAnnual: 0,
        audits: 3,
        rewrites: 30,
        priceId: '',
        annualPriceId: '',
        features: ['3 AI Audits/mo', '1 Domain', 'Basic Recommendations'],
    },
    starter: {
        name: 'Starter',
        priceMonthly: 49,
        priceAnnual: 39,
        audits: 25,
        rewrites: 250,
        priceId: import.meta.env.VITE_PADDLE_STARTER_PRICE_ID || '',
        annualPriceId: import.meta.env.VITE_PADDLE_STARTER_ANNUAL_PRICE_ID || '',
        features: ['25 AI Audits/mo', '5 Domains', 'Keyword Tracking', 'CSV Export'],
    },
    pro: {
        name: 'Professional',
        priceMonthly: 149,
        priceAnnual: 119,
        audits: 100,
        rewrites: 1000,
        priceId: import.meta.env.VITE_PADDLE_PRO_PRICE_ID || '',
        annualPriceId: import.meta.env.VITE_PADDLE_PRO_ANNUAL_PRICE_ID || '',
        features: ['100 AI Audits/mo', 'Unlimited Domains', 'API Access', 'Scheduled Audits', 'PDF Reports'],
    },
    agency: {
        name: 'Agency',
        priceMonthly: 399,
        priceAnnual: 319,
        audits: 500,
        rewrites: 5000,
        priceId: import.meta.env.VITE_PADDLE_AGENCY_PRICE_ID || '',
        annualPriceId: import.meta.env.VITE_PADDLE_AGENCY_ANNUAL_PRICE_ID || '',
        features: ['500 AI Audits/mo', 'White-Label Branding', 'Team Seats (10)', 'SSO', 'Webhooks'],
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

/**
 * Opens Paddle checkout overlay for a given price ID.
 * Uses the Paddle.js client-side SDK.
 */
function openPaddleCheckout(priceId: string, email?: string | null) {
    const Paddle = (window as any).Paddle;
    if (!Paddle) {
        throw new Error('Paddle SDK not loaded. Please refresh the page.');
    }
    Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: email ? { email } : undefined,
    });
}

export const BillingDashboard: React.FC = () => {
    const { organization, refreshOrganization, user } = useAuth();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [annualBilling, setAnnualBilling] = useState(false);

    const currentPlan = PLANS[organization?.plan || 'free'] || PLANS.free;
    const auditCredits = organization?.audit_credits_remaining ?? 3;
    const rewriteCredits = organization?.rewrite_credits_remaining ?? 30;

    const getPrice = (plan: PlanConfig) =>
        annualBilling ? `$${plan.priceAnnual}` : `$${plan.priceMonthly}`;

    const handleUpgrade = async (plan: PlanConfig, planKey: string) => {
        const priceId = annualBilling && plan.annualPriceId ? plan.annualPriceId : plan.priceId;
        if (!priceId) {
            toast.error("Billing Not Configured", "Payment is not yet set up. Please contact support.");
            return;
        }

        setLoadingAction(planKey);
        try {
            openPaddleCheckout(priceId, user?.email);
        } catch (error: any) {
            console.error("Checkout Error:", getTechnicalErrorMessage(error));
            const userMsg = toUserMessage(error);
            toast.error(userMsg.title, userMsg.message);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleManageBilling = async () => {
        setIsLoading(true);
        try {
            const Paddle = (window as any).Paddle;
            if (!Paddle) throw new Error('Paddle SDK not loaded');

            if (organization?.stripe_customer_id) {
                // Open Paddle's update payment method overlay
                Paddle.Update.open({
                    customer: { id: organization.stripe_customer_id },
                });
            } else {
                toast.info("No Active Subscription", "You are on the free plan.");
            }
        } catch (error: any) {
            console.error("Billing Portal Error:", getTechnicalErrorMessage(error));
            const userMsg = toUserMessage(error);
            toast.error(userMsg.title, userMsg.message);
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
                            <p className="text-primary font-semibold">
                                {currentPlan.priceMonthly === 0 ? 'Free' : `$${currentPlan.priceMonthly}/month`}
                            </p>
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

            {/* Usage Analytics */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">This Month's Activity</h3>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                        {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Audits Run', value: currentPlan.audits - auditCredits, icon: <TrendingUp className="w-4 h-4" />, color: 'text-primary' },
                        { label: 'Pages Analyzed', value: `~${(currentPlan.audits - auditCredits) * 5}`, icon: <Check className="w-4 h-4" />, color: 'text-emerald-400' },
                        { label: 'Simulations', value: currentPlan.rewrites - rewriteCredits, icon: <Zap className="w-4 h-4" />, color: 'text-amber-400' },
                        { label: 'Credits Used', value: `${currentPlan.audits - auditCredits}/${currentPlan.audits}`, icon: <RefreshCw className="w-4 h-4" />, color: 'text-blue-400' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 mb-2`}>
                                <span className={stat.color}>{stat.icon}</span>
                                {stat.label}
                            </div>
                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Invoice History */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Invoice History</h3>
                        <p className="text-sm text-slate-400">Download past invoices or update your billing details.</p>
                    </div>
                </div>

                {organization?.stripe_customer_id ? (
                    <div className="space-y-4">
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-start gap-3">
                            <Mail className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm text-white font-medium">Invoices are sent by email</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Paddle automatically emails a PDF invoice to <span className="text-white">{user?.email}</span> after each payment.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleManageBilling}
                                disabled={isLoading}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                Manage Billing &amp; Download Invoices
                            </button>
                            <p className="text-xs text-slate-500 self-center">
                                Opens Paddle's secure billing portal
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 border border-dashed border-slate-700 rounded-xl">
                        <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-400 mb-1">No billing history yet</p>
                        <p className="text-xs text-slate-500">
                            Invoice history will appear here once you subscribe to a paid plan.
                        </p>
                    </div>
                )}
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
                                {annualBilling && (
                                    <span className="text-emerald-400 font-semibold ml-1">
                                        Save ${(PLANS.starter.priceMonthly - PLANS.starter.priceAnnual) * 12}/yr with annual billing.
                                    </span>
                                )}
                            </p>
                            <button
                                onClick={() => handleUpgrade(PLANS.starter, 'starter')}
                                disabled={loadingAction === 'starter'}
                                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                            >
                                {loadingAction === 'starter' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CreditCard className="w-4 h-4" />
                                )}
                                Upgrade to Starter (${annualBilling ? PLANS.starter.priceAnnual : PLANS.starter.priceMonthly}/mo)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Plan Comparison */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-white">Available Plans</h3>
                    {/* Annual / Monthly Toggle */}
                    <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${!annualBilling ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
                        <button
                            onClick={() => setAnnualBilling(v => !v)}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${annualBilling ? 'bg-primary' : 'bg-slate-700'}`}
                            aria-label="Toggle annual billing"
                        >
                            <span
                                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${annualBilling ? 'translate-x-6' : 'translate-x-0'}`}
                            />
                        </button>
                        <span className={`text-sm font-medium flex items-center gap-1.5 ${annualBilling ? 'text-white' : 'text-slate-500'}`}>
                            Annual
                            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-1.5 py-0.5 rounded">
                                Save 20%
                            </span>
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(PLANS).filter(([key]) => key !== 'free').map(([key, plan]) => {
                        const isCurrent = organization?.plan === key;
                        return (
                            <motion.div
                                key={key}
                                layout
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
                                <p className="text-2xl font-bold text-white mb-1">
                                    {getPrice(plan)}<span className="text-sm text-slate-500">/mo</span>
                                </p>
                                {annualBilling && plan.priceMonthly > 0 && (
                                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-2 flex-wrap">
                                        <span>Billed annually (${plan.priceAnnual * 12}/yr)</span>
                                        <span className="bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                                            Save ${(plan.priceMonthly - plan.priceAnnual) * 12}/yr
                                        </span>
                                    </p>
                                )}
                                <ul className="space-y-2 mb-5 mt-3">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="text-sm text-slate-400 flex items-center gap-2">
                                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                {!isCurrent && (
                                    <button
                                        onClick={() => handleUpgrade(plan, key)}
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
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
