import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null, copied: false };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleCopyError = async () => {
        const { error, errorInfo } = this.state;
        const errorText = `Error: ${error?.message}\n\nStack:\n${error?.stack}\n\nComponent Stack:\n${errorInfo?.componentStack}`;

        try {
            await navigator.clipboard.writeText(errorText);
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 2000);
        } catch (err) {
            console.error('Failed to copy error:', err);
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <div className="bg-surface border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-xl animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-rose-500/10 p-3 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-rose-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                                <p className="text-sm text-slate-400">An unexpected error occurred</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
                            <p className="text-sm text-slate-300 font-mono break-all">
                                {this.state.error?.message || 'Unknown error'}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl font-medium transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleCopyError}
                                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl font-medium transition-colors"
                            >
                                {this.state.copied ? (
                                    <>
                                        <Check className="w-4 h-4 text-emerald-500" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copy Error
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 mt-4 text-center">
                            If this problem persists, please contact support with the error details.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
