import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, ShieldCheck, Layout, Search, BarChart3, Users, Palette, CheckCircle2, AlertCircle } from 'lucide-react';
import { Report } from '../../types';
import { useToast } from '../Toast';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ReportTabProps {
    report: Report;
}

export const ReportTab: React.FC<ReportTabProps> = ({ report }) => {
    const toast = useToast();
    const printableRef = useRef<HTMLDivElement>(null);
    const [generating, setGenerating] = useState(false);
    const [branding, setBranding] = useState({
        primaryColor: '#6366f1',
        companyName: 'Your Agency',
        logoUrl: '',
        includeBenchmarks: true,
        includeOptimizations: true,
        includePages: true
    });

    const handleExportPDF = async () => {
        if (!printableRef.current) return;
        setGenerating(true);
        toast.info("Generating Report", "Synthesizing executive PDF...");

        const element = printableRef.current;
        const opt = {
            margin: 10,
            filename: `Cognition_Visibility_Report_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        try {
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
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Report Builder Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Configuration Panel */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
                        <h3 className="text-white font-black text-lg mb-6 flex items-center gap-3">
                            <Palette className="w-5 h-5 text-primary" /> White-Label Settings
                        </h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Agency Name</label>
                                <input
                                    type="text"
                                    value={branding.companyName}
                                    onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-primary/50"
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
                                        className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-400 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Information Modules</h4>
                                {[
                                    { id: 'includePages', label: 'Page-Level Audit', icon: FileText },
                                    { id: 'includeBenchmarks', label: 'Competitor Benchmarks', icon: Users },
                                    { id: 'includeOptimizations', label: 'Simulation Library', icon: Zap }
                                ].map((mod) => (
                                    <label key={mod.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-all group">
                                        <div className="flex items-center gap-3">
                                            <mod.icon className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                                            <span className="text-xs font-bold text-slate-300">{mod.label}</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={(branding as any)[mod.id]}
                                            onChange={(e) => setBranding({ ...branding, [mod.id]: e.target.checked })}
                                            className="w-5 h-5 rounded-lg border-white/10 bg-white/5 checked:bg-primary transition-all"
                                        />
                                    </label>
                                ))}
                            </div>
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

                    <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 p-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-4">
                        <BarChart3 className="w-5 h-5" /> Export Raw CSV Matrix
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
                            className="w-[210mm] min-h-[297mm] bg-[#0f172a] text-white p-16 font-sans relative overflow-hidden"
                            style={{ borderTop: `8px solid ${branding.primaryColor}` }}
                        >
                            {/* PDF Header */}
                            <div className="flex justify-between items-start mb-20">
                                <div>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 overflow-hidden" style={{ backgroundColor: branding.primaryColor + '20' }}>
                                            <ShieldCheck style={{ color: branding.primaryColor }} className="w-8 h-8" />
                                        </div>
                                        <h1 className="text-3xl font-black tracking-tighter uppercase">{branding.companyName}</h1>
                                    </div>
                                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">AI Search Visibility Audit</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Generated On</p>
                                    <p className="text-sm font-black">{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                            </div>

                            {/* Dashboard Glance */}
                            <div className="grid grid-cols-2 gap-10 mb-20">
                                <div className="bg-white/[0.03] p-10 rounded-3xl border border-white/5">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Neural Impact Score</span>
                                    <div className="flex items-end gap-3">
                                        <span className="text-6xl font-black text-white">{report.overallScore}</span>
                                        <span className="text-xl text-slate-600 mb-2 font-black">/100</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-6 overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${report.overallScore}%`, backgroundColor: branding.primaryColor }}></div>
                                    </div>
                                </div>
                                <div className="bg-white/[0.03] p-10 rounded-3xl border border-white/5">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Brand Consistency</span>
                                    <div className="flex items-end gap-3">
                                        <span className="text-6xl font-black text-white">{report.brandConsistnecyScore}</span>
                                        <span className="text-xl text-slate-600 mb-2 font-black">%</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-6">Alignment across {report.pages.length} audited nodes</p>
                                </div>
                            </div>

                            {/* Section: Critical Gaps */}
                            <div className="mb-20">
                                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-4">
                                    <div className="h-px flex-1 bg-white/5"></div>
                                    Priority Retrieval Actions
                                    <div className="h-px flex-1 bg-white/5"></div>
                                </h2>
                                <div className="space-y-6">
                                    {report.pages[0]?.recommendations.slice(0, 3).map((rec, i) => (
                                        <div key={i} className="flex gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                                            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${rec.impact === 'HIGH' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                            <div>
                                                <h4 className="text-sm font-black text-white mb-2">{rec.issue}</h4>
                                                <p className="text-xs text-slate-400 leading-relaxed">{rec.instruction}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="absolute bottom-16 left-16 right-16 pt-10 border-t border-white/[0.05] flex justify-between items-center text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                <span>Powered by Cognition AI Visibility Engine</span>
                                <span>Report Ref: {report.id?.slice(0, 8) || 'AUDIT-X'}</span>
                                <span>Confidential & Proprietary</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RefreshCw = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
);

const Zap = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M16 14l-4 4-4-4" /><path d="M12 12v6" /></svg>
);
