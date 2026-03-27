import React from 'react';
import { motion } from 'framer-motion';
import { Report } from '../../types';
import { TabType } from './DashboardTypes';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, RadialBarChart, RadialBar, PolarAngleAxis, LabelList
} from 'recharts';
import { AlertTriangle, CheckCircle, TrendingUp, Cpu, Target, Layers, ArrowRight } from 'lucide-react';
import { VisibilityTrendChart } from '../VisibilityTrendChart';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface OverviewTabProps {
    report: Report;
    setActiveTab: (tab: TabType) => void;
}

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export const OverviewTab: React.FC<OverviewTabProps> = ({ report, setActiveTab }) => {
    // Colors from Design System
    // Good: Emerald 500 (#10b981), Warning: Amber 500 (#f59e0b), Bad: Red 500 (#ef4444)
    // Primary: Blue 600 (#2563eb)

    const scoreData = report.platformScores.map(ps => ({
        name: ps.platform,
        score: ps.score,
        fill: ps.score > 70 ? '#10b981' : ps.score > 50 ? '#f59e0b' : '#ef4444'
    }));

    const overallData = [{
        name: 'Score',
        value: report.overallScore,
        fill: report.overallScore > 75 ? '#10b981' : '#2563eb'
    }];

    // Dynamic Impact Potential: calculated from high-priority recommendations and low platform scores
    const allRecs = report.pages.flatMap(p => p.recommendations);
    const highCount = allRecs.filter(r => r.impact === 'HIGH').length;
    const lowPlatforms = report.platformScores.filter(p => p.score < 50).length;
    const impactScore = report.overallScore;
    const impactPotential = (highCount >= 5 || lowPlatforms >= 2 || impactScore < 40)
        ? { label: 'Very High', color: 'text-rose-400' }
        : (highCount >= 2 || lowPlatforms >= 1 || impactScore < 65)
            ? { label: 'High', color: 'text-amber-400' }
            : (impactScore < 80)
                ? { label: 'Moderate', color: 'text-primary' }
                : { label: 'Low', color: 'text-emerald-400' };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Score Card */}
                <motion.div variants={itemVariants} className="lg:col-span-4">
                    <Card className="h-full flex flex-col items-center justify-center relative overflow-hidden group shadow-glow hover:shadow-xl transition-all p-8 bg-surface border-border">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-text-secondary text-xs font-bold uppercase tracking-[0.2em] mb-8 flex items-center gap-2 font-display">
                            <Target className="w-4 h-4 text-primary" /> Overall Visibility
                        </h3>
                        <div className="w-48 h-48 sm:w-64 sm:h-64 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart innerRadius="85%" outerRadius="110%" barSize={12} data={overallData} startAngle={225} endAngle={-45}>
                                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                    <RadialBar background={{ fill: 'rgba(255,255,255,0.12)' }} dataKey="value" cornerRadius={30} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-6xl sm:text-7xl font-black text-text-primary tracking-tighter font-display drop-shadow-[0_10px_28px_rgba(148,163,184,0.18)]">{report.overallScore}</span>
                                <span className="text-text-secondary text-[10px] sm:text-xs font-medium uppercase tracking-widest mt-1">Index Score</span>
                            </div>
                        </div>
                        {/* Micro-stats */}
                        <div className="mt-8 grid grid-cols-2 gap-8 w-full border-t border-border pt-8">
                            <div className="text-center">
                                <div className="text-text-muted text-[10px] uppercase tracking-wider mb-1 font-bold">Consistency</div>
                                <div className="text-text-primary text-lg font-bold font-mono">{report.brandConsistencyScore}%</div>
                            </div>
                            <div className="text-center">
                                <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1 font-bold">Impact Potential</div>
                                <div className={`font-bold font-display ${impactPotential.color}`}>{impactPotential.label}</div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Platform Breakdown */}
                <motion.div variants={itemVariants} className="lg:col-span-8">
                    <Card className="h-full p-8 bg-surface border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-10">
                            <h3 className="text-text-secondary text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 font-display">
                                <Cpu className="w-4 h-4 text-purple-400" /> Model Performance
                            </h3>
                            <div className="flex items-center gap-3 sm:gap-4 text-[10px] text-text-muted font-bold uppercase tracking-wider">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Optimal</div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Fair</div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Poor</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                            <div className="h-64 sm:h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={scoreData} layout="vertical" margin={{ left: -10, right: 10 }}>
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={80}
                                            tick={{ fill: '#475569', fontSize: 11, fontWeight: 700, fontFamily: 'Fira Code' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                borderColor: '#e2e8f0',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.12)',
                                                color: '#0f172a'
                                            }}
                                        />
                                        <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
                                            {scoreData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                            <LabelList dataKey="score" position="right" offset={8} fill="#0f172a" fontSize={12} fontWeight={800} formatter={(value) => `${value ?? ''}%`} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-4 overflow-y-auto max-h-72 pr-2 custom-scrollbar">
                                {report.platformScores.map((ps, i) => (
                                    <motion.div
                                        key={ps.platform}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * i }}
                                        className="bg-background hover:bg-slate-50 p-4 rounded-xl border border-border transition-all group"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-text-primary text-sm group-hover:text-primary transition-colors">{ps.platform}</span>
                                            <Badge variant={ps.score > 70 ? 'success' : ps.score > 50 ? 'warning' : 'destructive'}>
                                                {ps.score}%
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-text-secondary leading-relaxed">{ps.reasoning}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* Trend Chart */}
            <motion.div variants={itemVariants}>
                <Card className="p-8 bg-surface border-border">
                    <VisibilityTrendChart />
                </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Topical Authority */}
                <motion.div variants={itemVariants}>
                    <Card className="h-full p-8 bg-surface border-border">
                        <div className="flex items-center gap-2 mb-8">
                            <Layers className="w-4 h-4 text-secondary" />
                            <h3 className="text-text-secondary text-xs font-bold uppercase tracking-[0.2em] font-display">Topical Dominance</h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {report.topicalDominance?.map((topic, i) => {
                                const strength = i < 2 ? 'strong' : i < 4 ? 'medium' : 'emerging';
                                const colors = {
                                    strong: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                                    medium: 'bg-primary/10 border-primary/30 text-primary',
                                    emerging: 'bg-background border-border text-text-primary'
                                };
                                return (
                                    <div
                                        key={i}
                                        className={`${colors[strength]} px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:scale-105 transition-transform cursor-default`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${strength === 'strong' ? 'bg-emerald-400' : strength === 'medium' ? 'bg-primary' : 'bg-text-muted'} shadow-glow`}></div>
                                        {topic}
                                        {strength === 'strong' && <span className="text-[9px] uppercase tracking-wider opacity-70">★</span>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 flex gap-6 text-[10px] text-text-muted font-bold uppercase tracking-wider">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Strong</div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary"></div> Medium</div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-text-muted"></div> Emerging</div>
                        </div>
                    </Card>
                </motion.div>

                {/* Consistency Analysis */}
                <motion.div variants={itemVariants}>
                    <Card className="h-full p-8 bg-surface border-border">
                        <div className="flex items-center gap-2 mb-8">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-text-secondary text-xs font-bold uppercase tracking-[0.2em] font-display">Consistency Insights</h3>
                        </div>
                        <p className="text-text-secondary text-sm leading-loose">
                            {report.consistencyAnalysis || "Analysis of cross-platform brand representation and message alignment."}
                        </p>
                    </Card>
                </motion.div>
            </div>

            {/* Actions */}
            <motion.div variants={itemVariants}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-text-secondary text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 font-display">
                        <AlertTriangle className="w-4 h-4 text-cta" /> Critical Optimization Actions
                    </h3>
                    <Button variant="link" onClick={() => setActiveTab('pages')} className="text-xs font-bold">
                        VIEW ALL RECOMMENDATIONS <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
                    {report.pages.flatMap(p => p.recommendations).filter(r => r.impact === 'HIGH').slice(0, 6).map((rec, idx) => (
                        <Card
                            key={idx}
                            variant="default"
                            className="p-6 cursor-pointer hover:border-primary/40 hover:-translate-y-1 transition-transform group bg-surface border-border h-full flex flex-col"
                            onClick={() => setActiveTab('pages')}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <Badge variant="destructive">Priority</Badge>
                                <span className="text-[10px] text-text-muted bg-background px-2 py-1 rounded border border-border max-w-[120px] truncate font-mono">
                                    {rec.location}
                                </span>
                            </div>
                            <h4 className="text-text-primary font-bold text-sm mb-3 group-hover:text-primary transition-colors leading-tight line-clamp-2">{rec.issue}</h4>
                            <p className="text-text-secondary text-xs mb-6 line-clamp-3 leading-relaxed flex-1">{rec.instruction}</p>
                            <div className="pt-4 border-t border-border flex justify-between items-center mt-auto">
                                <span className="text-[10px] font-bold text-text-muted uppercase">Impact: <span className="text-cta">High</span></span>
                                <span className="text-[10px] font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">FIX NOW <ArrowRight className="w-3 h-3" /></span>
                            </div>
                        </Card>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
};
