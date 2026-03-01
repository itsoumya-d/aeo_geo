import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useToast } from '../components/Toast';
import { TopUpModal } from '../components/TopUpModal';
import { ProgressSteps, ANALYSIS_STEPS, getStepFromStatus } from '../components/ProgressSteps';
import { FullPageLoader } from '../components/routing/FullPageLoader';
import { analyzeBrandAssets, discoverSiteStructure } from '../services/geminiService';
import { crawlPage } from '../services/crawlService';
import { createAuditPage, getAudit, updateAudit } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAuditStore } from '../stores';
import { Asset, AssetType, AnalysisStatus, DiscoveredPage } from '../types';
import { clearAuditDraft, loadAuditDraft, saveAuditDraft } from '../utils/auditDraft';
import { normalizeUrl, validateUrl } from '../utils/validation';
import { toUserMessage } from '../utils/errors';
import { analytics } from '../services/analytics';

type PageCrawlStatus = 'pending' | 'crawling' | 'done' | 'failed';

interface PageCrawlEntry {
    url: string;
    status: PageCrawlStatus;
    retries: number;
}

function getPageLimit(plan: string | undefined) {
    if (!plan) return 3;
    if (plan === 'pro') return 10;
    if (plan === 'agency' || plan === 'enterprise') return 25;
    return 3;
}

