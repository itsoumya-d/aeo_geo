import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Target, Shield, Zap, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface VectorData {
    x: number;
    y: number;
    z?: number;
    label: string;
    type: 'brand' | 'competitor' | 'keyword' | 'your_content' | 'gold_standard' | 'optimization_target';
}

interface VectorMapProps {
    data: VectorData[];
}

export const VectorMap: React.FC<VectorMapProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-blue-50 backdrop-blur-xl border border-white/5 rounded-3xl p-16 text-center h-full flex flex-col items-center justify-center shadow-2xl"
            >
                <div className="w-20 h-20 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6 shadow-inner">
                    <Target className="w-10 h-10 text-slate-700" />
                </div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Semantic map unavailable</p>
                <p className="text-slate-600 text-xs mt-2 max-w-[240px] leading-relaxed">
                    This report doesn’t include semantic mapping yet. Run another audit once mapping is enabled for your plan.
                </p>
            </motion.div>
        );
    }

    const brandCount = data.filter((d) => d.type === 'brand').length;
    const competitorCount = data.filter((d) => d.type === 'competitor').length;
    const keywordCount = data.filter((d) => d.type === 'keyword').length;

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload as VectorData;
            return (
                <div className="bg-surface backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-3 h-3 rounded-full ${item.type === 'brand' ? 'bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]' : item.type === 'competitor' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]'}`} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.type}</span>
                    </div>
                    <p className="text-sm font-black text-white tracking-tight">{item.label}</p>
                    <p className="mt-2 text-xs text-text-muted">
                        Relative position based on this audit’s semantic signals.
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-50 backdrop-blur-xl rounded-3xl border border-white/5 p-10 shadow-2xl relative overflow-hidden h-full group"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
                <Target className="w-48 h-48 text-primary" />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
                <div>
                    <h3 className="text-white font-black text-xl tracking-tight flex items-center gap-3">
                        <Target className="w-6 h-6 text-primary" />
                        Semantic map
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-2">
                        <Info className="w-3.5 h-3.5" />
                        Relative positioning of your brand, competitors, and keywords.
                    </p>
                </div>
                <div className="flex flex-wrap gap-4 sm:gap-6 text-[10px] font-black uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-2 text-primary">
                        <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> Brand
                    </span>
                    <span className="flex items-center gap-2 text-rose-400">
                        <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" /> Competitors
                    </span>
                    {keywordCount > 0 && (
                        <span className="flex items-center gap-2 text-blue-400">
                            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" /> Keywords
                        </span>
                    )}
                </div>
            </div>

            <div className="h-[280px] sm:h-[380px] lg:h-[450px] w-full relative">
                {/* Background Grid */}
                <div className="absolute inset-0 border border-white/[0.03] rounded-3xl pointer-events-none overflow-hidden">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-white/[0.05]" />
                    <div className="absolute top-0 left-1/2 h-full w-px bg-white/[0.05]" />
                    {/* Add some subtle circular patterns */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/[0.02] rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-white/[0.02] rounded-full" />
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 30, right: 30, bottom: 20, left: 30 }}>
                        <XAxis type="number" dataKey="x" hide domain={[-120, 120]} />
                        <YAxis type="number" dataKey="y" hide domain={[-120, 120]} />
                        <ZAxis type="number" range={[200, 600]} />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '4 4', stroke: 'rgba(255,255,255,0.1)' }} />
                        <Scatter name="Vectors" data={data}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.type === 'brand' ? '#6366f1' : entry.type === 'competitor' ? '#f43f5e' : '#3b82f6'}
                                    className="filter drop-shadow-[0_0_12px_rgba(99,102,241,0.4)] cursor-pointer hover:stroke-white hover:stroke-2 transition-all outline-none"
                                />
                            ))}
                            <LabelList
                                dataKey="label"
                                position="top"
                                offset={15}
                                style={{ fill: '#64748b', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', pointerEvents: 'none', letterSpacing: '0.05em' }}
                            />
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 flex items-center justify-between"
                >
                    <div>
                        <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest block mb-1.5 opacity-60">Mapped items</span>
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-emerald-400" />
                            <span className="text-white font-black text-lg tracking-tight">{data.length}</span>
                        </div>
                    </div>
                    <div className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/10 uppercase">
                        {brandCount} brand
                    </div>
                </motion.div>
                <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 flex items-center justify-between"
                >
                    <div>
                        <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest block mb-1.5 opacity-60">Competitor set</span>
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-amber-400" />
                            <span className="text-white font-black text-lg tracking-tight">{competitorCount}</span>
                        </div>
                    </div>
                    <div className="text-[9px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/10 uppercase">
                        {keywordCount} keywords
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};
