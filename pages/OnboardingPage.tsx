import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Globe, ArrowRight, Loader2, CheckCircle, Sparkles } from 'lucide-react';

type OnboardingStep = 'organization' | 'domain' | 'complete';

interface OnboardingPageProps {
    onComplete?: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
    const { user, createOrg, organization } = useAuth();

    const [step, setStep] = useState<OnboardingStep>(organization ? 'domain' : 'organization');
    const [orgName, setOrgName] = useState('');
    const [domainUrl, setDomainUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // If already has organization, skip to domain or complete
    React.useEffect(() => {
        if (organization) {
            setStep('domain');
        }
    }, [organization]);

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgName.trim()) {
            setError('Please enter your company or project name');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const org = await createOrg(orgName.trim());
            if (org) {
                setStep('domain');
            } else {
                setError('Failed to create organization. Please try again.');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        // For now, just move to complete step
        // In production, this would call an API to add the domain
        setStep('complete');
    };

    const handleComplete = () => {
        if (onComplete) {
            onComplete();
        } else {
            // Redirect to main app
            window.location.href = '/app';
        }
    };

    const steps = [
        { id: 'organization', label: 'Create Organization', number: 1 },
        { id: 'domain', label: 'Add Domain', number: 2 },
        { id: 'complete', label: 'Ready to Go', number: 3 },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === step);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-xl">
                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-12">
                    {steps.map((s, index) => (
                        <React.Fragment key={s.id}>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                    transition-all duration-300
                    ${index < currentStepIndex
                                            ? 'bg-primary text-white'
                                            : index === currentStepIndex
                                                ? 'bg-primary/20 border-2 border-primary text-primary'
                                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                                        }
                  `}
                                >
                                    {index < currentStepIndex ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : (
                                        s.number
                                    )}
                                </div>
                                <span className={`
                  mt-2 text-xs font-medium
                  ${index <= currentStepIndex ? 'text-white' : 'text-slate-500'}
                `}>
                                    {s.label}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`
                  w-16 h-0.5 mx-2 mb-6
                  ${index < currentStepIndex ? 'bg-primary' : 'bg-slate-700'}
                `} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step Content */}
                <div className="bg-surface border border-slate-700 rounded-2xl p-8 shadow-2xl">
                    {/* Organization Step */}
                    {step === 'organization' && (
                        <div className="animate-in fade-in duration-500">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                                    <Building2 className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    Welcome, {user?.email?.split('@')[0]}!
                                </h2>
                                <p className="text-slate-400">
                                    Let's set up your organization to get started with AI visibility audits.
                                </p>
                            </div>

                            <form onSubmit={handleCreateOrganization}>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Organization Name
                                    </label>
                                    <input
                                        type="text"
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        placeholder="Enter your company or project name"
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
                                        autoFocus
                                    />
                                    <p className="mt-2 text-xs text-slate-500">
                                        This will be your workspace name. You can change it later.
                                    </p>
                                </div>

                                {error && (
                                    <div className="mb-4 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            Continue <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Domain Step */}
                    {step === 'domain' && (
                        <div className="animate-in fade-in duration-500">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 mb-4">
                                    <Globe className="w-8 h-8 text-secondary" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    Add Your First Domain
                                </h2>
                                <p className="text-slate-400">
                                    Enter the website you want to audit for AI visibility.
                                </p>
                            </div>

                            <form onSubmit={handleAddDomain}>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Website URL
                                    </label>
                                    <input
                                        type="text"
                                        value={domainUrl}
                                        onChange={(e) => setDomainUrl(e.target.value)}
                                        placeholder="e.g. example.com"
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
                                        autoFocus
                                    />
                                    <p className="mt-2 text-xs text-slate-500">
                                        We'll analyze this domain for AI search visibility.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep('complete')}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
                                    >
                                        Skip for Now
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!domainUrl.trim()}
                                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        Continue <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Complete Step */}
                    {step === 'complete' && (
                        <div className="animate-in fade-in duration-500 text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-500 mb-6">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                You're All Set! 🎉
                            </h2>
                            <p className="text-slate-400 mb-8">
                                Your workspace is ready. Start your first AI visibility audit to see how your content performs in AI search engines.
                            </p>

                            <div className="bg-slate-900 rounded-xl p-6 mb-8 text-left">
                                <h3 className="text-sm font-semibold text-white mb-4">What you can do now:</h3>
                                <ul className="space-y-3 text-sm text-slate-400">
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                        <span>Run your first AI visibility audit</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                        <span>Simulate content rewrites and see real-time score changes</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                        <span>Get AI-optimized recommendations for each page</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={handleComplete}
                                className="w-full bg-gradient-to-r from-primary via-indigo-500 to-purple-600 hover:shadow-2xl hover:shadow-primary/30 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                Start Auditing <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Free Plan Note */}
                <p className="mt-6 text-center text-xs text-slate-500">
                    You're on the <span className="text-primary">Free Plan</span> with 5 audits & 50 simulations/month.{' '}
                    <a href="/pricing" className="text-primary hover:underline">Upgrade</a> for more.
                </p>
            </div>
        </div>
    );
};