export const AnalysisPage: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const { id } = useParams<{ id: string }>();
    const auth = useAuth();

    const {
        setAssets,
        setDiscoveredPages,
        setReport,
        setIsAnalyzing,
        setStatusMessage,
        isAnalyzing,
        statusMessage,
        discoveredPages,
    } = useAuditStore();

    const [loadingAudit, setLoadingAudit] = useState(true);
    const [auditStatus, setAuditStatus] = useState<'pending' | 'processing' | 'complete' | 'failed'>('pending');
    const [auditDomain, setAuditDomain] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [showTopUp, setShowTopUp] = useState(false);
    const [pageLog, setPageLog] = useState<PageCrawlEntry[]>([]);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [estimatedTotal, setEstimatedTotal] = useState<number>(0);

    const hasStarted = useRef(false);

    const elapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const completedPages = pageLog.filter(p => p.status === 'done' || p.status === 'failed').length;
    const estimatedRemaining = completedPages > 0 && estimatedTotal > 0
        ? Math.max(0, Math.round((elapsedSeconds / completedPages) * (estimatedTotal - completedPages)))
        : null;

    const auditId = id || '';
    const pageLimit = useMemo(() => getPageLimit(auth.organization?.plan), [auth.organization?.plan]);

    useEffect(() => {
        if (!auditId) return;
        setLoadingAudit(true);
        getAudit(auditId)
            .then((audit) => {
                if (!audit) {
                    setErrorMessage('Audit not found.');
                    setAuditStatus('failed');
                    return;
                }
                setAuditDomain(audit.domain_url);
                setAuditStatus(audit.status);
                if (audit.status === 'complete' && audit.report) {
                    navigate(`/results/${auditId}`, { replace: true });
                }
            })
            .catch((err) => {
                console.error('Failed to load audit:', err);
                setErrorMessage('Unable to load audit.');
                setAuditStatus('failed');
            })
            .finally(() => setLoadingAudit(false));
    }, [auditId, navigate]);

    useEffect(() => {
        if (!auditId) return;
        if (loadingAudit) return;
        if (auditStatus === 'complete') return;
        if (auditStatus === 'failed') return;
        if (hasStarted.current) return;

        hasStarted.current = true;
        runAudit().catch((err) => {
            console.error('Audit failed:', err);
        });
    }, [auditId, loadingAudit, auditStatus]);

    const crawlWithRetry = async (
        url: string,
        auditPageId: string,
        maxRetries = 2
    ): Promise<string | null> => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const crawl = await crawlPage(url, auditPageId);
                return crawl.markdown;
            } catch (e) {
                if (attempt < maxRetries) {
                    // Exponential backoff: 1s, 2s
                    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                } else {
                    console.error(`Crawl failed after ${maxRetries + 1} attempts for ${url}:`, e);
                    return null;
                }
            }
        }
        return null;
    };

    const runAudit = async () => {
        if (!auditId) return;

        setIsAnalyzing(true);
        setStatusMessage('Preparing your audit…');
        setStartTime(Date.now());

        try {
            await updateAudit(auditId, { status: 'processing', error_message: null });

            const draft = loadAuditDraft(auditId);
            let assets: Asset[] =
                draft?.assets?.length
                    ? draft.assets
                    : auditDomain
                        ? [{
                            id: `website-${auditId}`,
                            type: AssetType.WEBSITE,
                            url: auditDomain,
                            status: AnalysisStatus.IDLE
                        }]
                        : [];

            const website = assets.find(a => a.type === AssetType.WEBSITE)?.url || auditDomain;
            const check = validateUrl(website);
            if (!check.isValid) {
                throw new Error(check.error || 'Invalid URL');
            }

            const normalizedWebsite = normalizeUrl(website);
            analytics.auditStarted(normalizedWebsite);
            assets = assets.map(a => a.type === AssetType.WEBSITE ? { ...a, url: normalizedWebsite } : a);
            setAssets(assets);
            saveAuditDraft(auditId, { assets, createdAt: draft?.createdAt || Date.now() });

            setStatusMessage('Discovering key pages…');
            const pages = await discoverSiteStructure(normalizedWebsite);
            setDiscoveredPages(pages);

            const pagesToCrawl: DiscoveredPage[] = (pages || []).slice(0, pageLimit);
            const contentMap: Record<string, string> = {};
            const totalPages = pagesToCrawl.length;
            setEstimatedTotal(totalPages);

            // Initialize page log entries
            setPageLog(pagesToCrawl.map(p => ({ url: p.url, status: 'pending', retries: 0 })));

            for (let i = 0; i < pagesToCrawl.length; i++) {
                const page = pagesToCrawl[i];
                setStatusMessage(`Collecting content (${i + 1}/${totalPages})…`);

                // Mark page as crawling
                setPageLog(prev => prev.map((entry, idx) =>
                    idx === i ? { ...entry, status: 'crawling' } : entry
                ));

                const auditPage = await createAuditPage(auditId, page.url, page.type);
                if (!auditPage) {
                    setPageLog(prev => prev.map((entry, idx) =>
                        idx === i ? { ...entry, status: 'failed' } : entry
                    ));
                    continue;
                }

                const markdown = await crawlWithRetry(page.url, auditPage.id);
                if (markdown) {
                    contentMap[page.url] = markdown;
                    setPageLog(prev => prev.map((entry, idx) =>
                        idx === i ? { ...entry, status: 'done' } : entry
                    ));
                } else {
                    setPageLog(prev => prev.map((entry, idx) =>
                        idx === i ? { ...entry, status: 'failed' } : entry
                    ));
                }
            }

            setStatusMessage('Analyzing your brand presence…');
            const generatedReport = await analyzeBrandAssets(
                assets,
                pages,
                contentMap,
                undefined
            );

            await updateAudit(auditId, {
                status: 'complete',
                overall_score: generatedReport.overallScore,
                report: generatedReport as any,
                completed_at: new Date().toISOString()
            });

            generatedReport.id = auditId;
            setReport(generatedReport);
            clearAuditDraft(auditId);
            analytics.auditCompleted(normalizedWebsite, generatedReport.overallScore);

            toast.success('Analysis complete', 'Your visibility report is ready.');
            navigate(`/results/${auditId}`, { replace: true });
        } catch (error: any) {
            const technical = error?.message || 'Unknown error';
            console.error('Analysis failed:', technical);

            const friendlyError = toUserMessage(error);

            if (friendlyError.isRateLimit) {
                setShowTopUp(true);
                setErrorMessage('You need more credits to complete this analysis.');
            } else {
                setErrorMessage(friendlyError.message);
            }
            setAuditStatus('failed');
            clearAuditDraft(auditId);

            await updateAudit(auditId, {
                status: 'failed',
                error_message: technical,
                completed_at: new Date().toISOString()
            });

            toast.error(friendlyError.title, friendlyError.message);
        } finally {
            setIsAnalyzing(false);
            setStatusMessage('');
        }
    };

    const handleBackToDashboard = () => {
        clearAuditDraft(auditId);
        navigate('/dashboard');
    };

    if (loadingAudit) {
        return <FullPageLoader label="Loading audit…" />;
    }

    if (auditStatus === 'failed') {
        return (
            <>
                <div className="min-h-screen bg-background text-text-primary flex items-center justify-center p-6">
                    <div className="max-w-lg w-full bg-surface border border-white/10 rounded-2xl p-8 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="bg-rose-500/10 p-4 rounded-full">
                                <XCircle className="w-8 h-8 text-rose-400" />
                            </div>
                        </div>
                        <h1 className="text-xl font-display font-bold text-white mb-2">Analysis could not complete</h1>
                        <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
                            {errorMessage || 'Something went wrong. Please try again or contact support if the problem persists.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleBackToDashboard}
                                className="flex-1 bg-surface border border-border hover:bg-white/5 text-white font-semibold px-4 py-3 rounded-xl transition-colors"
                            >
                                Back to dashboard
                            </button>
                            <button
                                onClick={() => navigate(0)}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-3 rounded-xl transition-colors"
                            >
                                Try again
                            </button>
                        </div>
                        {showTopUp && (
                            <button
                                onClick={() => setShowTopUp(true)}
                                className="mt-3 w-full bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 font-semibold px-4 py-3 rounded-xl transition-colors text-sm"
                            >
                                Top up credits to continue
                            </button>
                        )}
                    </div>
                </div>
                <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} />
            </>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text-primary flex items-center justify-center px-6 py-16">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-[0.25em] mb-3">AI Visibility Audit</p>
                    <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3">Running your analysis</h1>
                    {auditDomain && (
                        <p className="text-sm font-semibold text-primary mb-2 truncate max-w-xs mx-auto">
                            {auditDomain}
                        </p>
                    )}
                    <p className="text-text-secondary max-w-xl mx-auto">
                        This usually takes 30–90 seconds depending on site size and content.
                    </p>
                </div>

                <div className="bg-surface border border-white/10 rounded-2xl p-8 shadow-2xl" aria-live="polite" aria-atomic="true">
                    <ProgressSteps
                        steps={ANALYSIS_STEPS}
                        currentStep={getStepFromStatus(statusMessage || '')}
                        className="mb-6"
                    />

                    <div className="bg-background/60 border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4 mb-4" role="status">
                        <div className="flex items-center gap-3 min-w-0">
                            <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" aria-hidden="true" />
                            <p className="text-sm text-text-primary font-medium truncate">
                                {statusMessage || 'Working…'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {estimatedRemaining !== null && (
                                <div className="flex items-center gap-1 text-xs text-text-muted">
                                    <Clock className="w-3 h-3" />
                                    ~{estimatedRemaining}s left
                                </div>
                            )}
                            <div className="text-xs text-text-muted font-semibold whitespace-nowrap">
                                {discoveredPages.length > 0 ? `${Math.min(discoveredPages.length, pageLimit)} pages` : 'Starting…'}
                            </div>
                        </div>
                    </div>

                    {/* Per-page crawl log */}
                    {pageLog.length > 0 && (
                        <div className="bg-background/40 border border-white/5 rounded-xl overflow-hidden mb-4">
                            <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-[0.15em] text-text-muted">Page crawl log</p>
                                <p className="text-xs text-text-muted">
                                    {pageLog.filter(p => p.status === 'done').length}/{pageLog.length} complete
                                    {pageLog.filter(p => p.status === 'failed').length > 0 && (
                                        <span className="text-rose-400 ml-2">
                                            · {pageLog.filter(p => p.status === 'failed').length} failed
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="max-h-44 overflow-y-auto divide-y divide-white/5">
                                {pageLog.map((entry, idx) => (
                                    <div key={idx} className="flex items-center gap-3 px-4 py-2">
                                        <div className="flex-shrink-0">
                                            {entry.status === 'done' && (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            )}
                                            {entry.status === 'crawling' && (
                                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                            )}
                                            {entry.status === 'failed' && (
                                                <XCircle className="w-4 h-4 text-rose-400" />
                                            )}
                                            {entry.status === 'pending' && (
                                                <div className="w-4 h-4 rounded-full border border-white/20" />
                                            )}
                                        </div>
                                        <p className="text-xs text-text-secondary font-mono truncate flex-1 min-w-0">
                                            {entry.url}
                                        </p>
                                        {entry.status === 'failed' && (
                                            <span className="text-xs text-rose-400 flex-shrink-0 flex items-center gap-1">
                                                <RefreshCw className="w-3 h-3" />
                                                Retried
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleBackToDashboard}
                        className="mt-2 w-full bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white font-semibold px-4 py-3 rounded-xl transition-colors border border-white/10"
                        disabled={isAnalyzing}
                    >
                        Cancel and return
                    </button>
                </div>
            </div>
        </div>
    );
};
