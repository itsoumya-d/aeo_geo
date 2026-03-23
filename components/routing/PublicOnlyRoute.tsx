import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FullPageLoader } from './FullPageLoader';

function getReturnToFromQuery(search: string) {
    const params = new URLSearchParams(search);
    const returnTo = params.get('returnTo');
    if (returnTo) return returnTo;
    try {
        return sessionStorage.getItem('returnTo');
    } catch {
        return null;
    }
}

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const auth = useAuth();
    const location = useLocation();

    if (!auth.isConfigured && import.meta.env.PROD) {
        return <>{children}</>;
    }

    if (auth.loading) return <FullPageLoader label="Loading…" />;

    if (auth.user) {
        const onboardingIncomplete = !auth.organization || !auth.onboarding?.is_completed;
        const returnTo = getReturnToFromQuery(location.search);
        if (onboardingIncomplete) {
            return <Navigate to={`/onboarding${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} replace />;
        }
        return <Navigate to={returnTo || '/dashboard'} replace />;
    }

    return <>{children}</>;
};

