import React, { useState, useEffect, Suspense } from 'react';
import { Report, Asset, AssetType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, Wand2, Search, FileText } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { TopUpModal } from './TopUpModal';
import { InputLayer } from './InputLayer';

// Components
import { DashboardHeader } from './dashboard/DashboardHeader';
import { Sidebar } from './dashboard/Sidebar';
import { DashboardPrintHeader } from './dashboard/DashboardPrintHeader';
import { PDFReportGenerator } from './reports/PDFReportGenerator';
import { TabType, Branding } from './dashboard/DashboardTypes';
import { MobileBottomNav } from './dashboard/MobileBottomNav';
import { OverviewSkeleton, TableSkeleton } from './ui/Skeleton';
import { ErrorBoundary } from './ErrorBoundary';

// Lazy Load Tabs
const OverviewTab = React.lazy(() => import('./dashboard/OverviewTab').then(m => ({ default: m.OverviewTab })));
const PagesTab = React.lazy(() => import('./dashboard/PagesTab').then(m => ({ default: m.PagesTab })));
const SearchTab = React.lazy(() => import('./dashboard/SearchTab').then(m => ({ default: m.SearchTab })));
const ConsistencyTab = React.lazy(() => import('./dashboard/ConsistencyTab').then(m => ({ default: m.ConsistencyTab })));
const OptimizationTab = React.lazy(() => import('./dashboard/OptimizationTab').then(m => ({ default: m.OptimizationTab })));
const BenchmarkTab = React.lazy(() => import('./dashboard/BenchmarkTab').then(m => ({ default: m.BenchmarkTab })));
const ReportTab = React.lazy(() => import('./dashboard/ReportTab').then(m => ({ default: m.ReportTab })));
const SandboxTab = React.lazy(() => import('./dashboard/SandboxTab').then(m => ({ default: m.SandboxTab })));

