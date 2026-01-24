import React from 'react';
import { motion } from 'framer-motion';
import { InputLayer } from './InputLayer';
import { Asset } from '../types';
import { supabase } from '../services/supabase';
import { Shield, Zap, Search, Globe, ChevronRight, Cpu, Lock, Check, AlertTriangle, Play, Star, Quote, X } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { SlideUp, FadeIn, StaggerContainer } from './ui/Motion';

interface LandingPageProps {
    // No props needed for pure marketing page
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

    const [showVideo, setShowVideo] = React.useState(false);

    return (
        <div className="min-h-screen bg-background text-text-primary overflow-hidden selection:bg-primary/30 font-sans">
            {/* Skip to main content - WCAG 2.1 AA */}
            <a href="#audit-section" className="skip-to-content">
                Skip to main content
            </a>

            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
            </div>

            {/* Low Credit Banner */}
            {session && isOutOfCredits && (
                <div className="relative z-20 bg-red-900/20 border-b border-red-500/30 px-6 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-red-200">You've run out of audit credits.</span>
                        <a href="/settings?tab=billing" className="text-red-400 hover:text-white font-medium underline underline-offset-2">
                            Upgrade now →
                        </a>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <nav className="relative z-50 w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/10 backdrop-blur-md sticky top-0 bg-background/60 transition-all duration-300">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-9 h-9 bg-gradient-to-tr from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow duration-300">
                        <Cpu className="text-white w-5 h-5" />
                    </div>
                    <span className="font-display font-bold text-xl tracking-tight text-white group-hover:text-primary transition-colors">Cognition AI</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary/80">
                    <a href="#features" className="hover:text-white transition-colors hover:scale-105 transform duration-200">Features</a>
                    <a href="#how-it-works" className="hover:text-white transition-colors hover:scale-105 transform duration-200">How it Works</a>
                    <a href="#pricing" className="hover:text-white transition-colors hover:scale-105 transform duration-200">Pricing</a>
                    <a href="/help" className="hover:text-white transition-colors hover:scale-105 transform duration-200">Help</a>
                </div>
                <div className="flex items-center gap-4">
                    {session ? (
                        <>
                            <NotificationDropdown />
                            <div className="w-px h-6 bg-white/10 mx-1 hidden md:block" />
                            <a href="/settings?tab=billing">
                                <Badge variant={isOutOfCredits ? 'destructive' : isLowCredits ? 'warning' : 'secondary'} className="font-mono shadow-sm">
                                    {credits !== null ? `${credits} Credits` : 'Loading...'}
                                </Badge>
                            </a>
                            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/history'} className="hidden md:inline-flex text-text-secondary hover:text-white">
                                History
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/settings'} className="hidden md:inline-flex text-text-secondary hover:text-white">
                                Settings
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" size="sm" onClick={handleLogin} className="text-text-secondary hover:text-white">Log In</Button>
                            <Button size="sm" onClick={handleLogin} className="bg-primary hover:bg-primary-hover shadow-glow hover:shadow-glow-lg transition-all duration-300">
                                Get Started
                            </Button>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 text-center pt-32 pb-20 px-6 overflow-visible">
                <SlideUp className="max-w-5xl mx-auto mb-16 relative">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] -z-10 opacity-50 animate-pulse-slow" />

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surfaceHighlight/50 border border-white/10 text-primary text-xs font-bold uppercase tracking-widest mb-10 shadow-sm backdrop-blur-sm"
                    >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Now with Real-Time Vector Analysis</span>
                    </motion.div>

                    <h1 className="text-6xl md:text-8xl font-display font-bold mb-8 tracking-tight leading-[1.05] text-white drop-shadow-2xl">
                        The AI Visibility <br className="hidden md:block" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-secondary animate-gradient-x">Command Center.</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto mb-12 leading-relaxed font-light">
                        Stop guessing how LLMs see your brand. <strong>Cognition</strong> reverse-engineers the vector space of ChatGPT, Gemini, and Claude to ensure your business is <span className="text-white font-medium">cited, not hallucinated.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20 relative z-20">
                        <a href="/login">
                            <Button
                                className="w-full sm:w-auto px-10 py-6 text-lg font-bold rounded-2xl bg-white text-black hover:bg-slate-100 hover:text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] hover:scale-105 transition-all duration-300"
                            >
                                Get Started — Free
                            </Button>
                        </a>
                        <Button
                            onClick={() => setShowVideo(true)}
                            variant="secondary"
                            className="w-full sm:w-auto px-10 py-6 text-lg font-bold rounded-2xl flex items-center gap-3 backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
                        >
                            <Play className="w-5 h-5 fill-current group-hover:text-primary transition-colors" />
                            Watch 90s Demo
                        </Button>
                    </div>
                </SlideUp>

                {/* Social Proof */}

            </main>

            {/* Video Modal */}
            {showVideo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300">
                    <button onClick={() => setShowVideo(false)} className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors group">
                        <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                    <div className="w-full max-w-6xl aspect-video bg-black rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl shadow-primary/20 relative group scale-95 animate-in zoom-in-95 duration-300">
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <Zap className="w-20 h-20 text-primary animate-pulse mb-8 drop-shadow-glow" />
                            <h3 className="text-3xl font-bold text-white px-10 text-center leading-tight">
                                Generating Cinematic <br />Product Walkthrough...
                            </h3>
                            <p className="text-text-secondary mt-6 text-sm font-bold uppercase tracking-widest">AEO Command Center in Action</p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-purple-500/10 opacity-30 group-hover:opacity-50 transition-opacity" />
                    </div>
                </div>
            )}

            {/* Social Proof Section (Wall of Love) */}
            <section id="social-proof" className="relative z-10 py-32 overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />

                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-24 space-y-6">
                        <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em] bg-primary/10 inline-block px-4 py-2 rounded-full border border-primary/20">Wall of Love</h2>
                        <h3 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-white">Trusted by high-growth startups.</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { name: "Sarah Miller", role: "VP of SEO @ FinTech Nova", text: "Cognition changed our entire content strategy. We saw a 40% increase in ChatGPT citations within 30 days. Absolute game changer.", color: "from-blue-500/10" },
                            { name: "Mark Chen", role: "CEO @ Quantum Agency", text: "The vector distance analysis is something no other tool on the market provides. It's the difference between being guessed and being known.", color: "from-purple-500/10" },
                            { name: "Emily Watson", role: "Content Lead @ ShopStream", text: "Finally, a way to prove that our AI optimization actually works. The real-time crawling is flawless.", color: "from-cyan-500/10" },
                            { name: "David Kim", role: "Digital Strategy @ AutoLink", text: "The A/B Sandbox alone is worth the subscription. We can test how AI reacts to copy changes before going live.", color: "from-blue-500/10" },
                            { name: "Jessica Low", role: "Founder @ Scribe AI", text: "Enterprise-grade features at a fraction of the cost. The Slack integration keeps our whole team in the loop.", color: "from-emerald-500/10" },
                            { name: "Alex Rivera", role: "SEO Consultant", text: "I recommend Cognition to all my clients who care about the next era of search. It's the only tool that actually understands AEO.", color: "from-rose-500/10" }
                        ].map((t, i) => (
                            <Card key={i} variant="glass" className={`rounded-[2rem] border-white/5 hover:border-primary/30 bg-gradient-to-br ${t.color} to-white/[0.02] hover:-translate-y-2 transition-all duration-500 p-8`}>
                                <div className="space-y-6">
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3.5 h-3.5 text-cta fill-cta drop-shadow-sm" />)}
                                    </div>
                                    <p className="text-slate-200 text-lg font-medium leading-[1.6]">"{t.text}"</p>
                                </div>
                                <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white/50 text-sm">
                                            {t.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-sm">{t.name}</div>
                                            <div className="text-text-muted text-[10px] font-bold uppercase tracking-widest mt-0.5">{t.role}</div>
                                        </div>
                                    </div>
                                    <Quote className="w-8 h-8 text-white/5 group-hover:text-primary/20 transition-colors" />
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="relative z-10 py-32 bg-surface/30 border-t border-white/5 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6">
                    <FadeIn>
                        <h2 className="text-3xl md:text-5xl font-display font-bold text-center mb-20 text-white">Why Global Brands <br /> <span className="text-gradient">Trust Cognition</span></h2>
                    </FadeIn>
                    <StaggerContainer className="grid md:grid-cols-3 gap-8">
                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                            <FeatureCard
                                icon={<Globe className="text-blue-400" />}
                                title="Real-Time Crawling"
                                desc="We don't simulate. We fetch your live HTML, parse it into clean Markdown, and feed it directly into the context window of advanced LLMs."
                            />
                        </motion.div>
                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                            <FeatureCard
                                icon={<Search className="text-purple-400" />}
                                title="Vector Space Analysis"
                                desc="Keywords are outdated. We analyze the 'Vector Distance' between your brand's content and the user's intent to ensure you show up in RAG responses."
                            />
                        </motion.div>
                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                            <FeatureCard
                                icon={<Lock className="text-pink-400" />}
                                title="Entity Protection"
                                desc="Ensure LLMs recognize your founders, pricing, and locations as Facts, not Hallucinations. Retrieve precise JSON-LD schema fixes."
                            />
                        </motion.div>
                    </StaggerContainer>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="relative z-10 py-32 border-t border-white/5 bg-gradient-to-b from-transparent to-black/20">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h2 className="text-sm font-black text-secondary uppercase tracking-[0.3em] mb-4">Pricing</h2>
                    <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-white">Simple, Transparent Pricing</h2>
                    <p className="text-text-secondary mb-20 max-w-2xl mx-auto text-xl">Start free, then scale as you grow. All plans include real-time crawling and multi-platform AI analysis.</p>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
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
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-16 text-white">Frequently Asked Questions</h2>
                    <div className="space-y-4">
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
            <footer className="relative z-10 py-24 border-t border-white/5 bg-black/40 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-left mb-16">
                        <div className="space-y-6 col-span-1 md:col-span-1">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-tr from-primary to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                                    <Cpu className="text-white w-5 h-5" />
                                </div>
                                <span className="font-display font-bold text-xl tracking-tight text-white">Cognition AI</span>
                            </div>
                            <p className="text-text-secondary text-sm leading-relaxed font-medium">
                                The world's first industrial-grade engine for Answer Engine Optimization. Synchronizing brands with the next generation of search.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6">Product</h4>
                            <ul className="space-y-4 text-sm font-bold text-text-muted">
                                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Enterprise Pricing</a></li>
                                <li><a href="/docs" className="hover:text-white transition-colors">API Docs</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6">Resources</h4>
                            <ul className="space-y-4 text-sm font-bold text-text-muted">
                                <li><a href="/blog" className="hover:text-white transition-colors">AEO Strategy Blog</a></li>
                                <li><a href="/help" className="hover:text-white transition-colors">Help Center</a></li>
                                <li><a href="/privacy" className="hover:text-white transition-colors">Security & Trust</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6">Newsletter</h4>
                            <p className="text-text-muted text-xs font-bold mb-4 uppercase tracking-tighter">Get the Weekly AI Visibility report.</p>
                            <div className="relative">
                                <input type="email" placeholder="email@company.com" className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors" />
                                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-white transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <Card className="p-8 border-white/5 bg-surface/50 hover:bg-surface hover:border-primary/30 transition-all group">
        <div className="w-12 h-12 rounded-xl bg-surface border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-transform">
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })}
        </div>
        <h3 className="text-xl font-bold text-white mb-3 font-display">{title}</h3>
        <p className="text-text-secondary leading-relaxed font-sans">{desc}</p>
    </Card>
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
        <Card variant={recommended ? 'glass' : 'default'} className={`relative p-8 flex flex-col ${recommended ? 'border-primary shadow-glow' : 'bg-surface/50'} transition-all hover:-translate-y-2`}>
            {recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                    Most Popular
                </div>
            )}
            <h3 className="text-lg font-medium text-text-secondary mb-2">{title}</h3>
            <div className="flex items-baseline justify-center gap-1 mb-6">
                <span className="text-4xl font-bold text-white font-display">{price}</span>
                <span className="text-slate-500">/mo</span>
            </div>
            <ul className="space-y-4 mb-8 text-left flex-grow">
                {features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                        <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span>{feat}</span>
                    </li>
                ))}
            </ul>
            <Button
                onClick={handleSubscribe}
                variant={recommended ? 'primary' : 'secondary'}
                className="w-full py-6 text-lg"
            >
                {buttonText}
            </Button>
        </Card>
    );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
    return (
        <details className="group border border-white/5 bg-surface/30 rounded-xl overflow-hidden hover:bg-surface/50 transition-colors">
            <summary className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span className="font-medium text-white text-lg">{question}</span>
                <ChevronRight className="w-5 h-5 text-text-secondary transition-transform duration-200 group-open:rotate-90" />
            </summary>
            <div className="px-6 pb-6 text-text-secondary leading-relaxed border-t border-white/5 pt-4">
                {answer}
            </div>
        </details>
    );
};
