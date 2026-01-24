import React, { useState, useEffect, Suspense } from 'react';
import { Report, Asset, AssetType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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
import { OverviewSkeleton } from './ui/Skeleton';

// Lazy Load Tabs
const OverviewTab = React.lazy(() => import('./dashboard/OverviewTab').then(m => ({ default: m.OverviewTab })));
const PagesTab = React.lazy(() => import('./dashboard/PagesTab').then(m => ({ default: m.PagesTab })));
const SearchTab = React.lazy(() => import('./dashboard/SearchTab').then(m => ({ default: m.SearchTab })));
const ConsistencyTab = React.lazy(() => import('./dashboard/ConsistencyTab').then(m => ({ default: m.ConsistencyTab })));
const OptimizationTab = React.lazy(() => import('./dashboard/OptimizationTab').then(m => ({ default: m.OptimizationTab })));
const BenchmarkTab = React.lazy(() => import('./dashboard/BenchmarkTab').then(m => ({ default: m.BenchmarkTab })));
const ReportTab = React.lazy(() => import('./dashboard/ReportTab').then(m => ({ default: m.ReportTab })));
const IntegrationsTab = React.lazy(() => import('./dashboard/IntegrationsTab').then(m => ({ default: m.IntegrationsTab })));
const SandboxTab = React.lazy(() => import('./dashboard/SandboxTab').then(m => ({ default: m.SandboxTab })));
const CorrelationTab = React.lazy(() => import('./dashboard/CorrelationTab').then(m => ({ default: m.CorrelationTab })));
const CitationLab = React.lazy(() => import('./dashboard/CitationLab').then(m => ({ default: m.CitationLab })));
const WinPredictor = React.lazy(() => import('./dashboard/WinPredictor').then(m => ({ default: m.WinPredictor })));

interface DashboardProps {
    report: Report | null;
    onReset: () => void;
    onStartAnalysis: (assets: Asset[], options?: { llmProvider: 'gemini' | 'claude' | 'openai' }) => void;
    isAnalyzing: boolean;
    statusMessage?: string;
    discoveredCount?: number;
    initialTab?: TabType;
}

export const Dashboard: React.FC<DashboardProps> = ({
    report,
    onReset,
    onStartAnalysis,
    isAnalyzing,
    statusMessage,
    discoveredCount,
    initialTab = 'overview'
}) => {
    const { organization, refreshOrganization } = useAuth();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [branding, setBranding] = useState<Branding | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showTopUp, setShowTopUp] = useState(false);

    // Sync URL with Active Tab (SPA Behavior)
    useEffect(() => {
        const url = new URL(window.location.href);
        const currentTabParam = url.searchParams.get('tab');

        if (currentTabParam !== activeTab) {
            url.searchParams.set('tab', activeTab);
            window.history.pushState({}, '', url);
        }
    }, [activeTab]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('topup') === 'success') {
            toast.success('Credits Refilled!', 'Your account balance has been updated.');
            refreshOrganization();
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [refreshOrganization, toast]);

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
        // Wait for rendering to settle and for "isExporting" state to remove non-print elements
        await new Promise(r => setTimeout(r, 600));

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

    return (
        <div className={`min-h-screen transition-all duration-700 relative flex bg-background text-text-primary ${isExporting ? 'bg-white text-slate-900' : ''}`}>

            {/* Sidebar (Desktop) */}
            {!isExporting && (
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onReset={onReset} />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* No Report State -> Input Layer */}
                {!report && activeTab === 'overview' ? (
                    <div className="flex-1 p-6 flex flex-col items-center justify-center">
                        <InputLayer
                            onStartAnalysis={onStartAnalysis}
                            isAnalyzing={isAnalyzing}
                            statusMessage={statusMessage}
                            discoveredCount={discoveredCount}
                        />
                    </div>
                ) : (
                    <>
                        <DashboardHeader
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            auditCredits={organization?.audit_credits_remaining ?? 0}
                            onReset={onReset}
                            onExportPDF={handleExportPDF}
                            onExportCSV={handleExportCSV}
                            onTopUp={() => setShowTopUp(true)}
                            isExporting={isExporting}
                        />

                        <main
                            id="dashboard-content"
                            className={`flex-1 p-4 sm:p-6 lg:ml-64 lg:mt-0 transition-all duration-300 ${isExporting ? 'bg-white !m-0 !p-0' : ''}`}
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
                                        <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
                                    </div>

                                    {report && (
                                        <DashboardPrintHeader
                                            branding={branding}
                                            organizationName={organization?.name}
                                            overallScore={report.overallScore}
                                        />
                                    )}

                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeTab}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <Suspense fallback={<OverviewSkeleton />}>
                                                {activeTab === 'overview' && report && <OverviewTab report={report} setActiveTab={setActiveTab} />}
                                                {activeTab === 'pages' && report && <PagesTab report={report} />}
                                                {activeTab === 'search' && report && <SearchTab report={report} />}
                                                {activeTab === 'benchmark' && report && <BenchmarkTab report={report} />}
                                                {activeTab === 'reports' && report && <ReportTab report={report} />}
                                                {activeTab === 'integrations' && <IntegrationsTab />}
                                                {activeTab === 'sandbox' && <SandboxTab />}
                                                {activeTab === 'consistency' && report && <ConsistencyTab report={report} />}
                                                {activeTab === 'optimization' && <OptimizationTab />}
                                                {activeTab === 'correlation' && report && <CorrelationTab report={report} />}
                                                {activeTab === 'citation-lab' && report && <CitationLab report={report} />}
                                                {activeTab === 'win-predictor' && report && <WinPredictor report={report} />}

                                                {/* Handle Empty State for Tabs requiring report */}
                                                {(!report && activeTab !== 'integrations' && activeTab !== 'sandbox') && (
                                                    <div className="text-center py-20 opacity-50">
                                                        <p>Please run an analysis to view this tab.</p>
                                                    </div>
                                                )}
                                            </Suspense>
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
