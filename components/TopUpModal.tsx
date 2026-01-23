import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import {
    Zap, ShoppingCart, Loader2, Check,
    CreditCard, Sparkles, X, ShieldCheck
} from 'lucide-react';

interface TopUpOption {
    id: string;
    credits: number;
    rewrites: number;
    price: string;
    priceId: string;
    popular?: boolean;
}

const TOPUP_OPTIONS: TopUpOption[] = [
    { id: 'small', credits: 10, rewrites: 100, price: '$9', priceId: 'price_topup_10_mock' },
    { id: 'medium', credits: 50, rewrites: 500, price: '$39', priceId: 'price_topup_50_mock', popular: true },
    { id: 'large', credits: 150, rewrites: 1500, price: '$99', priceId: 'price_topup_150_mock' },
];

export const TopUpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState<string | null>(null);

    const handlePurchase = async (option: TopUpOption) => {
        if (!user) return;
        setLoading(option.id);

        try {
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    priceId: option.priceId,
                    mode: 'payment',
                    credits: option.credits,
                    rewrites: option.rewrites,
                    successUrl: window.location.origin + '/dashboard?topup=success',
                    cancelUrl: window.location.origin + '/dashboard'
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (e: any) {
            toast.error('Purchase Failed', e.message);
            setLoading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="relative p-8 sm:p-12">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
                            <Sparkles className="w-3 h-3" /> Credit Top-up
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2">Refuel Your Engine</h2>
                        <p className="text-slate-400">Add instant credits to your account. No subscription required.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {TOPUP_OPTIONS.map((option) => (
                            <div
                                key={option.id}
                                className={`relative p-6 rounded-2xl border transition-all ${option.popular
                                        ? 'bg-slate-800 border-primary shadow-lg shadow-primary/10'
                                        : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                                    }`}
                            >
                                {option.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                                        Best Value
                                    </div>
                                )}
                                <div className="text-center mb-6">
                                    <div className="text-3xl font-black text-white mb-1">{option.credits}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">Audit Credits</div>
                                </div>
                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                        <span>{option.rewrites} Rewrites</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                        <span>Priority Processing</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                        <span>Never Expires</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handlePurchase(option)}
                                    disabled={loading !== null}
                                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${option.popular
                                            ? 'bg-primary hover:bg-primary/90 text-white'
                                            : 'bg-slate-700 hover:bg-slate-600 text-white'
                                        }`}
                                >
                                    {loading === option.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <ShoppingCart className="w-4 h-4" />
                                            {option.price}
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 flex items-center justify-center gap-6 pt-8 border-t border-slate-800">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <ShieldCheck className="w-4 h-4" /> Secure Payment
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <CreditCard className="w-4 h-4" /> All Cards Accepted
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
