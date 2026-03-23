import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FullPageLoader } from './FullPageLoader';

function encodeReturnTo(pathname: string, search: string) {
    const target = `${pathname}${search || ''}`;
    return encodeURIComponent(target);
}

function getReturnToFromLocation(location: { pathname: string; search: string }) {
    return `${location.pathname}${location.search || ''}`;
}

function safeSessionSet(key: string, value: string) {
    try {
        sessionStorage.setItem(key, value);
    } catch {
        // Ignore storage failures on mobile/private browsers.
    }
}

export const ProtectedRoute: React.FC<{
    children: React.ReactNode;
    allowOnboarding?: boolean;
}> = ({ children, allowOnboarding = false }) => {
    const auth = useAuth();
    const location = useLocation();

    const returnTo = getReturnToFromLocation(location);

    const isE2eBypass = import.meta.env.DEV && import.meta.env.VITE_E2E_AUTH_BYPASS === 'true';

    useEffect(() => {
        if (auth.loading) return;
        if (!auth.isConfigured && import.meta.env.PROD) return;

        if (!auth.user) {
            safeSessionSet('returnTo', returnTo);
        }
    }, [auth.loading, auth.isConfigured, auth.user, returnTo]);

    if (isE2eBypass) return <>{children}</>;

    if (!auth.isConfigured) {
        if (import.meta.env.DEV) {
            return <>{children}</>;
        }
        return <Navigate to="/login" replace />;
    }

    if (auth.loading) return <FullPageLoader label="Checking session…" />;

    if (!auth.user) {
        return <Navigate to={`/login?returnTo=${encodeReturnTo(location.pathname, location.search)}`} replace />;
    }

    const onboardingIncomplete = !auth.organization || !auth.onboarding?.is_completed;
    if (onboardingIncomplete && !allowOnboarding) {
        safeSessionSet('returnTo', returnTo);
        return <Navigate to={`/onboarding?returnTo=${encodeReturnTo(location.pathname, location.search)}`} replace />;
    }

    return <>{children}</>;
};
