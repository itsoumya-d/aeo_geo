import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { Report } from '../types';

interface ExecutiveSummaryProps {
    report: Report;
    companyName?: string;
    showRecommendations?: boolean;
}

/**
 * Executive Summary Component
 * Displays high-level insights for stakeholders and C-level executives
 */
export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
    report,
    companyName = 'Your Organization',
    showRecommendations = true
}) => {
    const scoreColor = report.overallScore >= 70 ? 'emerald' :
        report.overallScore >= 40 ? 'amber' : 'rose';

    // Calculate average quote likelihood from pages as citation probability
    const avgQuoteLikelihood = report.pages.length > 0
        ? Math.round(report.pages.reduce((acc, p) => acc + p.quoteLikelihood, 0) / report.pages.length)
        : 0;

    const scoreTrend = avgQuoteLikelihood > 50 ? 'up' :
        avgQuoteLikelihood < 30 ? 'down' : 'neutral';

    const highPriorityCount = report.pages.reduce((acc, page) =>
        acc + page.recommendations.filter(r => r.impact === 'HIGH').length, 0);

    // Calculate average platform score
    const avgPlatformScore = report.platformScores.length > 0
        ? Math.round(report.platformScores.reduce((acc, p) => acc + p.score, 0) / report.platformScores.length)
        : 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center pb-8 border-b border-border">
                <h1 className="text-2xl font-display font-bold text-white mb-2">
                    AI Visibility Executive Summary
                </h1>
                <p className="text-text-secondary">
                    {companyName} • Generated {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                </p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                    label="AI Visibility Score"
                    value={report.overallScore}
                    suffix="/100"
                    color={scoreColor}
                    icon={<Target className="w-5 h-5" />}
                />
                <KPICard
                    label="Brand Consistency"
                    value={report.brandConsistencyScore}
                    suffix="%"
                    color="primary"
                    icon={<CheckCircle2 className="w-5 h-5" />}
                />
                <KPICard
                    label="Citation Likelihood"
                    value={avgQuoteLikelihood}
                    suffix="%"
                    color="purple"
                />
                <KPICard
                    label="Avg Platform Score"
                    value={avgPlatformScore}
                    suffix="/100"
                    color={scoreTrend === 'up' ? 'emerald' : scoreTrend === 'down' ? 'rose' : 'slate'}
                    trend={scoreTrend}
                />
            </div>

            {/* Platform Performance */}
            <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4">
                    Platform Performance
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {report.platformScores.slice(0, 4).map((platform, i) => (
                        <div key={i} className="text-center">
                            <div className="text-2xl font-bold text-white mb-1">
                                {platform.score}
                            </div>
                            <div className="text-xs text-text-muted">
                                {platform.platform}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Priority Actions */}
            {showRecommendations && highPriorityCount > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                        <h3 className="font-bold text-white">
                            {highPriorityCount} High-Priority Actions Required
                        </h3>
                    </div>
                    <ul className="space-y-2">
                        {report.pages.flatMap(p => p.recommendations)
                            .filter(r => r.impact === 'HIGH')
                            .slice(0, 3)
                            .map((rec, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                                    <span className="text-rose-400 mt-1">•</span>
                                    <span>{rec.issue}</span>
                                </li>
                            ))}
                    </ul>
                </div>
            )}

            {/* Bottom Line */}
            <div className="bg-surface border border-border rounded-xl p-6 text-center">
                <p className="text-text-secondary mb-2">Bottom Line</p>
                <p className="text-lg font-medium text-white">
                    {report.overallScore >= 70
                        ? `${companyName} has strong AI visibility positioning across major platforms.`
                        : report.overallScore >= 40
                            ? `${companyName} has moderate AI visibility with opportunities for improvement.`
                            : `${companyName} needs immediate attention to improve AI search presence.`
                    }
                </p>
            </div>
        </div>
    );
};

// KPI Card sub-component
const KPICard: React.FC<{
    label: string;
    value: number;
    suffix?: string;
    color?: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
}> = ({ label, value, suffix = '', color = 'primary', icon, trend }) => {
    const colorMap: Record<string, string> = {
        primary: 'text-primary',
        emerald: 'text-emerald-400',
        amber: 'text-amber-400',
        rose: 'text-rose-400',
        purple: 'text-purple-400',
        slate: 'text-slate-400'
    };

    return (
        <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {label}
                </span>
                {icon && <span className={colorMap[color]}>{icon}</span>}
            </div>
            <div className="flex items-end gap-1">
                <span className={`text-3xl font-bold ${colorMap[color]}`}>
                    {value}
                </span>
                <span className="text-sm text-text-muted mb-1">{suffix}</span>
                {trend && trend !== 'neutral' && (
                    <span className={`ml-2 mb-1 ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ExecutiveSummary;
