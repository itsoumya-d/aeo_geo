import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { Brain, Target, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { VectorMapPoint } from '../types';
import { supabase } from '../services/supabase';

interface VectorLabProps {
    data?: VectorMapPoint[];
}

export const VectorLab: React.FC<VectorLabProps> = ({ data: initialData }) => {
    const [goal, setGoal] = useState("Rank for 'AI SEO Tools'");
    const [isSimulating, setIsSimulating] = useState(false);
    const [optimizationLevel, setOptimizationLevel] = useState(0); // 0 to 100
    const [data, setData] = useState<VectorMapPoint[]>([]);

    useEffect(() => {
        if (initialData) {
            setData(initialData);
        }
    }, [initialData]);

    const handleSimulation = async () => {
        setIsSimulating(true);
        try {
            // Try real match_content RPC for actual semantic comparison
            const { data: matchData, error } = await supabase.rpc('match_content', {
                query_text: goal,
                match_threshold: 0.5,
                match_count: 10,
            });

            if (!error && matchData && matchData.length > 0) {
                // Map real semantic matches to vector points
                const newData = data.filter(d => d.type !== 'optimization_target');
                const progress = optimizationLevel / 100;
                matchData.forEach((match: any, i: number) => {
                    newData.push({
                        x: Math.min(100, (match.similarity || 0.5) * 100 * (1 + progress * 0.3)),
                        y: Math.min(100, 40 + i * 8 + progress * 20),
                        z: 300 + (match.similarity || 0.5) * 300,
                        label: match.title || `Match ${i + 1}`,
                        type: 'optimization_target' as const,
                    });
                });
                setData(newData);
            } else {
                // Fallback: local simulation
                runLocalSimulation();
            }
        } catch {
            // Fallback: local simulation if RPC isn't available
            runLocalSimulation();
        } finally {
            setIsSimulating(false);
        }
    };

    const runLocalSimulation = () => {
        const startX = 20;
        const startY = 30;
        const targetX = 90;
        const targetY = 90;
        const progress = optimizationLevel / 100;
        const newX = startX + (targetX - startX) * progress;
        const newY = startY + (targetY - startY) * progress;

        const newData = data.filter(d => d.type !== 'optimization_target');
        newData.push({
            x: newX,
            y: newY,
            z: 400 + (progress * 200),
            label: `Optimized Ver. (${optimizationLevel}%)`,
            type: 'optimization_target'
        });
        setData(newData);
    };

    if (!data || data.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
            >
                <div className="bg-primary/10 p-4 rounded-2xl mb-4">
                    <Brain className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No vector data yet</h3>
                <p className="text-sm text-text-muted max-w-sm">
                    Run an audit and use the Optimization tab to generate semantic vector data for your content.
                </p>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                        <Brain className="w-6 h-6 text-primary" />
                        Vector Lab
                    </h2>
                    <p className="text-text-secondary">Visualize and optimize your content's semantic position in the AI latent space.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setData(initialData || [])}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset Data
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Control Panel */}
                <Card className="lg:col-span-1 p-6 border-border flex flex-col gap-6 bg-surface/50 backdrop-blur-sm">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            Optimization Goal
                        </label>
                        <div className="relative">
                            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                type="text"
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-text-secondary">AI Reinforcement</label>
                            <span className="text-sm font-mono text-primary">{optimizationLevel}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={optimizationLevel}
                            onChange={(e) => setOptimizationLevel(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <p className="text-xs text-text-muted mt-2">
                            Higher levels increase semantic density but may reduce readability.
                        </p>
                    </div>

                    <div className="mt-auto">
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleSimulation}
                            isLoading={isSimulating}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Simulate Vector Shift
                        </Button>
                    </div>
                </Card>

                {/* Visualization Area */}
                <Card className="lg:col-span-2 p-6 border-border min-h-[400px] flex flex-col bg-surface overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 z-10">
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Your Content
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span> Competitors
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span> Gold Standard
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full h-full min-h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                                <XAxis type="number" dataKey="x" name="Semantic Relevance" domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis type="number" dataKey="y" name="Authority Score" domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-surface border border-border p-3 rounded-lg shadow-xl">
                                                    <p className="font-bold text-white mb-1">{data.label}</p>
                                                    <div className="text-xs text-text-muted space-y-1">
                                                        <p>Relevance: <span className="text-text-secondary">{data.x.toFixed(1)}</span></p>
                                                        <p>Authority: <span className="text-text-secondary">{data.y.toFixed(1)}</span></p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter name="Vectors" data={data} fill="#8884d8">
                                    {data.map((entry, index) => {
                                        let fill = '#3b82f6'; // Blue (Your Content)
                                        let r = 6;
                                        if (entry.type === 'competitor') { fill = '#ef4444'; r = 5; } // Red
                                        if (entry.type === 'gold_standard') { fill = '#34d399'; r = 8; } // Green
                                        if (entry.type === 'optimization_target') { fill = '#f59e0b'; r = 7; } // Amber

                                        return <Cell key={`cell-${index}`} fill={fill} />;
                                    })}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* AI Insights & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 border-border bg-gradient-to-br from-surface to-surface/50">
                    <h3 className="text-lg font-bold text-white mb-4">Semantic Gap Analysis</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mt-0.5 font-bold text-xs">1</div>
                            <div>
                                <p className="text-sm font-medium text-white">Missing conceptual clusters</p>
                                <p className="text-xs text-text-secondary mt-1">
                                    Your content lacks depth in "Machine Learning Integration" compared to the Gold Standard vector.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mt-0.5 font-bold text-xs">2</div>
                            <div>
                                <p className="text-sm font-medium text-white">Authority signal weak</p>
                                <p className="text-xs text-text-secondary mt-1">
                                    Competitors use 40% more statistical citations. Consider adding data points.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-border bg-gradient-to-br from-surface to-surface/50">
                    <h3 className="text-lg font-bold text-white mb-4">Recommended Actions</h3>
                    <div className="space-y-3">
                        <Button variant="ghost" className="w-full justify-between bg-white/5 hover:bg-white/10 border border-white/5 text-left h-auto py-3">
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-text-primary">Expand "Integration" section</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-text-muted" />
                        </Button>
                        <Button variant="ghost" className="w-full justify-between bg-white/5 hover:bg-white/10 border border-white/5 text-left h-auto py-3">
                            <div className="flex items-center gap-3">
                                <Brain className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-text-primary">Inject statistical authorities</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-text-muted" />
                        </Button>
                    </div>
                </Card>
            </div>
        </motion.div>
    );
};
