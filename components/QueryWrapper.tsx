import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw, WifiOff, Clock, ServerCrash, AlertTriangle } from 'lucide-react';

type ErrorType = 'network' | 'timeout' | 'server' | 'auth' | 'not_found' | 'rate_limit' | 'unknown';

interface APIErrorStateProps {
    error: Error | string | null;
    onRetry?: () => void;
    fullHeight?: boolean;
    compact?: boolean;
}

interface QueryWrapperProps {
    isLoading: boolean;
    error: Error | string | null;
    isEmpty?: boolean;
    children: ReactNode;
    loadingComponent?: ReactNode;
    emptyComponent?: ReactNode;
    onRetry?: () => void;
    loadingMessage?: string;
}

/**
 * Detects the type of error from error message or status
 */
function detectErrorType(error: Error | string | null): ErrorType {
    if (!error) return 'unknown';
    const message = typeof error === 'string' ? error : error.message;
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('cors')) {
        return 'network';
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
        return 'timeout';
    }
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401') || lowerMessage.includes('403')) {
        return 'auth';
    }
    if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
        return 'not_found';
    }
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('429') || lowerMessage.includes('too many')) {
        return 'rate_limit';
    }
    if (lowerMessage.includes('500') || lowerMessage.includes('502') || lowerMessage.includes('503')) {
        return 'server';
    }
    return 'unknown';
}

const errorConfig: Record<ErrorType, { icon: React.FC<{ className?: string }>, title: string, description: string, color: string }> = {
    network: {
        icon: WifiOff,
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
        color: 'text-amber-400'
    },
    timeout: {
        icon: Clock,
        title: 'Request Timeout',
        description: 'The request took too long to complete. Please try again.',
        color: 'text-amber-400'
    },
    server: {
        icon: ServerCrash,
        title: 'Server Error',
        description: 'Something went wrong on our end. Our team has been notified.',
        color: 'text-rose-400'
    },
    auth: {
        icon: AlertTriangle,
        title: 'Authentication Required',
        description: 'Your session may have expired. Please sign in again.',
        color: 'text-amber-400'
    },
    not_found: {
        icon: AlertCircle,
        title: 'Not Found',
        description: 'The requested resource could not be found.',
        color: 'text-slate-400'
    },
    rate_limit: {
        icon: Clock,
        title: 'Rate Limit Exceeded',
        description: 'Too many requests. Please wait a moment before trying again.',
        color: 'text-amber-400'
    },
    unknown: {
        icon: AlertCircle,
        title: 'Something Went Wrong',
        description: 'An unexpected error occurred. Please try again.',
        color: 'text-rose-400'
    }
};

/**
 * API Error State Component - displays context-aware error messages
 */
export const APIErrorState: React.FC<APIErrorStateProps> = ({
    error,
    onRetry,
    fullHeight = false,
    compact = false
}) => {
    const errorType = detectErrorType(error);
    const config = errorConfig[errorType];
    const Icon = config.icon;
    const rawMessage = typeof error === 'string' ? error : error?.message || '';
    const errorMessage = import.meta.env.DEV && rawMessage ? rawMessage : config.description;

    if (compact) {
        return (
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Icon className={`w-5 h-5 ${config.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{config.title}</p>
                    <p className="text-xs text-slate-400 truncate">{errorMessage}</p>
                </div>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="flex-shrink-0 p-2 hover:bg-white/5 rounded-lg transition-colors"
                        aria-label="Retry"
                    >
                        <RefreshCw className="w-4 h-4 text-slate-400" />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center text-center p-8 ${fullHeight ? 'min-h-[400px]' : 'py-12'}`}>
            <div className={`bg-slate-800/50 p-4 rounded-2xl mb-4 ${config.color.replace('text-', 'bg-').replace('400', '500/10')}`}>
                <Icon className={`w-10 h-10 ${config.color}`} />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">{config.title}</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">{errorMessage}</p>

            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                </button>
            )}

            {/* Technical details in dev mode */}
            {import.meta.env.DEV && error && (
                <details className="mt-6 text-left w-full max-w-md">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                        Technical Details
                    </summary>
                    <pre className="mt-2 p-3 bg-slate-900 rounded-lg text-xs text-slate-400 overflow-x-auto">
                        {typeof error === 'string' ? error : JSON.stringify({ message: error.message, stack: error.stack }, null, 2)}
                    </pre>
                </details>
            )}
        </div>
    );
};

/**
 * Loading Spinner Component
 */
export const LoadingSpinner: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg' }> = ({
    message = 'Loading...',
    size = 'md'
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    return (
        <div className="flex flex-col items-center justify-center py-12">
            <div className={`${sizeClasses[size]} border-2 border-slate-600 border-t-primary rounded-full animate-spin mb-4`} />
            <p className="text-sm text-slate-400">{message}</p>
        </div>
    );
};

/**
 * Query Wrapper - unified component for handling loading, error, and empty states
 * Use this to wrap any component that fetches data
 */
export const QueryWrapper: React.FC<QueryWrapperProps> = ({
    isLoading,
    error,
    isEmpty = false,
    children,
    loadingComponent,
    emptyComponent,
    onRetry,
    loadingMessage
}) => {
    // Priority: Error > Loading > Empty > Content
    if (error) {
        return <APIErrorState error={error} onRetry={onRetry} />;
    }

    if (isLoading) {
        return loadingComponent || <LoadingSpinner message={loadingMessage} />;
    }

    if (isEmpty && emptyComponent) {
        return <>{emptyComponent}</>;
    }

    return <>{children}</>;
};

/**
 * Inline Error Alert - for form validation and minor errors
 */
export const InlineError: React.FC<{ message: string; className?: string }> = ({ message, className = '' }) => (
    <div className={`flex items-center gap-2 text-rose-400 text-sm ${className}`}>
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{message}</span>
    </div>
);

/**
 * Toast-style error notification (for use with hook)
 */
export const useAPIError = () => {
    const [error, setError] = React.useState<Error | null>(null);

    const handleError = React.useCallback((err: unknown) => {
        if (err instanceof Error) {
            setError(err);
        } else if (typeof err === 'string') {
            setError(new Error(err));
        } else {
            setError(new Error('An unexpected error occurred'));
        }
    }, []);

    const clearError = React.useCallback(() => {
        setError(null);
    }, []);

    return { error, handleError, clearError };
};

export default QueryWrapper;
