import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, BarChart2, Brain, Zap, Globe, ShieldCheck, Target, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { BrandLockup } from '../components/branding/BrandLogo';

export interface SEOLandingPageConfig {
    /** <title> tag */
    pageTitle: string;
    /** meta description */
    metaDescription: string;
    /** Pill above the headline */
    eyebrow: string;
    /** H1 headline */
    headline: string;
    /** H1 accent (second line) */
    headlineAccent?: string;
    /** Sub-headline paragraph */
    subheadline: string;
    /** CTA label */
    ctaLabel: string;
    /** Hero bullet points */
    bullets: string[];
    /** Problem stat chips */
    stats: { value: string; label: string }[];
    /** Feature cards */
    features: { icon: React.ReactNode; title: string; desc: string }[];
    /** Social proof names */
    usedBy: string[];
    /** FAQ items */
    faq: { q: string; a: string }[];
}

const PAGE_CONFIGS: Record<string, SEOLandingPageConfig> = {
    agencies: {
        pageTitle: 'AI Visibility Platform for Agencies | GOATAEO',
        metaDescription: 'Give your clients AI visibility reports across ChatGPT, Gemini, Claude & Perplexity. White-label dashboards and bulk audits built for agencies.',
        eyebrow: 'For Agencies',
        headline: 'AI visibility audits',
        headlineAccent: 'your clients will actually pay for.',
        subheadline: 'White-label dashboards, bulk audits, and branded PDF reports. Turn AI visibility into a recurring service your team can deliver at scale.',
        ctaLabel: 'Start your agency trial',
        bullets: ['White-label reports with your logo', 'Multi-client dashboard', 'Bulk audit API for 500+ domains', 'Resell AI audits at any margin'],
        stats: [
            { value: '8', label: 'AI platforms tracked' },
            { value: '500', label: 'Audits / month (Agency)' },
            { value: '10', label: 'Team seats included' },
        ],
        features: [
            { icon: <BarChart2 className="w-6 h-6" />, title: 'Branded client reports', desc: 'Add your agency logo, custom colors, and hide GOATAEO branding in every PDF delivered to clients.' },
            { icon: <Users className="w-6 h-6" />, title: 'Multi-client management', desc: 'Manage unlimited client domains from one dashboard. Separate workspaces for each client with team-level access.' },
            { icon: <Zap className="w-6 h-6" />, title: 'Bulk audit API', desc: 'Automate audits across your entire book of business. REST API with SHA-256 authentication for seamless integration.' },
            { icon: <Brain className="w-6 h-6" />, title: 'Scheduled recurring audits', desc: 'Set weekly or monthly auto-audits per client. Results arrive in your dashboard automatically — nothing to remember.' },
            { icon: <ShieldCheck className="w-6 h-6" />, title: 'Schema & technical audit', desc: 'Detect missing structured data, weak entity signals, and technical issues your clients can action immediately.' },
            { icon: <Target className="w-6 h-6" />, title: 'Competitor benchmarking', desc: 'Show clients exactly how they compare to competitors across 8 AI platforms — the report that sells itself.' },
        ],
        usedBy: ['Growth Agencies', 'Content Studios', 'SEO Consultancies', 'Digital PR Firms'],
        faq: [
            { q: 'Can I white-label the reports?', a: 'Yes. Agency plan includes full white-label support — add your logo, custom colors, and hide GOATAEO branding from all PDF reports and client dashboards.' },
            { q: 'Is there a reseller program?', a: 'We offer custom agency pricing and reseller arrangements. Contact us at support@cognition-ai.com to discuss volume and margin arrangements.' },
            { q: 'How many clients can I manage?', a: 'The Agency plan includes unlimited domains and 10 team seats. You can manage all clients from a single dashboard with workspace isolation per client.' },
        ],
    },
    'b2b-saas': {
        pageTitle: 'AI Visibility for B2B SaaS Companies | GOATAEO',
        metaDescription: 'Know how ChatGPT, Gemini & Perplexity describe your SaaS product to buyers. Audit your AI visibility and fix gaps before competitors do.',
        eyebrow: 'For B2B SaaS',
        headline: 'Stop guessing what AI says',
        headlineAccent: 'about your product to buyers.',
        subheadline: "When a prospect asks ChatGPT for tools in your category, are you mentioned? GOATAEO tells you exactly where you stand — and what to fix to get cited first.",
        ctaLabel: 'Audit your product for free',
        bullets: ['See your rank across 8 AI platforms', 'Page-level citation gap analysis', 'Content rewrite simulator', 'Compare against direct competitors'],
        stats: [
            { value: '73%', label: 'of buyers use AI before a demo' },
            { value: '8', label: 'AI platforms tracked' },
            { value: '3', label: 'Free audits included' },
        ],
        features: [
            { icon: <Brain className="w-6 h-6" />, title: 'Semantic entity analysis', desc: "Understand how LLMs categorize your product, what they associate it with, and what gaps in your content reduce citation confidence." },
            { icon: <BarChart2 className="w-6 h-6" />, title: 'Multi-platform scoring', desc: 'Score your SaaS across ChatGPT, Gemini, Claude, Perplexity, Copilot, and more. Per-platform breakdowns show exactly where you need work.' },
            { icon: <Zap className="w-6 h-6" />, title: 'Content rewrite simulator', desc: 'Preview the impact of content changes before publishing. Vector-math engine predicts how rewrites shift your AI visibility score.' },
            { icon: <Target className="w-6 h-6" />, title: 'Competitor gap analysis', desc: "See which competitor pages are being cited that yours aren't. Understand the content signals making the difference." },
            { icon: <Globe className="w-6 h-6" />, title: 'Automated site crawl', desc: 'Smart discovery maps your pricing, features, docs, and blog — the pages most likely to shape AI recommendations.' },
            { icon: <ShieldCheck className="w-6 h-6" />, title: 'Schema & structured data', desc: 'Generate JSON-LD schema for your product pages that AI systems use to extract and verify entity information.' },
        ],
        usedBy: ['Product-Led SaaS', 'PLG Startups', 'B2B Platforms', 'Vertical SaaS'],
        faq: [
            { q: 'How does this help our pipeline?', a: 'AI assistants are increasingly the first step in B2B research. Improving your AI visibility means more brand awareness when buyers ask tools like ChatGPT or Perplexity for product recommendations.' },
            { q: 'Do I need technical knowledge?', a: 'No. GOATAEO handles all the crawling and analysis. You get a plain-language report with specific content and schema improvements your team can ship.' },
            { q: 'How is this different from traditional SEO?', a: 'SEO targets Google rankings. GOATAEO targets LLM citation probability — a separate signal set that includes entity clarity, quotability, and brand consistency that Google tools do not measure.' },
        ],
    },
    aeo: {
        pageTitle: 'Answer Engine Optimization (AEO) Tool | GOATAEO',
        metaDescription: 'The #1 AEO platform to optimize your content for ChatGPT, Gemini, Claude & Perplexity citations. Measure and improve AI citation probability at the page level.',
        eyebrow: 'Answer Engine Optimization',
        headline: 'Optimize your content',
        headlineAccent: 'to be cited by AI assistants.',
        subheadline: 'AEO is the practice of structuring your content so AI search engines confidently cite and recommend your brand. GOATAEO is the only tool purpose-built for it.',
        ctaLabel: 'Start your AEO audit',
        bullets: ['Quote likelihood score per page', 'Semantic gap analysis', 'AI-generated content rewrites', 'JSON-LD schema generation'],
        stats: [
            { value: '62%', label: 'of AI citations come from schema-marked pages' },
            { value: '8', label: 'AI platforms tracked' },
            { value: '25+', label: 'Pages analyzed per audit (Pro)' },
        ],
        features: [
            { icon: <Target className="w-6 h-6" />, title: 'Quote likelihood scoring', desc: 'Every page gets a 0–100 score predicting how likely an AI assistant will quote or cite it. Ranked so you know where to focus first.' },
            { icon: <Brain className="w-6 h-6" />, title: 'Entity clarity analysis', desc: 'AI systems look for clear entity signals — what your brand is, what it does, what evidence backs the claims. We surface exactly what is missing.' },
            { icon: <Zap className="w-6 h-6" />, title: 'AEO content rewriter', desc: 'Generate AEO-optimized rewrites of weak paragraphs. Simulates the score improvement so you only ship changes that actually move the needle.' },
            { icon: <ShieldCheck className="w-6 h-6" />, title: 'Schema markup generation', desc: 'Automatically generate copy-ready JSON-LD schema for every page type — Article, FAQPage, Organization, Product, BreadcrumbList, and more.' },
            { icon: <BarChart2 className="w-6 h-6" />, title: 'Cross-platform AEO scores', desc: 'Different AI systems weight signals differently. Get per-platform AEO scores so you can prioritize changes that affect the platforms that matter most to you.' },
            { icon: <Globe className="w-6 h-6" />, title: 'Site-wide AEO audit', desc: 'Scan your entire site, identify the highest-AEO-impact pages, and get a ranked action list your content team can work from immediately.' },
        ],
        usedBy: ['Content Teams', 'SEO Managers', 'Digital Marketers', 'Growth Leads'],
        faq: [
            { q: 'What is Answer Engine Optimization?', a: 'AEO is the practice of optimizing your content to be cited and recommended by AI assistants like ChatGPT, Gemini, Claude, and Perplexity. It focuses on semantic clarity, entity confidence, and quotability rather than keyword density.' },
            { q: 'How is AEO different from SEO?', a: 'SEO optimizes for Google click-through. AEO optimizes for AI citation probability. The signals are different — AEO requires structured entities, quotable claims, evidence density, and consistent brand language across your site.' },
            { q: 'How quickly can I see results?', a: 'Content improvements can affect AI citations within days to weeks depending on how frequently AI systems refresh their knowledge. Schema changes tend to have faster impact than prose rewrites.' },
        ],
    },
    geo: {
        pageTitle: 'Generative Engine Optimization (GEO) Platform | GOATAEO',
        metaDescription: 'GEO platform to optimize your brand for generative AI search. Track how Gemini, ChatGPT, and Perplexity answer queries about your brand and improve your AI presence.',
        eyebrow: 'Generative Engine Optimization',
        headline: 'Rank in AI-generated answers,',
        headlineAccent: 'not just blue links.',
        subheadline: 'GEO is the future of search visibility. GOATAEO measures and improves how generative AI engines describe your brand — and gives you page-level actions to improve it.',
        ctaLabel: 'Start GEO audit',
        bullets: ['GEO score per page + platform', 'Topical dominance analysis', 'Consistency audit across AI models', 'Benchmark against competitors'],
        stats: [
            { value: '60%+', label: 'of searches will be AI-answered by 2026' },
            { value: '8', label: 'Generative AI engines tracked' },
            { value: '100', label: 'Audits / month (Pro plan)' },
        ],
        features: [
            { icon: <Brain className="w-6 h-6" />, title: 'GEO score per platform', desc: 'Separate GEO scores for ChatGPT, Gemini, Perplexity, and others. Each platform weighs brand signals differently — know where you win and where you are weak.' },
            { icon: <BarChart2 className="w-6 h-6" />, title: 'Topical dominance map', desc: 'Discover which topics your brand owns in AI responses and which you are losing to competitors — a strategic map for your content team.' },
            { icon: <ShieldCheck className="w-6 h-6" />, title: 'Brand consistency audit', desc: 'Generative AI builds brand models from all your content. Inconsistencies reduce confidence and citation frequency. We surface every mismatch.' },
            { icon: <Target className="w-6 h-6" />, title: 'Competitor GEO benchmark', desc: 'Side-by-side GEO comparison against your top competitors. See the gap and the specific content strategies closing it.' },
            { icon: <Zap className="w-6 h-6" />, title: 'GEO content optimization', desc: 'AI-generated content improvements targeted at GEO signals: authority markers, evidence density, topical completeness, and entity linking.' },
            { icon: <Globe className="w-6 h-6" />, title: 'Weekly GEO tracking', desc: 'Schedule weekly GEO audits to track how your scores change as you publish new content. Trend data shows what is working over time.' },
        ],
        usedBy: ['Brand Teams', 'Content Strategists', 'CMOs', 'SEO Directors'],
        faq: [
            { q: 'What is Generative Engine Optimization?', a: 'GEO is the practice of optimizing your online presence so generative AI systems (like ChatGPT, Gemini, and Perplexity) accurately, confidently, and favorably describe your brand in their responses to user queries.' },
            { q: 'Is GEO just AEO with a different name?', a: 'They overlap but differ. AEO focuses on citation probability for specific queries. GEO is broader — optimizing how AI engines model and represent your entire brand, topical authority, and market positioning.' },
            { q: 'How do I get started with GEO?', a: 'Start with a GOATAEO audit of your main domain. You will get a GEO score per page and platform, a topical dominance map, and a prioritized list of improvements your team can ship this sprint.' },
        ],
    },
};

