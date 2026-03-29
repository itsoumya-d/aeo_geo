import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Code2, CheckCircle2, AlertTriangle, XCircle, Copy, Check } from 'lucide-react';
import { VectorLab } from '../VectorLab';
import { useAuditStore } from '../../stores';
import { SchemaPageResult } from '../../types';

function StatusDot({ count }: { count: number }) {
    if (count === 0) return <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />;
    if (count <= 2) return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />;
    return <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all"
        >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy JSON-LD</>}
        </button>
    );
}

function SchemaPageCard({ page }: { page: SchemaPageResult }) {
    const [expanded, setExpanded] = useState(false);
    const hasIssues = page.issues.length > 0 || page.missingTypes.length > 0;

    return (
        <div className={`bg-white border rounded-xl overflow-hidden ${hasIssues ? 'border-amber-200' : 'border-green-200'}`}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <StatusDot count={page.issues.length + page.missingTypes.length} />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{page.url}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {page.existingSchemas.length > 0 ? (
                                page.existingSchemas.map(s => (
                                    <span key={s} className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-medium">{s}</span>
                                ))
                            ) : (
                                <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-medium">No schema</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0 text-xs text-slate-500">
                    {page.missingTypes.length > 0 && (
                        <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded font-medium">
                            {page.missingTypes.length} missing
                        </span>
                    )}
                    <span className={`transition-transform ${expanded ? 'rotate-180' : ''} text-slate-400`}>▼</span>
                </div>
            </button>

            {expanded && (
                <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50">
                    {page.issues.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Validation Issues</span>
                            </div>
                            <div className="space-y-1">
                                {page.issues.map((issue, i) => (
                                    <p key={i} className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-1.5">{issue}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {page.missingTypes.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Missing Schema Types</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {page.missingTypes.map(t => (
                                    <span key={t} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">{t}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {page.generatedSchema && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <Code2 className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Generated JSON-LD</span>
                                </div>
                                <CopyButton text={page.generatedSchema} />
                            </div>
                            <pre className="bg-slate-900 text-green-400 text-[11px] p-3 rounded-lg overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {page.generatedSchema}
                            </pre>
                            {page.impactStatement && (
                                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                    {page.impactStatement}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export const OptimizationTab: React.FC = () => {
    const { report } = useAuditStore();

    if (!report) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
            >
                <div className="bg-blue-50 p-4 rounded-2xl mb-4 border border-blue-100">
                    <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Optimization data not yet available</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                    Run your first audit to generate optimization data.
                </p>
            </motion.div>
        );
    }

    const schema = report.schemaAnalysis;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-10"
        >
            {/* Schema Health Section */}
            {schema ? (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-blue-100">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-xl">
                                    <Code2 className="text-blue-600 w-5 h-5" />
                                </div>
                                Schema Health
                            </h2>
                            <p className="text-slate-500 mt-1 text-sm">62% of AI citations come from pages with structured schema markup.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`text-3xl font-black ${schema.overallHealth < 40 ? 'text-red-600' : schema.overallHealth < 70 ? 'text-amber-600' : 'text-green-600'}`}>
                                {schema.overallHealth}
                                <span className="text-base font-medium text-slate-400">/100</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Pages Analyzed', value: schema.pagesAnalyzed },
                            { label: 'Pages With Schema', value: schema.pagesWithSchema },
                            { label: 'Without Schema', value: schema.pagesAnalyzed - schema.pagesWithSchema },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-white border border-blue-100 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-slate-800">{value}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Site-wide missing types */}
                    {schema.missingTypesAcrossSite.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-bold text-amber-800">Missing Site-Wide Schema Types</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {schema.missingTypesAcrossSite.map(t => (
                                    <span key={t} className="text-xs bg-white text-amber-700 border border-amber-300 px-2.5 py-1 rounded-lg font-semibold">{t}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Per-page breakdown */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Page-by-Page Schema</h3>
                        {schema.pages.map(page => (
                            <SchemaPageCard key={page.url} page={page} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
                    <Code2 className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-slate-700 mb-1">Schema analysis not available</h3>
                    <p className="text-sm text-slate-500">Schema validation runs automatically during your next audit.</p>
                </div>
            )}

            {/* Vector Analysis Section */}
            {report.vectorMap?.length ? (
                <div>
                    <div className="pb-5 border-b border-blue-100 mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-xl">
                                <Zap className="text-blue-600 w-5 h-5" />
                            </div>
                            Vector Semantic Analysis
                        </h2>
                        <p className="text-slate-500 mt-1 text-sm">Semantic shift measurement — your unique competitive moat.</p>
                    </div>
                    <VectorLab data={report.vectorMap} />
                </div>
            ) : null}
        </motion.div>
    );
};
