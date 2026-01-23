import React, { useState } from 'react';
import {
    HelpCircle, Book, MessageCircle, ChevronDown, ChevronUp,
    Zap, Shield, CreditCard, Users, Key, Clock, Search,
    ExternalLink, Mail
} from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

const FAQ_ITEMS: FAQItem[] = [
    {
        category: 'Getting Started',
        question: 'What is AI Visibility and why does it matter?',
        answer: 'AI Visibility measures how prominently your brand appears in AI-generated answers from ChatGPT, Gemini, Claude, and Perplexity. As more users rely on AI for information, brands invisible to AI lose significant traffic and credibility.'
    },
    {
        category: 'Getting Started',
        question: 'How does Cognition analyze my website?',
        answer: 'We crawl your website using Firecrawl technology, extract your content, and use Gemini 2.0 to simulate how AI search engines perceive your brand. We analyze topical authority, citation likelihood, and semantic alignment.'
    },
    {
        category: 'Getting Started',
        question: 'What does the visibility score mean?',
        answer: 'Your visibility score (0-100) represents how likely AI systems are to reference your content. Scores above 70 indicate strong AI presence, 50-70 needs improvement, and below 50 means you\'re largely invisible to AI.'
    },
    {
        category: 'Audits',
        question: 'How many pages do you crawl per audit?',
        answer: 'Free plans crawl up to 3 pages, Pro plans up to 10 pages, and Agency plans have unlimited page crawling. We prioritize your homepage, about page, and key product/service pages.'
    },
    {
        category: 'Audits',
        question: 'How often should I run an audit?',
        answer: 'We recommend running audits monthly at minimum. With scheduled audits on Pro/Agency plans, you can automate weekly or even daily checks to track improvements over time.'
    },
    {
        category: 'Billing',
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, Mastercard, American Express) through Stripe. Enterprise customers can request invoice billing.'
    },
    {
        category: 'Billing',
        question: 'Can I upgrade or downgrade my plan?',
        answer: 'Yes! You can change your plan anytime from Settings → Billing. Upgrades are prorated, and downgrades take effect at the next billing cycle.'
    },
    {
        category: 'Teams',
        question: 'How do team permissions work?',
        answer: 'Owners have full access, Admins can manage members and billing, and Members can run audits and view reports. All team members share the organization\'s audit credits.'
    },
    {
        category: 'API',
        question: 'Is there an API available?',
        answer: 'Yes! Pro and Agency plans include API access. You can generate API keys from Settings → API and integrate Cognition audits into your own workflows.'
    },
    {
        category: 'Security',
        question: 'How do you handle my data?',
        answer: 'We only analyze publicly accessible pages. Your data is encrypted in transit and at rest. We never share or sell your data. API keys are stored as SHA-256 hashes.'
    },
];

const CATEGORIES = ['Getting Started', 'Audits', 'Billing', 'Teams', 'API', 'Security'];

const FAQAccordion: React.FC<{ item: FAQItem; isOpen: boolean; onToggle: () => void }> = ({
    item, isOpen, onToggle
}) => (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
        >
            <span className="font-medium text-white">{item.question}</span>
            {isOpen ? (
                <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
            ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
            )}
        </button>
        {isOpen && (
            <div className="px-4 pb-4 text-slate-400 text-sm leading-relaxed animate-in fade-in duration-200">
                {item.answer}
            </div>
        )}
    </div>
);

export const HelpCenter: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [openFAQ, setOpenFAQ] = useState<number | null>(null);

    const filteredFAQs = FAQ_ITEMS.filter(item => {
        const matchesSearch = !searchQuery ||
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, React.ReactNode> = {
            'Getting Started': <Zap className="w-4 h-4" />,
            'Audits': <Search className="w-4 h-4" />,
            'Billing': <CreditCard className="w-4 h-4" />,
            'Teams': <Users className="w-4 h-4" />,
            'API': <Key className="w-4 h-4" />,
            'Security': <Shield className="w-4 h-4" />,
        };
        return icons[category] || <HelpCircle className="w-4 h-4" />;
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-gradient-to-b from-primary/10 to-transparent border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <HelpCircle className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">Help Center</h1>
                    <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                        Find answers to common questions about AI visibility, audits, billing, and more.
                    </p>

                    {/* Search */}
                    <div className="relative max-w-xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for help..."
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-500"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Category Pills */}
                <div className="flex flex-wrap gap-2 mb-8">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedCategory
                                ? 'bg-primary text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        All Topics
                    </button>
                    {CATEGORIES.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            {getCategoryIcon(category)}
                            {category}
                        </button>
                    ))}
                </div>

                {/* FAQ List */}
                <div className="space-y-3 mb-12">
                    {filteredFAQs.length === 0 ? (
                        <div className="text-center py-12">
                            <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">No matching questions found.</p>
                        </div>
                    ) : (
                        filteredFAQs.map((item, index) => (
                            <FAQAccordion
                                key={index}
                                item={item}
                                isOpen={openFAQ === index}
                                onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
                            />
                        ))
                    )}
                </div>

                {/* Contact Section */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
                    <MessageCircle className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Still have questions?</h3>
                    <p className="text-slate-400 mb-6">
                        Our team is here to help. Reach out and we'll get back to you within 24 hours.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href="mailto:support@cognition.ai"
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                        >
                            <Mail className="w-4 h-4" />
                            Email Support
                        </a>
                        <a
                            href="https://docs.cognition.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                        >
                            <Book className="w-4 h-4" />
                            Documentation
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