interface FAQItemProps { q: string; a: string }
function FAQItem({ q, a }: FAQItemProps) {
    const [open, setOpen] = React.useState(false);
    return (
        <div className="border border-blue-100 rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-blue-50 transition-colors"
            >
                <span className="text-slate-800 font-semibold text-sm pr-4">{q}</span>
                <span className={`text-blue-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {open && (
                <div className="px-5 py-4 text-sm text-slate-600 leading-relaxed border-t border-blue-50 bg-white">
                    {a}
                </div>
            )}
        </div>
    );
}

interface SEOLandingPageProps {
    slug: keyof typeof PAGE_CONFIGS;
}

export const SEOLandingPage: React.FC<SEOLandingPageProps> = ({ slug }) => {
    const config = PAGE_CONFIGS[slug];

    if (!config) return null;

    return (
        <div className="bg-white w-full">
            {/* Nav */}
            <nav className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-xl border-b border-blue-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link to="/">
                        <BrandLockup showTagline={false} />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link to="/login">
                            <Button variant="ghost" className="px-4 text-slate-600 hover:text-slate-900">Sign in</Button>
                        </Link>
                        <Link to="/signup">
                            <Button variant="cta">
                                {config.ctaLabel} <ArrowRight className="w-4 h-4 ml-1.5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <header className="bg-white border-b border-blue-100">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-blue-700 mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {config.eyebrow}
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800 leading-tight tracking-tight">
                            {config.headline}
                            {config.headlineAccent && (
                                <span className="block text-blue-600">{config.headlineAccent}</span>
                            )}
                        </h1>
                        <p className="mt-5 max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed">
                            {config.subheadline}
                        </p>

                        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                            <Link to="/signup">
                                <Button variant="cta" size="lg">
                                    {config.ctaLabel} <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                            <Link to="/">
                                <Button variant="secondary" size="lg" className="border-blue-200 text-slate-700">
                                    See how it works
                                </Button>
                            </Link>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 justify-center">
                            {config.bullets.map(b => (
                                <div key={b} className="flex items-center gap-1.5 text-sm text-slate-600">
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    {b}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </header>

            {/* Stats */}
            <section className="bg-blue-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                    <div className="grid grid-cols-3 gap-8 text-center">
                        {config.stats.map(stat => (
                            <div key={stat.label}>
                                <p className="text-3xl sm:text-4xl font-bold text-white">{stat.value}</p>
                                <p className="text-blue-200 text-sm mt-1 font-medium">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 sm:py-24 bg-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-12">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">Features</p>
                        <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-800">Everything you need</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {config.features.map(f => (
                            <motion.div
                                key={f.title}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4 }}
                                className="group p-6 bg-white border border-blue-100 rounded-2xl hover:border-blue-300 hover:shadow-[0_8px_30px_rgba(37,99,235,0.10)] transition-all"
                            >
                                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-105 transition-transform">
                                    {f.icon}
                                </div>
                                <h3 className="font-bold text-slate-800 mb-1.5">{f.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Used by */}
            <section className="py-12 bg-blue-50 border-y border-blue-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-500 mb-6">Used by teams at</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {config.usedBy.map(name => (
                            <span key={name} className="px-4 py-2 bg-white border border-blue-100 rounded-full text-sm font-semibold text-slate-600">
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 sm:py-24 bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-10">
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600 mb-3">FAQ</p>
                        <h2 className="text-3xl font-bold text-slate-800">Common questions</h2>
                    </div>
                    <div className="space-y-3">
                        {config.faq.map(item => (
                            <FAQItem key={item.q} q={item.q} a={item.a} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-16 sm:py-24 bg-blue-600">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Ready to improve your AI visibility?
                    </h2>
                    <p className="text-blue-100 mb-8 text-lg">3 free audits. No credit card. Results in minutes.</p>
                    <Link to="/signup">
                        <Button variant="cta" size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                            {config.ctaLabel} <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-blue-100 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-400 font-semibold">© {new Date().getFullYear()} GOATAEO. All rights reserved.</p>
                    <div className="flex gap-5 text-xs font-semibold text-slate-500">
                        <Link to="/terms" className="hover:text-slate-800">Terms</Link>
                        <Link to="/privacy" className="hover:text-slate-800">Privacy</Link>
                        <Link to="/help" className="hover:text-slate-800">Help</Link>
                        <Link to="/" className="hover:text-slate-800">Home</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Named exports for each page
export const AgenciesPage: React.FC = () => <SEOLandingPage slug="agencies" />;
export const B2BSaaSPage: React.FC = () => <SEOLandingPage slug="b2b-saas" />;
export const AEOPage: React.FC = () => <SEOLandingPage slug="aeo" />;
export const GEOPage: React.FC = () => <SEOLandingPage slug="geo" />;