interface DashboardProps {
    report: Report | null;
    onReset: () => void;
    onStartAnalysis?: (assets: Asset[]) => void;
    isAnalyzing: boolean;
    statusMessage?: string;
    discoveredCount?: number;
    initialTab?: TabType;
    showActionHub?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
    report,
    onReset,
    onStartAnalysis,
    isAnalyzing,
    statusMessage,
    discoveredCount,
    initialTab = 'overview',
    showActionHub = false,
}) => {
    const { organization, refreshOrganization } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = (searchParams.get('tab') as TabType) || initialTab;
    const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl);
    const [branding, setBranding] = useState<Branding | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showTopUp, setShowTopUp] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try { return localStorage.getItem('cognition:sidebar-collapsed') === 'true'; } catch { return false; }
    });

    // Sync URL with Active Tab via React Router
    useEffect(() => {
        const currentTabParam = searchParams.get('tab');
        if (currentTabParam !== activeTab) {
            setSearchParams({ tab: activeTab }, { replace: true });
        }
    }, [activeTab, searchParams, setSearchParams]);

    // Sync tab from URL changes (e.g. back/forward navigation)
    useEffect(() => {
        const urlTab = searchParams.get('tab') as TabType;
        if (urlTab && urlTab !== activeTab) {
            setActiveTab(urlTab);
        }
    }, [searchParams]);

    useEffect(() => {
        if (searchParams.get('topup') === 'success') {
            toast.success('Credits Refilled!', 'Your account balance has been updated.');
            refreshOrganization();
            // Poll for updated credits (webhook may not have processed yet)
            const timer = setTimeout(() => refreshOrganization(), 3000);
            setSearchParams({}, { replace: true });
            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        if (organization?.id) {
            fetchBranding();
        }
    }, [organization?.id]);

    const fetchBranding = async () => {
        const { data } = await supabase
            .from('organization_branding')
            .select('logo_url, primary_color, company_name, hide_cognition_branding')
            .eq('organization_id', organization?.id)
            .single();

        if (data) setBranding(data);
    };

    const handleExportCSV = () => {
        if (!report) return;
        const rows = [['Page', 'Issue', 'Action', 'Impact', 'Effort', 'AI Reasoning', 'Location']];
        report.pages.forEach(page => {
            page.recommendations.forEach(rec => {
                rows.push([
                    `"${page.url}"`,
                    `"${rec.issue.replace(/"/g, '""')}"`,
                    `"${rec.instruction.replace(/"/g, '""')}"`,
                    rec.impact,
                    rec.effort,
                    `"${rec.aiReasoning.replace(/"/g, '""')}"`,
                    `"${rec.location}"`
                ]);
            });
        });

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `cognition_audit_report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = async () => {
        if (!report) return;
        setIsExporting(true);
        // Wait two animation frames so React has flushed the isExporting state to the DOM
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

        const element = document.getElementById('dashboard-content');
        if (!element) {
            toast.error('Export Error', 'Could not find dashboard content.');
            setIsExporting(false);
            return;
        }

        const opt = {
            margin: 0.2,
            filename: `${report.id || 'cognition'}_audit_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            },
            jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        try {
            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;
            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error('PDF Export Error:', err);
            toast.error('Export Failed', 'Could not generate PDF report.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleSetActiveTab = (tab: TabType) => {
        if (tab === 'history') {
            navigate('/history');
            return;
        }
        if (tab === 'settings') {
            navigate('/settings');
            return;
        }
        if (tab === 'integrations') {
            navigate('/settings/integrations');
            return;
        }
        setActiveTab(tab);
    };

    return (
        <div className={`min-h-screen transition-all duration-700 relative flex bg-background text-text-primary ${isExporting ? 'bg-white text-slate-900' : ''}`}>

            {/* Sidebar (Desktop) */}
            {!isExporting && (
                <Sidebar activeTab={activeTab} setActiveTab={handleSetActiveTab} onReset={onReset} onCollapsedChange={setSidebarCollapsed} />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* No Report State -> Input Layer */}
                {!report && activeTab === 'overview' ? (
                    <div className={`flex-1 p-6 flex flex-col items-center justify-center transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-64'}`}>
                        <InputLayer
                            onStartAnalysis={onStartAnalysis!}
                            isAnalyzing={isAnalyzing}
                            statusMessage={statusMessage}
                            discoveredCount={discoveredCount}
                        />
                    </div>
                ) : (
                    <>
                        <DashboardHeader
                            activeTab={activeTab}
                            setActiveTab={handleSetActiveTab}
                            auditCredits={organization?.audit_credits_remaining ?? 0}
                            onReset={onReset}
                            onExportPDF={handleExportPDF}
                            onExportCSV={handleExportCSV}
                            onTopUp={() => setShowTopUp(true)}
                            isExporting={isExporting}
                            sidebarCollapsed={sidebarCollapsed}
                        />

                        <main
                            id="dashboard-content"
                            className={`flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:pb-6 lg:mt-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-64'} ${isExporting ? 'bg-white !m-0 !p-0' : ''}`}
                        >
                            {isExporting && report ? (
                                <PDFReportGenerator
                                    report={report}
                                    branding={branding}
                                    organizationName={organization?.name}
                                />
                            ) : (
                                <div className="max-w-7xl mx-auto">
                                    <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} />
                                    <div className="lg:hidden">
                                        <MobileBottomNav activeTab={activeTab} setActiveTab={handleSetActiveTab} />
                                    </div>

                                    {report && (
                                        <DashboardPrintHeader
                                            branding={branding}
                                            organizationName={organization?.name}
                                            overallScore={report.overallScore}
                                        />
                                    )}

                                    {report && showActionHub && activeTab === 'overview' && (
                                        <div className="mb-6 bg-slate-900/50 border border-white/10 rounded-2xl p-5">
                                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted mb-2">Top 3 Next Actions</p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {[
                                                    {
                                                        id: 'optimization' as TabType,
                                                        title: 'Apply fixes',
                                                        desc: 'Start with highest-impact recommendations.',
                                                        icon: <Wand2 className="w-4 h-4" />
                                                    },
                                                    {
                                                        id: 'search' as TabType,
                                                        title: 'Verify citations',
                                                        desc: 'Run visibility checks across AI platforms.',
                                                        icon: <Search className="w-4 h-4" />
                                                    },
                                                    {
                                                        id: 'reports' as TabType,
                                                        title: 'Share report',
                                                        desc: 'Export branded CSV, JSON, or PDF.',
                                                        icon: <FileText className="w-4 h-4" />
                                                    },
                                                ].map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleSetActiveTab(item.id)}
                                                        className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/40 rounded-xl p-4 transition-colors group"
                                                    >
                                                        <div className="flex items-center justify-between mb-2 text-primary">
                                                            {item.icon}
                                                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-white">{item.title}</p>
                                                        <p className="text-xs text-text-secondary mt-1">{item.desc}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeTab}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <ErrorBoundary>
                                                <Suspense fallback={
                                                    activeTab === 'pages' ? <TableSkeleton rows={10} /> :
                                                        activeTab === 'search' ? <OverviewSkeleton /> :
                                                            <OverviewSkeleton />
                                                }>
                                                    {activeTab === 'overview' && report && <OverviewTab report={report} setActiveTab={handleSetActiveTab} />}
                                                    {activeTab === 'pages' && report && <PagesTab report={report} />}
                                                    {activeTab === 'search' && report && <SearchTab report={report} />}
                                                    {activeTab === 'benchmark' && report && <BenchmarkTab report={report} />}
                                                    {activeTab === 'reports' && report && <ReportTab report={report} />}
                                                    {activeTab === 'sandbox' && <SandboxTab />}
                                                    {activeTab === 'consistency' && report && <ConsistencyTab report={report} />}
                                                    {activeTab === 'optimization' && <OptimizationTab />}

                                                    {/* Handle Empty State for Tabs requiring report */}
                                                    {(!report && activeTab !== 'sandbox' && activeTab !== 'optimization') && (
                                                        <div className="text-center py-20">
                                                            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                                                                <Loader2 className="w-6 h-6 text-text-muted" />
                                                            </div>
                                                            <p className="text-text-secondary font-semibold">No audit data yet</p>
                                                            <p className="text-sm text-text-muted mt-2">Run your first analysis to see results here.</p>
                                                        </div>
                                                    )}
                                                </Suspense>
                                            </ErrorBoundary>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            )}
                        </main>
                    </>
                )
                }
            </div>
        </div>
    );
};
