import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { Card } from '../../components/ui/Card';

const TOC_PRIVACY = [
    { id: 'collect', label: '1. Information we collect' },
    { id: 'use', label: '2. How we use information' },
    { id: 'retention', label: '3. Data retention' },
    { id: 'security', label: '4. Security' },
    { id: 'contact', label: '5. Contact' },
];

export const PrivacyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-text-primary" id="top">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
                <div className="flex items-center justify-between gap-4 mb-10">
                    <div className="min-w-0">
                        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">Privacy Policy</h1>
                        <p className="text-sm text-text-secondary mt-2">
                            Last updated: February 5, 2026
                        </p>
                    </div>
                    <Link to="/" className="text-sm text-primary hover:underline font-semibold whitespace-nowrap">
                        Back to home
                    </Link>
                </div>

                {/* Table of contents */}
                <nav className="mb-8 bg-white/[0.03] border border-white/10 rounded-xl p-5">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Contents</p>
                    <ol className="space-y-1.5">
                        {TOC_PRIVACY.map(item => (
                            <li key={item.id}>
                                <a
                                    href={`#${item.id}`}
                                    className="text-sm text-text-secondary hover:text-primary transition-colors"
                                >
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <Card variant="glass" className="border-white/10">
                    <div className="prose prose-invert max-w-none">
                        <p className="text-text-secondary leading-relaxed">
                            This Privacy Policy explains how we collect, use, and protect information when you use the Service.
                        </p>

                        <h2 id="collect" className="text-white font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">1. Information we collect</h2>
                        <ul className="text-text-secondary leading-relaxed list-disc pl-5">
                            <li>Account information (email, name, authentication identifiers).</li>
                            <li>Workspace data (domains, audits, settings, and generated outputs).</li>
                            <li>Usage data (events, device/browser metadata, and performance metrics).</li>
                        </ul>

                        <h2 id="use" className="text-white font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">2. How we use information</h2>
                        <ul className="text-text-secondary leading-relaxed list-disc pl-5">
                            <li>Provide and operate the Service (audits, reports, and recommendations).</li>
                            <li>Improve reliability and security, prevent abuse, and debug issues.</li>
                            <li>Communicate with you about account and product updates.</li>
                        </ul>

                        <h2 id="retention" className="text-white font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">3. Data retention</h2>
                        <p className="text-text-secondary leading-relaxed">
                            We retain data for as long as your account remains active or as needed to provide the Service and comply with legal
                            obligations. You may request deletion of your account and associated data.
                        </p>

                        <h2 id="security" className="text-white font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">4. Security</h2>
                        <p className="text-text-secondary leading-relaxed">
                            We use industry-standard security measures to protect data in transit and at rest. No method of transmission or storage
                            is completely secure, and we cannot guarantee absolute security.
                        </p>

                        <h2 id="contact" className="text-white font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">5. Contact</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Privacy questions? Contact us at <a className="text-primary hover:underline" href="mailto:support@cognition-ai.com">support@cognition-ai.com</a>.
                        </p>
                    </div>
                </Card>

                <div className="mt-8 flex justify-center">
                    <a
                        href="#top"
                        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors"
                    >
                        <ArrowUp className="w-4 h-4" />
                        Back to top
                    </a>
                </div>
            </div>
        </div>
    );
};

