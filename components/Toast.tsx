import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

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
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    error: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
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
            className={`flex items-start gap-3 p-4 rounded-xl border ${toastStyles[toast.type]} animate-in slide-in-from-right-4 fade-in duration-300 shadow-glow backdrop-blur-md`}
        >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{toast.title}</p>
                {toast.description && (
                    <p className="text-xs text-slate-300 mt-1 font-medium">{toast.description}</p>
                )}
            </div>
            <button
                onClick={onRemove}
                className="text-slate-400 hover:text-white transition-colors p-1 -m-1 rounded-md hover:bg-white/10"
            >
                <X className="w-4 h-4" />
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
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
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
