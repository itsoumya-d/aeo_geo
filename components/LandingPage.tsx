import React from 'react';
import { InputLayer } from './InputLayer';
import { Asset } from '../types';
import { supabase } from '../services/supabase';
import { Shield, Zap, Search, Globe, ChevronRight, Cpu, Lock, Check, AlertTriangle } from 'lucide-react';

import { NotificationDropdown } from './NotificationDropdown';

interface LandingPageProps {
    onStartAnalysis: (assets: Asset[]) => void;
    isAnalyzing: boolean;
    statusMessage?: string;
    discoveredCount?: number;
    credits?: number | null;
    session?: any;
}

export const LandingPage: React.FC<LandingPageProps> = ({
    onStartAnalysis,
    isAnalyzing,
    statusMessage,
    discoveredCount,
    credits,
    session
}) => {
    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    };

    const isLowCredits = credits !== null && credits !== undefined && credits <= 2;
    const isOutOfCredits = credits !== null && credits !== undefined && credits <= 0;

    return (
        <div className="min-h-screen bg-[#0f172a] text-white overflow-hidden selection:bg-primary selection:text-white">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Low Credit Banner */}
            {session && isOutOfCredits && (
                <div className="relative z-20 bg-rose-500/10 border-b border-rose-500/30 px-6 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span className="text-rose-300">You've run out of audit credits.</span>
                        <a href="/settings?tab=billing" className="text-rose-400 hover:text-white font-medium underline underline-offset-2">
                            Upgrade now →
                        </a>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Cpu className="text-white w-5 h-5" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">Cognition AI</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
                    <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                    <a href="/help" className="hover:text-white transition-colors">Help</a>
                </div>
                <div className="flex items-center gap-4">
                    {session ? (
                        <>
                            <NotificationDropdown />
                            <div className="w-px h-6 bg-slate-800 mx-1 hidden md:block" />
                            <a
                                href="/settings?tab=billing"
                                className={`px-3 py-1 rounded-full border text-xs font-mono transition-colors ${isOutOfCredits
                                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30'
                                    : isLowCredits
                                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                                        : 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700'
                                    }`}
                            >
                                {credits !== null ? `${credits} Credits` : 'Loading...'}
                            </a>
                            <a href="/history" className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden md:inline">
                                History
                            </a>
                            <a href="/settings" className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden md:inline">
                                Settings
                            </a>
                            <span className="text-sm font-medium text-slate-300 hidden md:inline">{session.user.email}</span>
                        </>
                    ) : (
                        <>
                            <button onClick={handleLogin} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Log In</button>
                            <button onClick={handleLogin} className="text-sm font-medium bg-white text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                                Get Started
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 text-center pt-24 pb-12 px-6">
                <div className="max-w-4xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
                        <Zap className="w-3 h-3" />
                        <span>Now with Real-Time Crawling</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-bold mb-8 tracking-tight leading-[1.1] font-display">
                        The AI Visibility <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Command Center.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-light">
                        Stop guessing how LLMs see your brand. <strong>Cognition</strong> reverse-engineers the vector space of ChatGPT, Gemini, and Claude to ensure your business is cited, not hallucinated.
                    </p>

                    {/* Input Layer embedded as the primary CTA */}
                    <div className="transform hover:scale-[1.01] transition-transform duration-500">
                        <InputLayer
                            onStartAnalysis={onStartAnalysis}
                            isAnalyzing={isAnalyzing}
                            statusMessage={statusMessage}
                            discoveredCount={discoveredCount}
                            embedded={true} // New prop to style it for landing page
                        />
                    </div>
                </div>

                {/* Social Proof */}
                <div className="mt-16 pt-8 border-t border-white/5 max-w-5xl mx-auto">
                    <p className="text-sm text-slate-500 font-medium mb-6">POWERED BY NEXT-GEN INFRASTRUCTURE</p>
                    <div className="flex flex-wrap justify-center items-center gap-12 text-slate-600 grayscale opacity-70 hover:opacity-100 transition-opacity">
                        {/* Simple text logos for now */}
                        <span className="flex items-center gap-2 font-semibold text-lg"><Globe className="w-5 h-5" /> Google Gemini</span>
                        <span className="flex items-center gap-2 font-semibold text-lg"><Shield className="w-5 h-5" /> Supabase</span>
                        <span className="flex items-center gap-2 font-semibold text-lg"><Zap className="w-5 h-5" /> Firecrawl</span>
                    </div>
                </div>
            </main>

            {/* Features Grid */}
            <section id="features" className="relative z-10 py-24 bg-slate-900/50 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Why Global Brands Trust Cognition</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Globe className="text-blue-400" />}
                            title="Real-Time Crawling"
                            desc="We don't simulate. We fetch your live HTML, parse it into clean Markdown, and feed it directly into the context window of advanced LLMs."
                        />
                        <FeatureCard
                            icon={<Search className="text-purple-400" />}
                            title="Vector Space Analysis"
                            desc="Keywords are outdated. We analyze the 'Vector Distance' between your brand's content and the user's intent to ensure you show up in RAG responses."
                        />
                        <FeatureCard
                            icon={<Lock className="text-pink-400" />}
                            title="Entity Protection"
                            desc="Ensure LLMs recognize your founders, pricing, and locations as Facts, not Hallucinations. Retrieve precise JSON-LD schema fixes."
                        />
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="relative z-10 py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
                    <p className="text-slate-400 mb-16 max-w-2xl mx-auto">Start free, then scale as you grow. All plans include real-time crawling and multi-platform AI analysis.</p>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <PricingCard
                            title="Starter"
                            price="$49"
                            features={['50 AI Audits / mo', 'PDF Reports', 'Email Support', '500 Rewrite Sims']}
                            buttonText="Start Free Trial"
                            priceId={import.meta.env.VITE_STRIPE_STARTER_PRICE_ID || ''}
                            recommended={false}
                        />
                        <PricingCard
                            title="Professional"
                            price="$149"
                            features={['200 AI Audits / mo', 'Vector Rewrite Tool', 'Priority Support', 'API Access']}
                            buttonText="Get Professional"
                            priceId={import.meta.env.VITE_STRIPE_PRO_PRICE_ID || ''}
                            recommended={true}
                        />
                        <PricingCard
                            title="Agency"
                            price="$399"
                            features={['1000 Audits / mo', 'White-Label Reports', 'Dedicated Account Mgr', 'SSO & Teams']}
                            buttonText="Contact Sales"
                            priceId={import.meta.env.VITE_STRIPE_AGENCY_PRICE_ID || ''}
                            recommended={false}
                        />
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="relative z-10 py-24 border-t border-white/5">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Frequently Asked Questions</h2>
                    <div className="space-y-6">
                        <FAQItem
                            question="How is this different from traditional SEO tools?"
                            answer="Traditional SEO tools like Ahrefs and Semrush focus on Google search rankings. Cognition specifically optimizes for AI search engines—ChatGPT, Gemini, Claude, and Perplexity—which use different algorithms based on semantic understanding rather than backlinks."
                        />
                        <FAQItem
                            question="What platforms do you analyze visibility for?"
                            answer="We analyze your brand's presence across ChatGPT, Google Gemini, Claude, and Perplexity. Each platform has different citation behaviors, and we score your visibility on each one separately."
                        />
                        <FAQItem
                            question="How does the real-time crawling work?"
                            answer="We fetch your actual website HTML, parse your sitemap.xml, and convert your content into clean markdown that we then analyze using embeddings. This gives us the same view that AI models have when they read your site."
                        />
                        <FAQItem
                            question="What's included in the free plan?"
                            answer="The free plan includes 5 AI audits per month and 50 rewrite simulations. This is enough to analyze your main pages and test content improvements before committing to a paid plan."
                        />
                        <FAQItem
                            question="Can I cancel anytime?"
                            answer="Yes! All plans are month-to-month with no long-term commitment. You can upgrade, downgrade, or cancel anytime from your dashboard."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-12 border-t border-white/5 text-center text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Cognition AI Visibility Engine. All rights reserved.</p>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-white/10 transition-all group">
        <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })}
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
        <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
);

