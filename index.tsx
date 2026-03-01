import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './i18n';

import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { initSentry } from './services/sentry';
import { analytics } from './services/analytics';
import { validateEnv } from './utils/env';

// Validate environment variables at startup. Logs clear errors in dev mode;
// silently returns result in production so the app can render a proper error screen.
validateEnv();

// Initialize monitoring only when user has consented (GDPR compliance).
// Cookie consent is stored by CookieConsent.tsx under this key.
const CONSENT_KEY = 'cognition:cookie-consent';

function initAnalyticsIfConsented() {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'accepted') {
        initSentry();
        analytics.init();
    }
}

// Init now if already consented from a previous visit
initAnalyticsIfConsented();

// Listen for consent granted after the banner is accepted in this session
window.addEventListener('cognition:consent-accepted', () => {
    initAnalyticsIfConsented();
});

// Initialize Paddle Billing SDK
const paddleClientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
const paddleEnvironment = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'production';
if (paddleClientToken && typeof window !== 'undefined') {
    const Paddle = (window as any).Paddle;
    if (Paddle) {
        if (paddleEnvironment === 'sandbox') {
            Paddle.Environment.set('sandbox');
        }
        Paddle.Initialize({ token: paddleClientToken });
    }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
