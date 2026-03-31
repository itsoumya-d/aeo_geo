import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { announceToScreenReader } from '../utils/accessibility';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    description?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const toastIcons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const toastStyles = {
    success: 'bg-surface/95 border-emerald-500/25 text-emerald-600 shadow-[0_24px_60px_rgba(15,23,42,0.18)]',
    error: 'bg-surface/95 border-rose-500/25 text-rose-600 shadow-[0_24px_60px_rgba(15,23,42,0.18)]',
    warning: 'bg-surface/95 border-amber-500/25 text-amber-600 shadow-[0_24px_60px_rgba(15,23,42,0.18)]',
    info: 'bg-surface/95 border-blue-500/25 text-sky-600 shadow-[0_24px_60px_rgba(15,23,42,0.18)]',
};

/**
 * Individual toast component
 */
const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
    const Icon = toastIcons[toast.type];

    React.useEffect(() => {
        const timeout = setTimeout(onRemove, toast.duration || 5000);
        return () => clearTimeout(timeout);
    }, [toast.duration, onRemove]);

    return (
        <div
            className={`flex items-start gap-3 rounded-xl border p-4 ${toastStyles[toast.type]} animate-in slide-in-from-right-4 fade-in duration-300 backdrop-blur-md`}
        >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary">{toast.title}</p>
                {toast.description && (
                    <p className="mt-1 text-xs font-medium text-text-secondary">{toast.description}</p>
                )}
            </div>
            <button
                onClick={onRemove}
                aria-label={`Dismiss ${toast.title} notification`}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-surfaceHighlight hover:text-text-primary -m-1"
            >
                <X className="w-4 h-4" aria-hidden="true" />
            </button>
        </div>
    );
};

/**
 * Toast container that displays all active toasts
 */
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({
    toasts,
    onRemove,
}) => {
    if (toasts.length === 0) return null;

    return (
        <div
            role="region"
            aria-label="Notifications"
            className="fixed inset-x-4 bottom-4 z-[100] flex pointer-events-none flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm"
        >
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto" role={toast.type === 'error' ? 'alert' : 'status'}>
                    <ToastItem toast={toast} onRemove={() => onRemove(toast.id)} />
                </div>
            ))}
        </div>
    );
};

/**
 * Toast provider - wrap your app with this
 */
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts((prev) => [...prev, { ...toast, id }]);
        // Announce to screen readers
        const priority = toast.type === 'error' ? 'assertive' : 'polite';
        announceToScreenReader(`${toast.type}: ${toast.title}${toast.description ? `. ${toast.description}` : ''}`, priority);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const success = useCallback((title: string, description?: string) => {
        addToast({ type: 'success', title, description });
    }, [addToast]);

    const error = useCallback((title: string, description?: string) => {
        addToast({ type: 'error', title, description });
    }, [addToast]);

    const warning = useCallback((title: string, description?: string) => {
        addToast({ type: 'warning', title, description });
    }, [addToast]);

    const info = useCallback((title: string, description?: string) => {
        addToast({ type: 'info', title, description });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

/**
 * Hook to use toast notifications
 */
export function useToast(): ToastContextType {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