const PricingCard = ({ title, price, features, buttonText, priceId, recommended }: { title: string, price: string, features: string[], buttonText: string, priceId: string, recommended: boolean }) => {
    const handleSubscribe = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Please log in to subscribe.");
                return;
            }

            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    priceId,
                    successUrl: window.location.origin + '/dashboard?session_id={CHECKOUT_SESSION_ID}',
                    cancelUrl: window.location.origin + '/'
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            console.error("Checkout Error:", error);
            alert("Failed to start checkout: " + error.message);
        }
    };

    return (
        <div className={`relative p-8 rounded-2xl border flex flex-col ${recommended ? 'bg-slate-800/80 border-blue-500 shadow-2xl shadow-blue-500/20' : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'} transition-all`}>
            {recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                    Most Popular
                </div>
            )}
            <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
            <div className="flex items-baseline justify-center gap-1 mb-6">
                <span className="text-4xl font-bold text-white">{price}</span>
                <span className="text-slate-500">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 text-left flex-grow">
                {features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span>{feat}</span>
                    </li>
                ))}
            </ul>
            <button
                onClick={handleSubscribe}
                className={`w-full py-4 rounded-xl font-bold transition-all ${recommended
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-500/25'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
            >
                {buttonText}
            </button>
        </div>
    );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="border border-slate-800 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-800/50 transition-colors"
            >
                <span className="font-medium text-white">{question}</span>
                <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="px-6 pb-4 text-slate-400 text-sm leading-relaxed">
                    {answer}
                </div>
            )}
        </div>
    );
};
