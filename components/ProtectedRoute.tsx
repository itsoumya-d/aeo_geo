import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    requireOrganization?: boolean;
}

/**
 * Component that protects routes requiring authentication
 * Shows loading state while checking auth, redirects/shows fallback if not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    fallback,
    requireOrganization = false
}) => {
    const { user, organization, loading, isConfigured } = useAuth();

    // If Supabase is not configured, allow access (development mode)
    if (!isConfigured) {
        return <>{children}</>;
    }

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        if (fallback) {
            return <>{fallback}</>;
        }

        // Default: show sign in prompt
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-4">Sign in required</h2>
                    <p className="text-slate-400 mb-6">
                        You need to sign in to access this page.
                    </p>
                    <a
                        href="/login"
                        className="inline-block bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                        Sign In
                    </a>
                </div>
            </div>
        );
    }

    // Requires organization but doesn't have one
    if (requireOrganization && !organization) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-4">Organization required</h2>
                    <p className="text-slate-400 mb-6">
                        You need to create or join an organization to continue.
                    </p>
                    <a
                        href="/onboarding"
                        className="inline-block bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                        Get Started
                    </a>
                </div>
            </div>
        );
    }

    // Authenticated (and has organization if required)
    return <>{children}</>;
};

/**
 * Component that shows content only to unauthenticated users
 * Useful for login/signup pages
 */
export const PublicOnlyRoute: React.FC<{ children: React.ReactNode; redirectTo?: string }> = ({
    children,
    redirectTo = '/app'
}) => {
    const { user, loading, isConfigured } = useAuth();

    // If Supabase is not configured, show the content
    if (!isConfigured) {
        return <>{children}</>;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    // User is already logged in
    if (user) {
        // In a real app with react-router, you'd use Navigate here
        // For now, just show a redirect message
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-slate-400 mb-4">You're already signed in.</p>
                    <a
                        href={redirectTo}
                        className="text-primary hover:underline"
                    >
                        Go to Dashboard →
                    </a>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
