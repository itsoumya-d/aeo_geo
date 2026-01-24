import React from 'react';
import { Target, Link, Quote, AlertCircle, TrendingUp, HelpCircle, ArrowRight, Zap, Info } from 'lucide-react';
import { AnalysisReport } from '../_shared/types';

interface CitationLabProps {
    report?: AnalysisReport;
}

export const CitationLab: React.FC<CitationLabProps> = ({ report }) => {
    if (!report) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Target className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Run an audit to view Citation Lab</h3>
                <p className="text-slate-400 max-w-sm">We need to analyze your content to generate AI citation metrics and entity linking data.</p>
            </div>
        );
    }

    const metrics = [
        {
            label: 'Citation Probability',
            value: report.citationProbability || 0,
            icon: Target,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            description: 'Likelihood of an LLM citing your brand as a primary source for relevant queries.'
        },
        {
            label: 'Entity Linking Density',
            value: report.entityLinkingDensity || 0,
            icon: Link,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            description: 'The strength of your semantic connections to industry authorities and knowledge graphs.'
        },
        {
            label: 'Quotability Score',
            value: report.quotabilityScore || 0,
            icon: Quote,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            description: 'How easily your content can be summarized and quoted by generative models.'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Core GEO Metrics */}
            <div className="grid md:grid-cols-3 gap-6">
                {metrics.map((m) => (
                    <div key={m.label} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${m.bg} p-2.5 rounded-xl`}>
                                <m.icon className={`w-5 h-5 ${m.color}`} />
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Engine Score</span>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-slate-400">{m.label}</h4>
                            <div className="flex items-end gap-2 text-3xl font-bold text-white">
                                {m.value}%
                                <TrendingUp className="w-4 h-4 text-emerald-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-slate-500 leading-relaxed font-medium">{m.description}</p>

                        <div className="mt-6 pt-6 border-t border-white/5">
                            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${m.label === 'Citation Probability' ? 'from-blue-600 to-indigo-500' : m.label === 'Entity Linking Density' ? 'from-emerald-600 to-teal-500' : 'from-purple-600 to-pink-500'} transition-all duration-1000`}
                                    style={{ width: `${m.value}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Missing Entities */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-400" />
                            Entity Optimization Opportunities
                        </h3>
                        <div className="p-1 px-2 bg-slate-800 rounded text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {report.missingEntities?.length || 0} Gaps
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-400">Linking your brand to these critical entities via JSON-LD or authoritative citations will significantly boost your GEO authority.</p>
                        <div className="flex flex-wrap gap-2">
                            {report.missingEntities?.map((entity, i) => (
                                <div key={i} className="bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-lg px-3 py-2 flex items-center gap-3 group cursor-help transition-all">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-glow" />
                                    <span className="text-sm font-medium text-slate-200">{entity}</span>
                                    <ArrowRight className="w-3 h-3 text-slate-600 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )) || (
                                    <p className="text-sm text-slate-500 italic">No missing entities detected. Great job!</p>
                                )}
                        </div>
                    </div>
                    <div className="p-6 bg-slate-950/50 border-t border-white/5">
                        <div className="flex items-start gap-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-white mb-1">Strategy: JSON-LD Expansion</p>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Update your Organization schema to include these entities in the <code>mentions</code> and <code>sameAs</code> arrays. This creates a neural link for LLMs during retrieval.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Citation Gap Analysis */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-rose-400" />
                            The Citation Gap
                        </h3>
                    </div>
                    <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                        <div className="mb-6 relative">
                            <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full" />
                            <Target className="w-16 h-16 text-rose-500 relative" />
                        </div>
                        <h4 className="text-xl font-bold text-white mb-4">Competitor Retrieval Advantage</h4>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-left w-full h-full relative group">
                            <Quote className="w-8 h-8 text-slate-800 absolute top-4 right-4" />
                            <p className="text-sm text-slate-300 italic leading-relaxed relative z-10">
                                "{report.citationGap || 'Analyzing the competitive citation landscape...'}"
                            </p>
                        </div>
                    </div>
                    <div className="p-6 bg-rose-500/5 border-t border-rose-500/10">
                        <button className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm border border-rose-500/20">
                            Generate Gap Closure Strategy
                            <Zap className="w-4 h-4 fill-current" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Help/Doc Footer */}
            <div className="flex items-center gap-4 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white">How is this calculated?</h4>
                    <p className="text-xs text-slate-500 mt-0.5">We use semantic similarity and entity linking density across Knowledge Graphs to predict LLM retrieval confidence.</p>
                </div>
                <button className="ml-auto text-xs font-bold text-blue-400 hover:text-blue-300 underline underline-offset-4">
                    Read Documentation
                </button>
            </div>
        </div>
    );
};
