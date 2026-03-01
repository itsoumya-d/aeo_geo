import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'cognition:cookie-consent';

export const CookieConsent: React.FC = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(CONSENT_KEY);
        if (!consent) {
            // Delay appearance so it doesn't compete with page load
            const timer = setTimeout(() => setVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const accept = () => {
        localStorage.setItem(CONSENT_KEY, 'accepted');
        // Notify app entry point to initialize analytics now
        window.dispatchEvent(new CustomEvent('cognition:consent-accepted'));
        setVisible(false);
    };

    const decline = () => {
        localStorage.setItem(CONSENT_KEY, 'declined');
        setVisible(false);
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50"
                >
                    <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl p-5 backdrop-blur-xl">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                <Cookie className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white">We use cookies</p>
                                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                                    We use essential cookies for authentication and analytics cookies to improve your experience.{' '}
                                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={accept}
                                        className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={decline}
                                        className="bg-white/5 hover:bg-white/10 text-text-secondary text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors border border-white/10"
                                    >
                                        Decline
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={decline}
                                className="text-text-muted hover:text-white transition-colors flex-shrink-0"
                                aria-label="Close cookie consent"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
