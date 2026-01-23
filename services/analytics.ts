/**
 * Mixpanel Analytics Service
 * 
 * Lightweight analytics tracking for product usage
 * Only runs when VITE_MIXPANEL_TOKEN is configured
 */

interface MixpanelEvent {
    event: string;
    properties?: Record<string, any>;
}

class Analytics {
    private token: string | null = null;
    private userId: string | null = null;
    private initialized = false;

    init() {
        this.token = import.meta.env.VITE_MIXPANEL_TOKEN || null;

        if (!this.token) {
            console.log('[Analytics] Token not configured, skipping initialization');
            return;
        }

        this.initialized = true;
        console.log('[Analytics] Initialized');
    }

    identify(userId: string, traits?: Record<string, any>) {
        if (!this.initialized) return;

        this.userId = userId;
        this.track('$identify', { $user_id: userId, ...traits });
    }

    track(event: string, properties?: Record<string, any>) {
        if (!this.initialized || !this.token) return;

        const payload = {
            event,
            properties: {
                token: this.token,
                distinct_id: this.userId || 'anonymous',
                time: Date.now(),
                $browser: navigator.userAgent,
                $current_url: window.location.href,
                ...properties,
            },
        };

        // Use sendBeacon for better reliability
        const data = btoa(JSON.stringify(payload));
        navigator.sendBeacon(`https://api.mixpanel.com/track/?data=${data}`);
    }

    // Common events
    pageView(pageName: string) {
        this.track('Page View', { page: pageName });
    }

    auditStarted(domain: string) {
        this.track('Audit Started', { domain });
    }

    auditCompleted(domain: string, score: number) {
        this.track('Audit Completed', { domain, score });
    }

    rewriteSimulated(scoreDelta: number) {
        this.track('Rewrite Simulated', { score_delta: scoreDelta });
    }

    exportReport(format: 'pdf' | 'csv') {
        this.track('Report Exported', { format });
    }

    subscriptionStarted(plan: string) {
        this.track('Subscription Started', { plan });
    }

    creditsTopUp(amount: number) {
        this.track('Credits Top Up', { amount });
    }

    reset() {
        this.userId = null;
    }
}

export const analytics = new Analytics();
