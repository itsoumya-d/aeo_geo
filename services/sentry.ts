import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error tracking
 * Only runs in production with valid DSN
 */
export function initSentry() {
    const dsn = import.meta.env.VITE_SENTRY_DSN;

    if (!dsn) {
        console.log('[Sentry] DSN not configured, skipping initialization');
        return;
    }

    Sentry.init({
        dsn,
        environment: import.meta.env.MODE,

        // Performance Monitoring
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

        // Session Replay for debugging
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Integrations
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                maskAllText: false,
                blockAllMedia: false,
            }),
        ],

        // Filter out noisy errors
        beforeSend(event) {
            // Ignore network errors that aren't actionable
            if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
                return null;
            }
            return event;
        },
    });

    console.log('[Sentry] Initialized successfully');
}

/**
 * Capture a custom error with context
 */
export function captureError(error: Error, context?: Record<string, any>) {
    if (context) {
        Sentry.setContext('additional', context);
    }
    Sentry.captureException(error);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, orgId?: string) {
    Sentry.setUser({
        id: userId,
        email,
        org_id: orgId,
    });
}

/**
 * Clear user context on logout
 */
export function clearUserContext() {
    Sentry.setUser(null);
}

export { Sentry };
