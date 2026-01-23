import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { getVisibilityTrends, VisibilityDataPoint, Timeframe } from '../services/analyticsService';
import { useAuth } from '../contexts/AuthContext';
import { Skeleton } from './Skeleton';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const VisibilityTrendChart: React.FC = () => {
    const { organization } = useAuth();
    const [timeframe, setTimeframe] = useState<Timeframe>('30d');
    const [data, setData] = useState<VisibilityDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (organization?.id) {
            fetchData();
        }
    }, [organization?.id, timeframe]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getVisibilityTrends(organization!.id, timeframe);
            setData(result);
        } catch (err) {
            setError('Failed to load visibility data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const calculateMomentum = () => {
        if (data.length < 2) return 0;
        const latest = data[data.length - 1].score;
        const baseline = data[0].score;
        if (baseline === 0) return latest;
        return Math.round(((latest - baseline) / baseline) * 100);
    };

    const momentum = calculateMomentum();

    if (loading && data.length === 0) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <Skeleton width={120} height={12} />
                        <Skeleton width={150} height={32} />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton width={60} height={28} rounded="full" />
                        <Skeleton width={60} height={28} rounded="full" />
                    </div>
                </div>
                <Skeleton height={280} className="w-full" rounded="2xl" />
            </div>
        );
    }

    return (
        <div className="relative group">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 sm:mb-10">
                <div>
                    <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Visibility Momentum</h3>
                    <div className="flex items-center gap-3 mt-2">
                        <p className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
                            {momentum > 0 ? `+${momentum}%` : `${momentum}%`}
                        </p>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase ${momentum > 0 ? 'bg-emerald-500/10 text-emerald-400' :
                                momentum < 0 ? 'bg-rose-500/10 text-rose-400' :
                                    'bg-slate-500/10 text-slate-400'
                            }`}>
                            {momentum > 0 ? <TrendingUp className="w-3 h-3" /> :
                                momentum < 0 ? <TrendingDown className="w-3 h-3" /> :
                                    <Minus className="w-3 h-3" />}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    {/* Timeframe Selector */}
                    <div className="flex p-1 bg-white/[0.03] border border-white/5 rounded-full">
                        {(['7d', '30d', '90d'] as Timeframe[]).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === tf ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-4 sm:gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Brand</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-700" />
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Market Avg</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`h-72 w-full transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {error ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                        <p className="text-sm text-rose-400 font-medium mb-4">{error}</p>
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-all"
                        >
                            <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ left: -20, right: 0, top: 10 }}>
                            <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                domain={[0, 100]}
                                dx={-5}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    borderColor: 'rgba(255,255,255,0.08)',
                                    borderRadius: '16px',
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                                    color: '#fff',
                                    padding: '12px 16px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                                itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                labelStyle={{ color: '#64748b', fontSize: '9px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}
                                cursor={{ stroke: 'rgba(99, 102, 241, 0.4)', strokeWidth: 2 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="score"
                                stroke="#6366f1"
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorScore)"
                                animationDuration={1000}
                                activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2, fill: '#fff' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="competitorAvg"
                                stroke="rgba(148, 163, 184, 0.3)"
                                strokeWidth={2}
                                strokeDasharray="6 6"
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            <AnimatePresence>
                {!loading && data.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white/[0.02] rounded-2xl border border-white/[0.05] hover:bg-white/[0.03] transition-colors"
                    >
                        <div className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed">
                            <span className="text-emerald-400 font-black mr-2 uppercase tracking-widest text-[9px] sm:text-[10px]">Trend Insight</span>
                            Your visibility has {momentum > 0 ? 'increased' : momentum < 0 ? 'decreased' : 'stayed stable'} by <span className="text-white font-bold">{Math.abs(momentum)}%</span> over the last {timeframe === '7d' ? 'week' : timeframe === '30d' ? 'month' : 'quarter'}.
                        </div>
                        <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors text-left sm:text-right">Full Analysis →</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
