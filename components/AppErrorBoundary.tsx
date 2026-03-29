import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { toUserMessage } from '../utils/errors';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorId: string | null;
}

export class AppErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorId: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorId: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        // Here we would potentially log to Sentry
        const errorId = this.state.errorId || (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        this.setState({ errorId });
    }

    public render() {
        if (this.state.hasError) {
            const user = toUserMessage(this.state.error);
            const supportId = this.state.errorId ? this.state.errorId.slice(0, 8) : null;

            return (
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                    <div className="bg-surfaceHighlight border border-border rounded-3xl p-10 max-w-md text-center backdrop-blur-xl shadow-2xl">
                        <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8 text-rose-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">{user.title}</h1>
                        <p className="text-text-muted mb-8 leading-relaxed">
                            {user.message}
                        </p>

                        <div className="bg-black/30 rounded-xl p-4 mb-8 text-left overflow-auto max-h-32 border border-white/5">
                            <code className="text-xs text-rose-300 font-mono">
                                {import.meta.env.DEV
                                    ? (this.state.error?.message || 'Unknown error')
                                    : (supportId ? `Error ID: ${supportId}` : 'Error ID: unavailable')}
                            </code>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload Application
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex-1 bg-surfaceHighlight hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
