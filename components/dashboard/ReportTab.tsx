import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Download, ShieldCheck, Layout, Search, BarChart3, Users, Palette, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Report } from '../../types';
import { useToast } from '../Toast';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

// html2pdf is lazy-loaded on demand to reduce initial bundle size (984KB)

interface ReportTabProps {
    report: Report;
}
// --- Dynamic Section Components ---

const SectionSummary = ({ report, branding }: { report: Report, branding: any }) => (
    <div className="mb-20">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/5"></div>
            Executive Summary
            <div className="h-px flex-1 bg-white/5"></div>
        </h2>
        <div className="grid grid-cols-2 gap-10">
            <div className="bg-white p-10 rounded-3xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Overall Visibility Score</span>
                <div className="flex items-end gap-3">
                    <span className="text-6xl font-black text-slate-900">{report.overallScore}</span>
                    <span className="text-xl text-slate-600 mb-2 font-black">/100</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-6 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${report.overallScore}%`, backgroundColor: branding.primaryColor }}></div>
                </div>
            </div>
            <div className="bg-white p-10 rounded-3xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Brand Consistency</span>
                <div className="flex items-end gap-3">
                    <span className="text-6xl font-black text-slate-900">{report.brandConsistencyScore}</span>
                    <span className="text-xl text-slate-600 mb-2 font-black">%</span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-6">Alignment across {report.pages.length} audited pages</p>
            </div>
        </div>
    </div>
);

const SectionRecommendations = ({ report }: { report: Report }) => (
    <div className="mb-20">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/5"></div>
            Priority Actions
            <div className="h-px flex-1 bg-white/5"></div>
        </h2>
        <div className="space-y-6">
            {report.pages[0]?.recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className="flex gap-6 p-6 rounded-2xl bg-white border border-slate-200">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${rec.impact === 'HIGH' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                    <div>
                        <h4 className="text-sm font-black text-slate-900 mb-2">{rec.issue}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{rec.instruction}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SectionCompetitors = ({ report }: { report: Report }) => (
    <div className="mb-20">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/5"></div>
            Competitor Landscape
            <div className="h-px flex-1 bg-white/5"></div>
        </h2>
        <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center">
            <p className="text-slate-500 text-sm">Competitor benchmarking data not available in this snapshot.</p>
        </div>
    </div>
);

const SectionTrends = ({ report }: { report: Report }) => (
    <div className="mb-20 break-inside-avoid">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/5"></div>
            Visibility Trends (30d)
            <div className="h-px flex-1 bg-white/5"></div>
        </h2>
        <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center">
            <p className="text-slate-500 text-sm">
                Trendlines appear after you run multiple audits over time.
            </p>
        </div>
    </div>
);

// Map of ID to Component
const SECTION_COMPONENTS: Record<string, React.FC<{ report: Report, branding: any }>> = {
    'summary': SectionSummary,
    'score': SectionSummary, // Reusing summary logic for score for now, or could split
    'recommendations': SectionRecommendations,
    'competitors': SectionCompetitors,
    'trends': SectionTrends
};

export const ReportTab: React.FC<ReportTabProps> = ({ report }) => {
    const navigate = useNavigate();
    const { organization } = useAuth();
    const toast = useToast();
    const printableRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);
    const [template, setTemplate] = useState<any[]>([]);

    // Default branding state
    const [branding, setBranding] = useState({
        primaryColor: '#6366f1',
        companyName: 'Your Agency',
        logoUrl: '',
        includeBenchmarks: true,
        includeOptimizations: true,
        includePages: true,
        hideCognitionBranding: false
    });

    // Fetch Template & Branding
    React.useEffect(() => {
        if (!organization) return;

        const fetchData = async () => {
            // Fetch Template
            const { data: templateData } = await supabase
                .from('report_templates')
                .select('layout')
                .eq('organization_id', organization.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (templateData?.layout && Array.isArray(templateData.layout)) {
                setTemplate(templateData.layout);
            } else {
                setTemplate([
                    { type: 'summary' },
                    { type: 'recommendations' }
                ]);
            }

            // Fetch Branding
            const { data: brandingData } = await supabase
                .from('organization_branding')
                .select('*')
                .eq('organization_id', organization.id)
                .single();

            if (brandingData) {
                setBranding(prev => ({
                    ...prev,
                    primaryColor: brandingData.primary_color || prev.primaryColor,
                    companyName: brandingData.company_name || organization.name || prev.companyName,
                    logoUrl: brandingData.logo_url || prev.logoUrl,
                    hideCognitionBranding: brandingData.hide_cognition_branding || false
                }));
            } else {
                setBranding(prev => ({
                    ...prev,
                    companyName: organization.name || 'Your Company'
                }));
            }
        };

        fetchData();
    }, [organization]);

    const handleExportCSV = () => {
        const rows: string[][] = [['Page URL', 'Title', 'Type', 'Quote Likelihood', 'AI Understanding', 'AI Missed']];
        report.pages.forEach(page => {
            rows.push([page.url, page.title, page.pageType, String(page.quoteLikelihood), page.aiUnderstanding, page.aiMissed]);
        });
        const csv = rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Cognition_Report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV Exported", "Report data downloaded as CSV.");
    };

    const handleExportJSON = () => {
        const exportData = {
            id: report.id,
            overallScore: report.overallScore,
            brandConsistencyScore: report.brandConsistencyScore,
            platformScores: report.platformScores,
            pages: report.pages.map(p => ({
                url: p.url,
                title: p.title,
                pageType: p.pageType,
                quoteLikelihood: p.quoteLikelihood,
                aiUnderstanding: p.aiUnderstanding,
                aiMissed: p.aiMissed,
                recommendations: p.recommendations.map(r => ({ issue: r.issue, instruction: r.instruction, impact: r.impact, effort: r.effort }))
            })),
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Cognition_Report_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("JSON Exported", "Report data downloaded as JSON.");
    };

    const handleExportPDF = async () => {
        if (!printableRef.current) return;
        setGenerating(true);
        toast.info("Generating Report", "Synthesizing executive PDF...");

        try {
            // Lazy load html2pdf.js to reduce initial bundle size (984KB → 0KB initial)
            const html2pdf = (await import('html2pdf.js')).default;

            const element = printableRef.current;
            const opt = {
                margin: 0,
                filename: `Cognition_Visibility_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
                jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await html2pdf().set(opt).from(element).save();
            toast.success("Export Complete", "Branded report downloaded.");
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Export Failed", "Could not generate PDF at this time.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-12">
            {/* Report Builder Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Configuration Panel */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white backdrop-blur-xl border border-slate-200 rounded-3xl p-8 shadow-xl">
                        <h3 className="text-slate-900 font-black text-lg mb-6 flex items-center gap-3">
                            <Palette className="w-5 h-5 text-primary" /> White-Label Settings
                        </h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Agency Name</label>
                                <input
                                    type="text"
                                    value={branding.companyName}
                                    onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold outline-none focus:border-primary/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Brand Color</label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        value={branding.primaryColor}
                                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                        className="w-12 h-12 rounded-xl bg-transparent border border-white/10 cursor-pointer overflow-hidden"
                                    />
                                    <input
                                        type="text"
                                        value={branding.primaryColor}
                                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white backdrop-blur-xl border border-slate-200 rounded-3xl p-8 shadow-xl">
                        <h3 className="text-slate-900 font-black text-lg mb-6 flex items-center gap-3">
                            <Download className="w-5 h-5 text-emerald-400" /> Export Format
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'pdf', label: 'PDF', icon: <FileText className="w-4 h-4" />, desc: 'Branded report', handler: handleExportPDF },
                                { id: 'csv', label: 'CSV', icon: <BarChart3 className="w-4 h-4" />, desc: 'Data export', handler: handleExportCSV },
                                { id: 'json', label: 'JSON', icon: <Search className="w-4 h-4" />, desc: 'API format', handler: handleExportJSON }
                            ].map((fmt) => (
                                <button key={fmt.id} onClick={fmt.handler} className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-primary/30 transition-all text-center group">
                                    <div className="text-primary mb-2 flex justify-center">{fmt.icon}</div>
                                    <p className="text-xs font-bold text-slate-900">{fmt.label}</p>
                                    <p className="text-[9px] text-slate-500 mt-1">{fmt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleExportPDF}
                        disabled={generating}
                        className="w-full bg-primary hover:bg-primary/90 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20 transition-all flex items-center justify-center gap-4 group"
                    >
                        {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform" />}
                        {generating ? 'Synthesizing...' : 'Generate Executive PDF'}
                    </button>

                    <button
                        onClick={() => navigate('/reports/builder')}
                        className="w-full bg-transparent hover:bg-white/5 border border-white/10 text-text-muted p-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-4"
                    >
                        <Layout className="w-5 h-5" /> Customize Template
                    </button>
                </div>

                {/* Live Preview Panel */}
                <div className="lg:col-span-8 bg-slate-950 rounded-3xl border border-white/5 shadow-inner overflow-hidden flex flex-col items-center p-10 relative">
                    <div className="absolute top-6 left-6 flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest bg-white/[0.02] px-3 py-1.5 rounded-full border border-white/5">
                        <Layout className="w-3 h-3" /> Live Report Preview (A4 Scale)
                    </div>

                    {/* Scale Wrapper to fit A4 in the preview window */}
                    <div className="scale-[0.6] sm:scale-[0.8] lg:scale-[0.85] origin-top shadow-2xl">
                        <div
                            ref={printableRef}
                            className="w-[210mm] min-h-[297mm] bg-surface text-white p-16 font-sans relative overflow-hidden flex flex-col"
                            style={{ borderTop: `8px solid ${branding.primaryColor}` }}
                        >
                            {/* PDF Header - Fixed */}
                            <div className="flex justify-between items-start mb-20">
                                <div>
                                    <div className="flex items-center gap-4 mb-4">
                                        {branding.logoUrl ? (
                                            <img
                                                src={branding.logoUrl}
                                                className="h-12 w-auto object-contain rounded-lg"
                                                alt="Logo"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden" style={{ backgroundColor: branding.primaryColor + '20' }}>
                                                <ShieldCheck style={{ color: branding.primaryColor }} className="w-8 h-8" />
                                            </div>
                                        )}
                                        <h1 className="text-3xl font-black tracking-tighter uppercase">{branding.companyName}</h1>
                                    </div>
                                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">AI Search Visibility Audit</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Generated On</p>
                                    <p className="text-sm font-black">{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                            </div>

                            {/* Dynamic Sections */}
                            <div className="flex-1">
                                {template.map((item, index) => {
                                    const Component = SECTION_COMPONENTS[item.type];
                                    if (!Component) return null;
                                    return <Component key={index} report={report} branding={branding} />;
                                })}
                            </div>

                            {/* Footer - Fixed */}
                            <div className="mt-auto pt-10 border-t border-white/[0.05] flex justify-between items-center text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                <span>{!branding.hideCognitionBranding && "Powered by Cognition AI Visibility Engine"}</span>
                                <span>Report Ref: {report.id?.slice(0, 8) || 'AUDIT-X'}</span>
                                <span>Confidential & Proprietary</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
