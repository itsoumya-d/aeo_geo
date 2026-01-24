import React, { useState, useEffect, Suspense } from 'react';
import { Report } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { TopUpModal } from './TopUpModal';

// Components
import { DashboardHeader } from './dashboard/DashboardHeader';
import { Sidebar } from './dashboard/Sidebar';
import { DashboardPrintHeader } from './dashboard/DashboardPrintHeader';
import { TabType, Branding } from './dashboard/DashboardTypes';
import { MobileBottomNav } from './dashboard/MobileBottomNav';

// Lazy Load Tabs
const OverviewTab = React.lazy(() => import('./dashboard/OverviewTab').then(m => ({ default: m.OverviewTab })));
const PagesTab = React.lazy(() => import('./dashboard/PagesTab').then(m => ({ default: m.PagesTab })));
const SearchTab = React.lazy(() => import('./dashboard/SearchTab').then(m => ({ default: m.SearchTab })));
const ConsistencyTab = React.lazy(() => import('./dashboard/ConsistencyTab').then(m => ({ default: m.ConsistencyTab })));
const OptimizationTab = React.lazy(() => import('./dashboard/OptimizationTab').then(m => ({ default: m.OptimizationTab })));
const BenchmarkTab = React.lazy(() => import('./dashboard/BenchmarkTab').then(m => ({ default: m.BenchmarkTab })));
const ReportTab = React.lazy(() => import('./dashboard/ReportTab').then(m => ({ default: m.ReportTab })));
const IntegrationsTab = React.lazy(() => import('./dashboard/IntegrationsTab').then(m => ({ default: m.IntegrationsTab })));
const HistoryTab = React.lazy(() => import('./dashboard/HistoryTab').then(m => ({ default: m.HistoryTab })));
const SandboxTab = React.lazy(() => import('./dashboard/SandboxTab').then(m => ({ default: m.SandboxTab })));
const SettingsTab = React.lazy(() => import('./dashboard/SettingsTab').then(m => ({ default: m.SettingsTab })));
const CorrelationTab = React.lazy(() => import('./dashboard/CorrelationTab').then(m => ({ default: m.CorrelationTab })));

interface DashboardProps {
    report: Report;
    onReset: () => void;
}

const TabLoading = () => (
    <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ report, onReset }) => {
    const { organization, refreshOrganization } = useAuth();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [branding, setBranding] = useState<Branding | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showTopUp, setShowTopUp] = useState(false);

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
                    className="flex-1 p-4 sm:p-6 lg:ml-64 lg:mt-0 transition-all duration-300"
                >
                    {!isExporting && <div className="max-w-7xl mx-auto">
                        <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} />
                        {/* Mobile Bottom Nav */}
                        <div className="lg:hidden">
                            <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
                        </div>
                    </div>}

                    <div className="max-w-7xl mx-auto">
                        <DashboardPrintHeader
                            branding={branding}
                            organizationName={organization?.name}
                            overallScore={report.overallScore}
                        />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Suspense fallback={<TabLoading />}>
                                    {activeTab === 'overview' && <OverviewTab report={report} setActiveTab={setActiveTab} />}
                                    {activeTab === 'pages' && <PagesTab report={report} />}
                                    {activeTab === 'search' && <SearchTab report={report} />}
                                    {activeTab === 'benchmark' && <BenchmarkTab report={report} />}
                                    {activeTab === 'reports' && <ReportTab report={report} />}
                                    {activeTab === 'integrations' && <IntegrationsTab />}
                                    {activeTab === 'history' && <HistoryTab currentReport={report} />}
                                    {activeTab === 'sandbox' && <SandboxTab />}
                                    {activeTab === 'settings' && <SettingsTab />}
                                    {activeTab === 'consistency' && <ConsistencyTab report={report} />}
                                    {activeTab === 'optimization' && <OptimizationTab />}
                                    {activeTab === 'correlation' && <CorrelationTab report={report} />}
                                </Suspense>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
};
