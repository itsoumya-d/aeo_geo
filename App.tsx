import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SEOHead } from './components/SEOHead';
import { LandingPage } from './components/LandingPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useKeyboardShortcuts, APP_SHORTCUTS } from './hooks/useKeyboardShortcuts';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { CookieConsent } from './components/CookieConsent';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { PublicOnlyRoute } from './components/routing/PublicOnlyRoute';

const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AnalysisPage = React.lazy(() => import('./pages/AnalysisPage').then(m => ({ default: m.AnalysisPage })));
const ResultsPage = React.lazy(() => import('./pages/ResultsPage').then(m => ({ default: m.ResultsPage })));
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));

const LoginPage = React.lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = React.lazy(() => import('./pages/auth/SignupPage').then(m => ({ default: m.SignupPage })));
const ResetPasswordPage = React.lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const AuthCallbackPage = React.lazy(() => import('./pages/auth/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const AcceptInvitePage = React.lazy(() => import('./pages/auth/AcceptInvitePage').then(m => ({ default: m.AcceptInvitePage })));

const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const HelpCenter = React.lazy(() => import('./pages/HelpCenter').then(m => ({ default: m.HelpCenter })));
const TermsPage = React.lazy(() => import('./pages/legal/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPage = React.lazy(() => import('./pages/legal/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const APIDocs = React.lazy(() => import('./components/docs/APIDocs').then(m => ({ default: m.APIDocs })));
const ReportBuilder = React.lazy(() => import('./components/reports/ReportBuilder').then(m => ({ default: m.ReportBuilder })));

const PageLoading = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-xs font-bold text-text-muted uppercase tracking-[0.25em]">Loading…</p>
        </div>
    </div>
);

const App: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();
    const shouldReduceMotion = useReducedMotion();

    const [showShortcuts, setShowShortcuts] = React.useState(false);

    useKeyboardShortcuts([
        { ...APP_SHORTCUTS.GO_HOME, action: () => navigate('/') },
        { ...APP_SHORTCUTS.GO_SETTINGS, action: () => navigate('/settings') },
        { ...APP_SHORTCUTS.GO_HISTORY, action: () => navigate('/history') },
        { ...APP_SHORTCUTS.HELP, action: () => setShowShortcuts(true) },
    ]);

    const pageVariants = {
        initial: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
        exit: { opacity: 0, y: shouldReduceMotion ? 0 : -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
    };

    return (
        <HelmetProvider>
            <div className="bg-background min-h-screen text-text-primary font-sans selection:bg-primary/30 overflow-x-hidden">
                <a href="#main-content" className="skip-to-content">
                    Skip to main content
                </a>
                <SEOHead />
                <main id="main-content" className="min-h-screen">
                    <Suspense fallback={<PageLoading />}>
                        <AnimatePresence mode="wait" initial={false}>
                        <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen">
                        <Routes location={location}>
                            <Route
                                path="/"
                                element={
                                    auth.user
                                        ? <Navigate to="/dashboard" replace />
                                        : (
                                            <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                                                    <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px]" />
                                                    <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px]" />
                                                </div>
                                                <LandingPage />
                                            </div>
                                        )
                                }
                            />

                            <Route path="/help" element={<HelpCenter />} />
                            <Route path="/terms" element={<TermsPage />} />
                            <Route path="/privacy" element={<PrivacyPage />} />
                            <Route path="/docs/api" element={<APIDocs />} />

                            <Route
                                path="/login"
                                element={
                                    <PublicOnlyRoute>
                                        <LoginPage />
                                    </PublicOnlyRoute>
                                }
                            />
                            <Route
                                path="/signup"
                                element={
                                    <PublicOnlyRoute>
                                        <SignupPage />
                                    </PublicOnlyRoute>
                                }
                            />
                            <Route path="/reset-password" element={<ResetPasswordPage />} />
                            <Route path="/auth/callback" element={<AuthCallbackPage />} />
                            <Route path="/accept-invite" element={<AcceptInvitePage />} />

                            <Route
                                path="/onboarding"
                                element={
                                    <ProtectedRoute allowOnboarding>
                                        <OnboardingPage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <ErrorBoundary>
                                            <DashboardPage />
                                        </ErrorBoundary>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/analysis/:id"
                                element={
                                    <ProtectedRoute>
                                        <ErrorBoundary>
                                            <AnalysisPage />
                                        </ErrorBoundary>
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/results/:id"
                                element={
                                    <ProtectedRoute>
                                        <ErrorBoundary>
                                            <ResultsPage />
                                        </ErrorBoundary>
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/history"
                                element={
                                    <ProtectedRoute>
                                        <HistoryPage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/settings"
                                element={
                                    <ProtectedRoute>
                                        <SettingsPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/settings/billing"
                                element={
                                    <ProtectedRoute>
                                        <SettingsPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/settings/integrations"
                                element={
                                    <ProtectedRoute>
                                        <SettingsPage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/reports/builder"
                                element={
                                    <ProtectedRoute>
                                        <ReportBuilder />
                                    </ProtectedRoute>
                                }
                            />

                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                        </motion.div>
                        </AnimatePresence>
                    </Suspense>
                </main>
                <ShortcutsHelpModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
                <CookieConsent />
            </div>
        </HelmetProvider>
    );
};

export default App;
