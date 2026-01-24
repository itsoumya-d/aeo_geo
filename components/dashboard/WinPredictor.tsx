import React from 'react';
import { TrendingUp, DollarSign, PieChart, BarChart3, ArrowUpRight, ShieldCheck, Zap, Layers } from 'lucide-react';
import { AnalysisReport } from '../_shared/types';

interface WinPredictorProps {
    report?: AnalysisReport;
}

export const WinPredictor: React.FC<WinPredictorProps> = ({ report }) => {
    if (!report) return null;

    const stats = [
        {
            label: 'Conversion Win Probability',
            value: `${report.winProbability || 0}%`,
            sub: 'vs Competitor Avg',
            icon: ShieldCheck,
            color: 'text-indigo-400',
            trend: '+12%'
        },
        {
            label: 'Projected Revenue Lift',
            value: `+${report.projectedRevenueLift || 0}%`,
            sub: 'From Citation Dominance',
            icon: DollarSign,
            color: 'text-emerald-400',
            trend: 'Optimized'
        },
        {
            label: 'Market Share Capture',
            value: `${report.marketShareCapture || 0}%`,
            sub: 'Of AI-Search Intent',
            icon: PieChart,
            color: 'text-blue-400',
            trend: 'Trending'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Executive Highlights */}
            <div className="grid md:grid-cols-3 gap-6">
                {stats.map((s) => (
                    <div key={s.label} className="bg-slate-900 shadow-2xl border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:scale-[1.02] transition-all">
                        <div className="absolute top-0 right-0 p-4">
                            <div className="bg-white/5 p-2 rounded-xl group-hover:bg-primary/20 transition-colors">
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                        </div>
                        <div className="space-y-2 relative z-10">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{s.label}</span>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-4xl font-black text-white">{s.value}</h3>
                                <span className="text-emerald-400 text-xs font-bold flex items-center gap-0.5">
                                    <ArrowUpRight className="w-3 h-3" />
                                    {s.trend}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium">{s.sub}</p>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                    </div>
                ))}
            </div>

            {/* Projection Model Visualization */}
            <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-white/5 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary" />
                                Growth Attribution Model
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Forecasting revenue lift across AI-first search channels.</p>
                        </div>
                        <div className="flex gap-2">
                            {['7D', '30D', '90D'].map(d => (
                                <button key={d} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${d === '30D' ? 'bg-primary text-white' : 'bg-slate-800 text-slate-500'}`}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {[
                            { label: 'Organic Link Clicks', current: 100, projected: 85, color: 'bg-slate-700' },
                            { label: 'AI Citation Conversions', current: 0, projected: 45, color: 'bg-primary shadow-glow' },
                            { label: 'Total Win Opportunity', current: 100, projected: 130, color: 'bg-emerald-500' },
                        ].map((bar) => (
                            <div key={bar.label} className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-slate-300">{bar.label}</span>
                                    <span className="text-xs font-mono text-slate-500">{bar.projected}% efficiency</span>
                                </div>
                                <div className="relative h-3 bg-slate-950 rounded-full overflow-hidden">
                                    <div
                                        className={`absolute inset-y-0 left-0 ${bar.color} transition-all duration-1000 ease-out`}
                                        style={{ width: `${bar.projected}%` }}
                                    />
                                    <div
                                        className="absolute inset-y-0 left-0 bg-white/20 w-[1px] z-10"
                                        style={{ left: `${bar.current}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-3">
                        <Zap className="w-5 h-5 text-primary shrink-0" />
                        <p className="text-xs text-slate-400 leading-relaxed italic">
                            "While traditional organic traffic is projected to decline by 15%, your **AI Citation Dominance** will capture a new 45% intent stream, resulting in a net **30% growth** in total wins."
                        </p>
                    </div>
                </div>

                <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-400" />
                        Competitive Market Capture
                    </h3>
                    <div className="flex-1 flex items-center justify-center p-4">
                        {/* Placeholder for a circular donut/market share chart */}
                        <div className="relative w-48 h-48">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle className="text-slate-800" strokeWidth="10" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                <circle
                                    className="text-primary transition-all duration-1000"
                                    strokeWidth="10"
                                    strokeDasharray={`${report.marketShareCapture}, 100`}
                                    strokeDashoffset="0"
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="40" cx="50" cy="50"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-white">{report.marketShareCapture}%</span>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Captured Share</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Top Competitor</p>
                            <p className="text-sm font-bold text-slate-200">Competitor A (12%)</p>
                        </div>
                        <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Growth Forecast</p>
                            <p className="text-sm font-bold text-emerald-400">+5.2% Q/Q</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* BI Integration Footer */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-8 bg-slate-900/50 border border-white/5 rounded-3xl">
                <div className="flex-1 space-y-2">
                    <h4 className="text-lg font-bold text-white">Unlock Full BI Integration</h4>
                    <p className="text-sm text-slate-500">Connect your Salesforce or HubSpot account to calibrate Win Probability against your actual historical lead-to-close data.</p>
                </div>
                <button className="whitespace-nowrap bg-white text-slate-950 font-black px-8 py-3 rounded-2xl hover:bg-slate-200 transition-colors flex items-center gap-2">
                    Sync CRM Data
                    <ArrowUpRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
