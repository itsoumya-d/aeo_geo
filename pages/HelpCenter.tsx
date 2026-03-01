import React, { useState } from 'react';
import {
    HelpCircle, Book, MessageCircle, ChevronDown, ChevronUp,
    Zap, Shield, CreditCard, Users, Key, Search,
    Send, CheckCircle2, ArrowRight, Loader2, Hash
} from 'lucide-react';
import { sanitizeUiCopy } from '../utils/uiCopy';
import { supabase } from '../services/supabase';

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
        answer: sanitizeUiCopy('We discover key pages on your site, analyze publicly available content, and generate a visibility report across major AI assistants. You’ll see what AI understands, what it misses, and the highest-impact actions to improve.')
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
        answer: sanitizeUiCopy('We accept major credit cards (Visa, Mastercard, American Express). Enterprise customers can request invoice billing.')
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
        answer: 'We only analyze publicly accessible pages. Your data is encrypted in transit and at rest. We never share or sell your data. API keys are stored securely and can’t be viewed again after creation.'
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

const TOPICS = [
    'Getting Started',
    'Billing & Plans',
    'Technical Issue',
    'API & Integrations',
    'Feature Request',
    'Other',
];

const ContactForm: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [topic, setTopic] = useState('');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [ticketId, setTicketId] = useState<string>('');
    const [serverError, setServerError] = useState<string>('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Name is required';
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Valid email required';
        if (!topic) errs.topic = 'Please select a topic';
        if (!message.trim() || message.trim().length < 20) errs.message = 'Please describe your issue (min. 20 characters)';
        return errs;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setSubmitting(true);
        setServerError('');
        try {
            const { data, error } = await supabase.functions.invoke('support-ticket', {
                body: { name: name.trim(), email: email.trim(), topic, message: message.trim() },
            });
            if (error) throw error;
            setTicketId(data?.ticketId || '');
            setSubmitted(true);
        } catch (err: any) {
            console.error('[HelpCenter] support-ticket error:', err);
            setServerError('Failed to send your message. Please try again or email support@cognition-ai.com directly.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Message received!</h3>
                {ticketId && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 mb-3">
                        <Hash className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 text-sm font-mono font-semibold">{ticketId}</span>
                    </div>
                )}
                <p className="text-slate-400 mb-4">
                    We've received your message and sent a confirmation to <span className="text-white">{email}</span>. We aim to respond within 24 hours.
                </p>
                <button
                    onClick={() => { setSubmitted(false); setName(''); setEmail(''); setTopic(''); setMessage(''); setErrors({}); setTicketId(''); }}
                    className="text-sm text-primary hover:underline"
                >
                    Send another message
                </button>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
            <div className="flex items-start gap-4 mb-8">
                <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Still have questions?</h3>
                    <p className="text-slate-400 text-sm">
                        Our team typically responds within <span className="text-white font-medium">24 hours</span>.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Your name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
                            placeholder="Jane Smith"
                            className={`w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${errors.name ? 'border-rose-500' : 'border-slate-700'}`}
                        />
                        {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }}
                            placeholder="jane@company.com"
                            className={`w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${errors.email ? 'border-rose-500' : 'border-slate-700'}`}
                        />
                        {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email}</p>}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Topic</label>
                    <select
                        value={topic}
                        onChange={e => { setTopic(e.target.value); setErrors(prev => ({ ...prev, topic: '' })); }}
                        className={`w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${errors.topic ? 'border-rose-500' : 'border-slate-700'}`}
                    >
                        <option value="" disabled>Select a topic…</option>
                        {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.topic && <p className="text-xs text-rose-400 mt-1">{errors.topic}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Message</label>
                    <textarea
                        rows={4}
                        value={message}
                        onChange={e => { setMessage(e.target.value); setErrors(prev => ({ ...prev, message: '' })); }}
                        placeholder="Describe your question or issue in detail…"
                        className={`w-full bg-slate-800 border rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none ${errors.message ? 'border-rose-500' : 'border-slate-700'}`}
                    />
                    {errors.message && <p className="text-xs text-rose-400 mt-1">{errors.message}</p>}
                </div>

                {serverError && (
                    <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2.5">{serverError}</p>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                    <a
                        href="/docs/api"
                        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        <Book className="w-4 h-4" />
                        View documentation
                        <ArrowRight className="w-3 h-3" />
                    </a>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {submitting ? 'Sending…' : 'Send message'}
                    </button>
                </div>
            </form>
        </div>
    );
};

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
                <ContactForm />
            </div>
        </div>
    );
};
