import React, { useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { Asset, Report, DiscoveredPage, AssetType, AnalysisStatus } from './types';
import { LandingPage } from './components/LandingPage';
import { SEOHead } from './components/SEOHead';
import { ErrorBoundary } from './components/ErrorBoundary';
import { discoverSiteStructure, analyzeBrandAssets } from './services/geminiService';
import { createAudit, createAuditPage, updateAudit } from './services/supabase';
import { crawlPage } from './services/crawlService';
import { useToast } from './components/Toast';
import { OnboardingWizard } from './components/OnboardingWizard';
import { useKeyboardShortcuts, APP_SHORTCUTS } from './hooks/useKeyboardShortcuts';
import { useAuth } from './contexts/AuthContext';
import { useAuditStore, useUIStore } from './stores';
import { AuthPage } from './components/auth/AuthPage';

// Lazy Load Pages
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const HelpCenter = React.lazy(() => import('./pages/HelpCenter').then(m => ({ default: m.HelpCenter })));
const APIDocs = React.lazy(() => import('./components/docs/APIDocs').then(m => ({ default: m.APIDocs })));
const ReportBuilder = React.lazy(() => import('./components/reports/ReportBuilder').then(m => ({ default: m.ReportBuilder })));

const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading Mission Control...</p>
    </div>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/login');
    }
  }, [session, loading, navigate]);

  if (loading) return <PageLoading />;
  return session ? <>{children}</> : null;
};

const App: React.FC = () => {
  const { session, organization, onboarding, signInWithGoogle, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Zustand stores
  const {
    discoveredPages,
    report,
    isAnalyzing,
    statusMessage,
    setAssets,
    setDiscoveredPages,
    setReport,
    setIsAnalyzing,
    setStatusMessage,
    reset: resetAudit,
  } = useAuditStore();

  const { showOnboarding, setShowOnboarding } = useUIStore();

  // Register Shortcuts
  useKeyboardShortcuts([
    { ...APP_SHORTCUTS.GO_HOME, action: () => navigate('/') },
    { ...APP_SHORTCUTS.GO_SETTINGS, action: () => navigate('/settings') },
    { ...APP_SHORTCUTS.GO_HISTORY, action: () => navigate('/history') },
  ]);

  // Show onboarding for new users
  useEffect(() => {
    const needsOnboarding = session && !loading && (!organization || !onboarding?.is_completed);
    if (needsOnboarding) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [session, loading, organization, onboarding, setShowOnboarding]);

  const handleStartAnalysis = async (inputAssets: Asset[], options?: { llmProvider: 'gemini' | 'claude' | 'openai' }) => {
    if (!session) {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error("Authentication Required", "Please log in to start analysis.");
      }
      return;
    }

    // Check credits locally before starting
    if ((organization?.audit_credits_remaining || 0) <= 0) {
      toast.warning("Insufficient Credits", "Please upgrade your plan to continue.");
      return;
    }

    setAssets(inputAssets);
    setIsAnalyzing(true);
    setStatusMessage("Initializing Knowledge Graph...");

    let pages: DiscoveredPage[] = [];

    try {
      // Step 1: Discovery
      const mainSite = inputAssets.find(a => a.type === 'WEBSITE' || a.url.includes('http'))?.url;

      if (mainSite) {
        setStatusMessage(`Crawling site structure for ${mainSite}...`);
        pages = await discoverSiteStructure(mainSite);
        setDiscoveredPages(pages);

        // Artificial delay for UX
        await new Promise(r => setTimeout(r, 1500));
      }

      // Step 2: Create Audit in DB
      setStatusMessage("Initializing Audit Session...");
      const auditDomain = mainSite || "Multi-Asset Audit";
      const audit = await createAudit(auditDomain);

      const contentMap: Record<string, string> = {};

      if (audit && pages.length > 0) {
        const pagesToCrawl = pages.slice(0, 3);

        for (const page of pagesToCrawl) {
          setStatusMessage(`Crawling ${page.url}...`);
          const auditPage = await createAuditPage(audit.id, page.url, page.type);

          if (auditPage) {
            try {
              const crawlResult = await crawlPage(page.url, auditPage.id);
              contentMap[page.url] = crawlResult.markdown;
            } catch (e) {
              console.error(`Failed to crawl ${page.url}`, e);
            }
          }
        }
      }

      // Step 3: Deep Analysis (RAG)
      const provider = options?.llmProvider || 'gemini';
      setStatusMessage(`Analyzing Content with ${provider === 'claude' ? 'Claude 3.5 Sonnet' : provider === 'openai' ? 'GPT-4o' : 'Gemini 1.5 Pro'}...`);
      const pagesToAnalyze = pages.length > 0 ? pages : [];

      const generatedReport = await analyzeBrandAssets(
        inputAssets,
        pagesToAnalyze,
        contentMap,
        undefined, // competitors
        provider
      );

      if (audit) {
        await updateAudit(audit.id, {
          status: 'complete',
          overall_score: generatedReport.overallScore,
          report: generatedReport as any,
          completed_at: new Date().toISOString()
        });
      }

      generatedReport.id = audit?.id;
      setReport(generatedReport);
      navigate('/dashboard');
      toast.success("Analysis Complete", "Your AI visibility report is ready.");
    } catch (error: any) {
      console.error("Analysis Error", error);
      const errorMessage = error.message || "An unexpected error occurred.";
      toast.error("Analysis Failed", errorMessage);
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  const handleReset = () => {
    resetAudit();
    navigate('/');
  };

  const handleLoadAudit = async (audit: any) => {
    if (audit.report) {
      const loadedReport = audit.report as Report;
      loadedReport.id = audit.id;
      setReport(loadedReport);
      navigate('/dashboard');
    }
  };

  // Main content wrapper
  const MainLayout = ({ children }: { children: React.ReactNode }) => (
    <HelmetProvider>
      <div className="bg-background min-h-screen text-text-primary font-sans selection:bg-primary/30 overflow-x-hidden">
        <SEOHead />
        {showOnboarding ? (
          <OnboardingWizard
            onComplete={() => setShowOnboarding(false)}
            onStartFirstAudit={(domain) => handleStartAnalysis([{
              id: 'initial-' + Date.now(),
              type: AssetType.WEBSITE,
              url: domain,
              status: AnalysisStatus.IDLE
            }])}
          />
        ) : (
          children
        )}
      </div>
    </HelmetProvider>
  );

  return (
    <MainLayout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
                  {/* Background Gradients */}
                  <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px]"></div>
                    <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px]"></div>
                  </div>
                  <LandingPage />
                </div>
              )
            }
          />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Dashboard
                    report={report}
                    onReset={handleReset}
                    onStartAnalysis={handleStartAnalysis}
                    isAnalyzing={isAnalyzing}
                    statusMessage={statusMessage}
                    discoveredCount={discoveredPages.length}
                    initialTab="overview"
                  />
                </ErrorBoundary>
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
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />

          <Route path="/help" element={<HelpCenter />} />
          <Route path="/docs/api" element={<APIDocs />} />
          <Route path="/reports/builder" element={<ReportBuilder />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
};

// Auth callback component for handling OAuth redirects
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // The auth state change listener in AuthContext handles the session
    // Just redirect to home after a brief delay
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-slate-400">Completing sign in...</p>
      </div>
    </div>
  );
};

export default App;
