import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { getVisibilityTrends, VisibilityDataPoint, Timeframe } from '../services/analyticsService';
import { useAuth } from '../contexts/AuthContext';
import { Skeleton } from './ui/Skeleton';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export const VisibilityTrendChart: React.FC = () => {
    const { organization, currentWorkspace } = useAuth();
    const [timeframe, setTimeframe] = useState<Timeframe>('30d');
    const [data, setData] = useState<VisibilityDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (organization?.id) {
            fetchData();
        }
    }, [organization?.id, currentWorkspace?.id, timeframe]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getVisibilityTrends(organization!.id, timeframe, currentWorkspace?.id);
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
    const hasBenchmarks = data.some((d) => typeof d.competitorAvg === 'number' && d.competitorAvg !== null);

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

    if (!loading && data.length === 0 && !error) {
        return (
            <div className="bg-surface/40 border border-border rounded-2xl p-8">
                <h3 className="text-white font-display font-bold text-xl">Visibility momentum</h3>
                <p className="text-sm text-text-secondary mt-2 max-w-xl">
                    Run your first audit to start tracking trendlines over time. Momentum updates automatically as you add more audits.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Badge variant="secondary">No trend data yet</Badge>
                    <Badge variant="secondary">Timeframe: {timeframe}</Badge>
                </div>
            </div>
        );
    }

    return (
        <div className="relative group">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 sm:mb-10">
                <div>
                    <h3 className="text-text-secondary text-[10px] font-bold uppercase tracking-[0.2em] font-display">Visibility Momentum</h3>
                    <div className="flex items-center gap-3 mt-2">
                        <p className="text-2xl sm:text-3xl font-black text-white tracking-tighter font-display">
                            {momentum > 0 ? `+${momentum}%` : `${momentum}%`}
                        </p>
                        <Badge variant={momentum > 0 ? 'success' : momentum < 0 ? 'destructive' : 'secondary'}>
                            {momentum > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> :
                                momentum < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> :
                                    <Minus className="w-3 h-3 mr-1" />}
                            {Math.abs(momentum)}%
                        </Badge>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    {/* Timeframe Selector */}
                    <div className="flex p-1 bg-surface border border-border rounded-full">
                        {(['7d', '30d', '90d'] as Timeframe[]).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${timeframe === tf ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-4 sm:gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary shadow-glow" />
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-text-secondary tracking-wider">Your Brand</span>
                        </div>
                        {hasBenchmarks ? (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-700" />
                                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-text-muted tracking-wider">Benchmark</span>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Period Stats */}
            {data.length > 0 && (
                <div className="mb-6 grid grid-cols-3 gap-4">
                    {[
                        { label: 'High', value: Math.max(...data.map(d => d.score)), color: 'text-emerald-400' },
                        { label: 'Low', value: Math.min(...data.map(d => d.score)), color: 'text-rose-400' },
                        { label: 'Average', value: Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length), color: 'text-primary' }
                    ].map((stat) => (
                        <div key={stat.label} className="bg-surface/50 border border-border rounded-xl p-4 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">{stat.label}</p>
                            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className={`h-72 w-full transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {error ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-red-500/5 border border-red-500/10 rounded-2xl">
                        <p className="text-sm text-red-400 font-medium mb-4">{error}</p>
                        <Button
                            onClick={fetchData}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                            <RefreshCw className="w-3 h-3 mr-2" /> Retry
                        </Button>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ left: -20, right: 0, top: 10 }}>
                            <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#1E40AF" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700, fontFamily: 'Fira Code' }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700, fontFamily: 'Fira Code' }}
                                domain={[0, 100]}
                                dx={-5}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#18181b', // Surface
                                    borderColor: '#27272a', // Border
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                    color: '#f8fafc',
                                    padding: '12px 16px',
                                }}
                                itemStyle={{ color: '#f8fafc', fontSize: '10px', fontWeight: 'bold' }}
                                labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}
                                cursor={{ stroke: '#3B82F6', strokeWidth: 2 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="score"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorScore)"
                                animationDuration={1000}
                                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
                            />
                            {hasBenchmarks ? (
                                <Line
                                    type="monotone"
                                    dataKey="competitorAvg"
                                    stroke="#475569"
                                    strokeWidth={2}
                                    strokeDasharray="6 6"
                                    dot={false}
                                    connectNulls={false}
                                />
                            ) : null}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            <AnimatePresence>
                {!loading && data.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-surface/50 rounded-2xl border border-border hover:bg-surface transition-colors"
                    >
                        <div className="text-[11px] sm:text-xs text-text-secondary font-medium leading-relaxed">
                            <span className="text-primary font-black mr-2 uppercase tracking-widest text-[9px] sm:text-[10px] font-display">Trend Insight</span>
                            Your visibility has {momentum > 0 ? 'increased' : momentum < 0 ? 'decreased' : 'stayed stable'} by <span className="text-white font-bold">{Math.abs(momentum)}%</span> over the last {timeframe === '7d' ? 'week' : timeframe === '30d' ? 'month' : 'quarter'}.
                        </div>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-white uppercase text-[10px] tracking-widest font-black">
                            Full Analysis →
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
