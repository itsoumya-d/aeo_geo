import React, { useState, useEffect } from 'react';
import { Report } from '../types';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { motion, AnimatePresence } from 'framer-motion';

import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { TopUpModal } from './TopUpModal';

// Refactored Components
import { DashboardHeader } from './dashboard/DashboardHeader';
import { DashboardPrintHeader } from './dashboard/DashboardPrintHeader';
import { OverviewTab } from './dashboard/OverviewTab';
import { PagesTab } from './dashboard/PagesTab';
import { SearchTab } from './dashboard/SearchTab';
import { ConsistencyTab } from './dashboard/ConsistencyTab';
import { OptimizationTab } from './dashboard/OptimizationTab';
import { BenchmarkTab } from './dashboard/BenchmarkTab';
import { ReportTab } from './dashboard/ReportTab';
import { IntegrationsTab } from './dashboard/IntegrationsTab';
import { HistoryTab } from './dashboard/HistoryTab';
import { SandboxTab } from './dashboard/SandboxTab';
import { SettingsTab } from './dashboard/SettingsTab';
import { CorrelationTab } from './dashboard/CorrelationTab';
import { TabType, Branding } from './dashboard/DashboardTypes';
import { MobileBottomNav } from './dashboard/MobileBottomNav';

interface DashboardProps {
    report: Report;
    onReset: () => void;
}

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
            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error('PDF Export Error:', err);
            toast.error('Export Failed', 'Could not generate PDF report.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className={`min-h-screen pb-20 transition-all duration-700 relative overflow-x-hidden ${isExporting ? 'bg-white text-slate-900' : 'bg-[#020617] text-slate-200 shadow-inner'}`}>

            {/* Dynamic Background Elements */}
            {!isExporting && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] opacity-40 animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] opacity-30" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03)_0%,transparent_70%)]" />
                </div>
            )}

            <div className="relative z-10">
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

                <TopUpModal isOpen={showTopUp} onClose={() => setShowTopUp(false)} />
                <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

                <main id="dashboard-content" className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-12">
                    <DashboardPrintHeader
                        branding={branding}
                        organizationName={organization?.name}
                        overallScore={report.overallScore}
                    />

                    <div className="relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, scale: 0.99, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.01, y: -10 }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            >
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
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
};

const ConsistencyCard = ({ title, score, desc }: { title: string, score: number, desc: string }) => (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-left hover:border-slate-600 transition-colors">
        <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-white">{title}</h4>
            <span className={`text-xs font-bold px-2 py-1 rounded ${score > 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                Match: {Math.min(100, Math.max(0, score))}%
            </span>
        </div>
        <p className="text-sm text-slate-400">{desc}</p>
    </div>
);
