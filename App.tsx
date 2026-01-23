import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Asset, Report, DiscoveredPage, AssetType, AnalysisStatus } from './types';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { discoverSiteStructure, analyzeBrandAssets } from './services/geminiService';
import { createAudit, createAuditPage, updateAudit } from './services/supabase';
import { crawlPage } from './services/crawlService';
import { useToast } from './components/Toast';
import { OnboardingWizard } from './components/OnboardingWizard';
import { useKeyboardShortcuts, APP_SHORTCUTS } from './hooks/useKeyboardShortcuts';
import { SettingsPage } from './pages/SettingsPage';
import { HistoryPage } from './pages/HistoryPage';
import { HelpCenter } from './pages/HelpCenter';
import { useAuth } from './contexts/AuthContext';
import { useAuditStore, useUIStore } from './stores';

const App: React.FC = () => {
  const { session, organization, onboarding, signInWithGoogle, loading, refreshOrganization } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Zustand stores
  const {
    assets,
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

  const handleStartAnalysis = async (inputAssets: Asset[]) => {
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
      setStatusMessage("Analyzing Content with Gemini 1.5 Pro...");
      const pagesToAnalyze = pages.length > 0 ? pages : [];
      const generatedReport = await analyzeBrandAssets(inputAssets, pagesToAnalyze, contentMap);

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

  // Redirect to home if accessing dashboard without report
  useEffect(() => {
    if (location.pathname === '/dashboard' && !report && !loading) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, report, loading, navigate]);

  // Main content wrapper
  const MainLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-background min-h-screen text-slate-200 font-sans selection:bg-primary/30">
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
  );

  return (
    <MainLayout>
      <Routes>
        <Route
          path="/"
          element={
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
              {/* Background Gradients */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[150px]"></div>
              </div>
              <LandingPage
                onStartAnalysis={handleStartAnalysis}
                isAnalyzing={isAnalyzing}
                statusMessage={statusMessage}
                discoveredCount={discoveredPages.length}
                credits={organization?.audit_credits_remaining}
                session={session}
              />
            </div>
          }
        />
        <Route
          path="/dashboard"
          element={
            report ? (
              <ErrorBoundary>
                <Dashboard report={report} onReset={handleReset} />
              </ErrorBoundary>
            ) : null
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/history" element={<HistoryPage onSelectAudit={handleLoadAudit} />} />
        <Route path="/help" element={<HelpCenter />} />
        {/* Auth callback route for OAuth */}
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
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
