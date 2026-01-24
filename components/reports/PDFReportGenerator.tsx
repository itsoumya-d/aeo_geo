
import React from 'react';
import { Report, Recommendation } from '../../types';
import { Branding } from '../dashboard/DashboardTypes';
import { DashboardPrintHeader } from '../dashboard/DashboardPrintHeader';
import { CheckCircle2, AlertTriangle, XCircle, Trophy, Target, Award } from 'lucide-react';

interface PDFReportGeneratorProps {
    report: Report;
    branding: Branding | null;
    organizationName?: string;
}

export const PDFReportGenerator: React.FC<PDFReportGeneratorProps> = ({ report, branding, organizationName }) => {

    // Helper to get priority color
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
            case 'MEDIUM': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'LOW': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="bg-white text-slate-900 w-full max-w-[210mm] mx-auto p-8 print:p-0">
            {/* Page 1: Executive Summary */}
            <div className="min-h-[297mm] relative flex flex-col">
                <DashboardPrintHeader
                    branding={branding}
                    organizationName={organizationName}
                    overallScore={report.overallScore}
                />

                <div className="space-y-8 flex-1">
                    <section>
                        <h2 className="text-xl font-bold border-b-2 border-slate-100 pb-2 mb-4 text-slate-800">Executive Summary</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">AI Consistency</div>
                                <div className="flex items-end gap-2 mb-1">
                                    <span className="text-3xl font-black text-slate-900">{report.brandConsistnecyScore}%</span>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed">{report.consistencyAnalysis}</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Topical Authority</div>
                                <div className="flex flex-wrap gap-2">
                                    {report.topicalDominance.slice(0, 5).map((topic, i) => (
                                        <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700">
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b-2 border-slate-100 pb-2 mb-4 text-slate-800">Platform Breakdown</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {report.platformScores.map((platform, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 border border-slate-100 rounded-lg">
                                    <div className="w-24 flex-shrink-0">
                                        <div className="text-sm font-bold text-slate-900">{platform.platform}</div>
                                        <div className={`text-2xl font-black ${platform.score > 80 ? 'text-green-600' : platform.score > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                            {platform.score}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 flex-1">{platform.reasoning}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold border-b-2 border-slate-100 pb-2 mb-4 text-slate-800">SEO Technical Audit</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Implemented
                                </h3>
                                <ul className="space-y-1">
                                    {report.seoAudit.implemented.slice(0, 5).map((item, i) => (
                                        <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                            <span className="mt-1 w-1 h-1 bg-green-400 rounded-full flex-shrink-0"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                                    <XCircle className="w-4 h-4" /> Missing / Critical
                                </h3>
                                <ul className="space-y-1">
                                    {report.seoAudit.missing.slice(0, 5).map((item, i) => (
                                        <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                            <span className="mt-1 w-1 h-1 bg-red-400 rounded-full flex-shrink-0"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-auto pt-8 border-t border-slate-200 flex justify-between text-xs text-slate-400">
                    <span>Generated by Cognition AI</span>
                    <span>Page 1 of {Math.ceil((report.pages.reduce((acc, p) => acc + p.recommendations.length, 0) / 4) + 1)}</span>
                </div>
            </div>

            {/* Page Safety Break */}
            <div className="break-before-page"></div>

            {/* Page 2+: Recommendations */}
            <div className="min-h-[297mm] relative flex flex-col pt-8">
                <DashboardPrintHeader
                    branding={branding}
                    organizationName={organizationName}
                    overallScore={report.overallScore}
                />

                <h2 className="text-xl font-bold border-b-2 border-slate-100 pb-2 mb-6 text-slate-800">Strategic Recommendations</h2>

                <div className="space-y-6">
                    {report.pages.flatMap(p => p.recommendations.map(r => ({ ...r, pageUrl: p.url })))
                        .sort((a, b) => (a.impact === 'HIGH' ? -1 : 1))
                        .map((rec, i) => (
                            <div key={rec.id} className="break-inside-avoid border border-slate-200 rounded-lg p-5 bg-white shadow-sm mb-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(rec.impact)}`}>
                                                {rec.impact} Impact
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono decoration-slate-300 underline underline-offset-2">
                                                {rec.pageUrl}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-sm">{rec.issue}</h3>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(rec.effort)}`}>
                                            {rec.effort} Effort
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 text-xs">
                                    <div className="bg-slate-50 p-3 rounded border border-slate-100">
                                        <span className="font-bold text-slate-700 block mb-1">Action Required</span>
                                        <p className="text-slate-600">{rec.instruction}</p>
                                    </div>
                                    <div className="bg-blue-50/50 p-3 rounded border border-blue-100">
                                        <span className="font-bold text-blue-800 block mb-1">AI Reasoning</span>
                                        <p className="text-blue-700/80 italic">"{rec.aiReasoning}"</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>

                <div className="mt-auto pt-8 border-t border-slate-200 flex justify-between text-xs text-slate-400">
                    <span>Generated by Cognition AI</span>
                    <span>End of Report</span>
                </div>
            </div>
        </div>
    );
};
