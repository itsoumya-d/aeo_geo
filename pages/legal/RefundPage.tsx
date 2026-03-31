import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { Card } from '../../components/ui/Card';

const TOC_REFUND = [
    { id: 'subscriptions', label: '1. Subscription charges' },
    { id: 'refund-eligibility', label: '2. Refund eligibility' },
    { id: 'non-refundable', label: '3. Non-refundable items' },
    { id: 'cancellations', label: '4. Cancellations' },
    { id: 'contact', label: '5. Contact' },
];

export const RefundPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-text-primary" id="top">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
                    <div className="min-w-0">
                        <h1 className="text-3xl sm:text-4xl font-display font-bold text-text-primary">Refund Policy</h1>
                        <p className="text-sm text-text-secondary mt-2">
                            Last updated: March 20, 2026
                        </p>
                    </div>
                    <Link to="/" className="text-sm text-primary hover:underline font-semibold">
                        Back to home
                    </Link>
                </div>

                <nav className="mb-8 bg-surface border border-border rounded-xl p-5">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Contents</p>
                    <ol className="space-y-1.5">
                        {TOC_REFUND.map(item => (
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
                            This Refund Policy explains when subscription fees may be refunded for the Service.
                        </p>

                        <h2 id="subscriptions" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">1. Subscription charges</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Paid plans are billed in advance on a recurring monthly basis unless otherwise stated at checkout.
                        </p>

                        <h2 id="refund-eligibility" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">2. Refund eligibility</h2>
                        <p className="text-text-secondary leading-relaxed">
                            If you believe you were charged in error, contact us within 14 days of the charge date. We may review requests on a case-by-case basis and issue a refund where appropriate.
                        </p>

                        <h2 id="non-refundable" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">3. Non-refundable items</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Except where required by law, partial billing periods, used credits, completed audits, and charges incurred after failure to cancel before renewal are generally non-refundable.
                        </p>

                        <h2 id="cancellations" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">4. Cancellations</h2>
                        <p className="text-text-secondary leading-relaxed">
                            You may cancel your subscription at any time. Cancellation stops future renewals, but your paid access remains available through the end of the current billing period.
                        </p>

                        <h2 id="contact" className="text-text-primary font-display font-bold text-xl mt-10 mb-3 scroll-mt-6">5. Contact</h2>
                        <p className="text-text-secondary leading-relaxed">
                            Questions about refunds? Contact us at <a className="text-primary hover:underline" href="mailto:support@cognition-ai.com">support@cognition-ai.com</a>.
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
