import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { APP_SHORTCUTS, formatShortcut } from '../hooks/useKeyboardShortcuts';
import { trapFocus } from '../utils/accessibility';

interface ShortcutsHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const shouldReduceMotion = useReducedMotion();

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    useEffect(() => {
        if (!isOpen || !modalRef.current) return;
        const cleanup = trapFocus(modalRef.current);
        closeButtonRef.current?.focus();
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => { cleanup(); document.removeEventListener('keydown', handleEsc); };
    }, [isOpen, handleClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        aria-hidden="true"
                    />

                    {/* Modal */}
                    <motion.div
                        ref={modalRef}
                        initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="shortcuts-modal-title"
                        className="relative w-full max-w-lg bg-white border border-blue-100 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-blue-100 flex items-center justify-between bg-blue-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Keyboard className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 id="shortcuts-modal-title" className="text-lg font-display font-bold text-slate-800">Keyboard Shortcuts</h3>
                                    <p className="text-xs text-slate-500">Supercharge your workflow</p>
                                </div>
                            </div>
                            <button
                                ref={closeButtonRef}
                                onClick={handleClose}
                                aria-label="Close keyboard shortcuts"
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-1 max-h-[60vh] overflow-y-auto">
                            {Object.values(APP_SHORTCUTS).map((shortcut) => (
                                <div
                                    key={shortcut.description}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 transition-colors group"
                                >
                                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
                                        {shortcut.description}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <kbd className="px-2.5 py-1.5 min-w-[32px] text-center bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold font-mono text-slate-700 shadow-sm">
                                            {formatShortcut(shortcut)}
                                        </kbd>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-blue-50/50 border-t border-blue-100 text-center">
                            <p className="text-xs text-slate-500">
                                Press <span className="font-bold text-slate-700">?</span> anytime to open this guide
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
