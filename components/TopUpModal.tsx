import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../utils/errors';
import {
    Zap, ShoppingCart, Loader2, Check,
    CreditCard, Sparkles, X, ShieldCheck
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { trapFocus } from '../utils/accessibility';

interface TopUpOption {
    id: string;
    credits: number;
    rewrites: number;
    price: string;
    priceId: string;
    popular?: boolean;
}

const TOPUP_OPTIONS: TopUpOption[] = [
    { id: 'small', credits: 10, rewrites: 100, price: '$9', priceId: import.meta.env.VITE_PADDLE_TOPUP_10_PRICE_ID || '' },
    { id: 'medium', credits: 50, rewrites: 500, price: '$39', priceId: import.meta.env.VITE_PADDLE_TOPUP_50_PRICE_ID || '', popular: true },
    { id: 'large', credits: 150, rewrites: 1500, price: '$99', priceId: import.meta.env.VITE_PADDLE_TOPUP_150_PRICE_ID || '' },
];

export const TopUpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const handleClose = useCallback(() => {
        if (loading) return;
        onClose();
    }, [loading, onClose]);

    useEffect(() => {
        if (!isOpen || !modalRef.current) return;
        const cleanup = trapFocus(modalRef.current);
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => { cleanup(); document.removeEventListener('keydown', handleEsc); };
    }, [isOpen, handleClose]);

    const handlePurchase = async (option: TopUpOption) => {
        if (!user) return;
        if (!option.priceId) {
            toast.info('Top-ups not configured', 'Please configure Paddle top-up price IDs.');
            return;
        }
        setLoading(option.id);

        try {
            const Paddle = (window as any).Paddle;
            if (!Paddle) throw new Error('Paddle SDK not loaded. Please refresh the page.');

            Paddle.Checkout.open({
                items: [{ priceId: option.priceId, quantity: 1 }],
                customer: user.email ? { email: user.email } : undefined,
                customData: {
                    credits: option.credits,
                    rewrites: option.rewrites,
                    type: 'TOPUP',
                },
            });
        } catch (e: any) {
            console.error('Top-up purchase failed:', getTechnicalErrorMessage(e));
            const userMsg = toUserMessage(e);
            toast.error(userMsg.title, userMsg.message);
        } finally {
            setLoading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" role="presentation">
            <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />
            <Card ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="topup-modal-title" className="relative w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-0 shadow-2xl bg-surface border-border">
                <div className="relative p-8 sm:p-12">
                    <button
                        onClick={handleClose}
                        aria-label="Close credit top-up dialog"
                        className="absolute top-6 right-6 p-2 text-text-muted hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" aria-hidden="true" />
                    </button>

                    <div className="text-center mb-10">
                        <Badge variant="default" className="mb-4">
                            <Sparkles className="w-3 h-3 mr-1" /> Credit Top-up
                        </Badge>
                        <h2 id="topup-modal-title" className="text-3xl font-black text-white mb-2 font-display">Refuel Your Engine</h2>
                        <p className="text-text-secondary">Add instant credits to your account. No subscription required.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {TOPUP_OPTIONS.map((option) => (
                            <div
                                key={option.id}
                                className={`relative p-6 rounded-2xl border transition-all ${option.popular
                                    ? 'bg-primary/5 border-primary shadow-glow'
                                    : 'bg-background/50 border-border hover:border-primary/50'
                                    }`}
                            >
                                {option.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full shadow-lg">
                                        Best Value
                                    </div>
                                )}
                                <div className="text-center mb-6">
                                    <div className="text-3xl font-black text-white mb-1 font-display">{option.credits}</div>
                                    <div className="text-[10px] uppercase font-bold text-text-muted tracking-tighter">Audit Credits</div>
                                </div>
                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                        <span>{option.rewrites} Rewrites</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                        <span>Priority Processing</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                        <span>Never Expires</span>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handlePurchase(option)}
                                    disabled={loading !== null || !option.priceId}
                                    variant={option.popular ? 'primary' : 'secondary'}
                                    className="w-full"
                                >
                                    {loading === option.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                            {option.priceId ? option.price : 'Not configured'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 flex items-center justify-center gap-6 pt-8 border-t border-white/5">
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                            <ShieldCheck className="w-4 h-4" /> Secure Payment
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                            <CreditCard className="w-4 h-4" /> All Cards Accepted
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default TopUpModal;
