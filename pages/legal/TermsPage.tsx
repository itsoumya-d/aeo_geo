import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { Card } from '../../components/ui/Card';

const TOC_TERMS = [
    { id: 'eligibility', label: '1. Eligibility' },
    { id: 'accounts', label: '2. Accounts and Security' },
    { id: 'acceptable-use', label: '3. Acceptable Use' },
    { id: 'billing', label: '4. Billing' },
    { id: 'ip', label: '5. Intellectual Property' },
    { id: 'disclaimers', label: '6. Disclaimers' },
    { id: 'liability', label: '7. Limitation of Liability' },
    { id: 'termination', label: '8. Termination' },
    { id: 'contact', label: '9. Contact' },
];

export const TermsPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-text-primary" id="top">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
                    <div className="min-w-0">
                        <h1 className="text-3xl sm:text-4xl font-display font-bold text-text-primary">Terms of Service</h1>
                        <p className="text-sm text-text-secondary mt-2">
                            Last updated: February 5, 2026
                        </p>
                    </div>
                    <Link to="/" className="text-sm text-primary hover:underline font-semibold">
                        Back to home
                    </Link>
                </div>

                {/* Table of contents */}
                <nav className="mb-8 bg-surface border border-border rounded-xl p-5">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Contents</p>
                    <ol className="space-y-1.5">
                        {TOC_TERMS.map(item => (
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

                <Card variant="glass" className="border-border">
                    <div className="prose max-w-none">
                        <p className="text-text-secondary leading-relaxed">
                            These Terms of Service ("Terms") govern your access to and use of Cognition AI’s products and services
                            (the "Service"). By creating an account or using the Service, you agree to these Terms.
                        </p>

                        <h2 id="eligibility" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">1. Eligibility</h2>
                        <p className="text-text-secondary leading-relaxed">
                            You must be able to form a binding contract to use the Service. If you use the Service on behalf of an
                            organization, you represent you have authority to bind that organization.
                        </p>

                        <h2 id="accounts" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">2. Accounts and Security</h2>
                        <p className="text-text-secondary leading-relaxed">
                            You are responsible for safeguarding your credentials and for all activity under your account. You agree to
                            notify us promptly of any unauthorized use.
                        </p>

                        <h2 id="acceptable-use" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">3. Acceptable Use</h2>
                        <p className="text-text-secondary leading-relaxed">
                            You may not misuse the Service, interfere with its operation, attempt to access data you do not own, or use the
                            Service in a way that violates applicable law.
                        </p>

                        <h2 id="billing" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">4. Billing</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Paid plans may renew automatically unless canceled. Fees are non-refundable except as required by law. Usage limits,
                            credits, and plan features are described in the product and may change with notice.
                        </p>

                        <h2 id="ip" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">5. Intellectual Property</h2>
                        <p className="text-text-secondary leading-relaxed">
                            We retain all rights to the Service, including software, design, and branding. You retain rights to your content.
                            You grant us a limited license to process your content to provide the Service.
                        </p>

                        <h2 id="disclaimers" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">6. Disclaimers</h2>
                        <p className="text-text-secondary leading-relaxed">
                            The Service is provided "as is" without warranties of any kind. Scores and recommendations are informational and may
                            not reflect future outcomes.
                        </p>

                        <h2 id="liability" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">7. Limitation of Liability</h2>
                        <p className="text-text-secondary leading-relaxed">
                            To the maximum extent permitted by law, we will not be liable for indirect, incidental, special, consequential, or
                            punitive damages, or any loss of profits, data, or goodwill.
                        </p>

                        <h2 id="termination" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">8. Termination</h2>
                        <p className="text-text-secondary leading-relaxed">
                            You may stop using the Service at any time. We may suspend or terminate access if we reasonably believe you have
                            violated these Terms.
                        </p>

                        <h2 id="contact" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">9. Contact</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Questions about these Terms? Contact us at <a className="text-primary hover:underline" href="mailto:support@cognition-ai.com">support@cognition-ai.com</a>.
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
