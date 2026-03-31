import React from 'react';
import { motion } from 'framer-motion';
import { Report, SocialPlatformResult } from '../../types';
import {
    Twitter, Linkedin, Youtube, Instagram, Facebook,
    CheckCircle2, XCircle, AlertTriangle, TrendingUp, Users, Zap, Share2
} from 'lucide-react';

interface SocialTabProps {
    report: Report;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
    'Twitter/X': <Twitter className="w-5 h-5" />,
    'LinkedIn': <Linkedin className="w-5 h-5" />,
    'YouTube': <Youtube className="w-5 h-5" />,
    'Instagram': <Instagram className="w-5 h-5" />,
    'Facebook': <Facebook className="w-5 h-5" />,
};

const PLATFORM_COLORS: Record<string, string> = {
    'Twitter/X': 'text-sky-600 bg-sky-50 border-sky-200',
    'LinkedIn': 'text-blue-700 bg-blue-50 border-blue-200',
    'YouTube': 'text-red-600 bg-red-50 border-red-200',
    'Instagram': 'text-pink-600 bg-pink-50 border-pink-200',
    'Facebook': 'text-blue-600 bg-blue-50 border-blue-200',
};

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
    const radius = (size / 2) - 5;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score < 40 ? '#ef4444' : score < 70 ? '#f59e0b' : '#22c55e';

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke={color} strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700"
            />
            <text
                x={size / 2} y={size / 2}
                textAnchor="middle" dominantBaseline="middle"
                style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px`, fontSize: '12px', fontWeight: 700, fill: color }}
            >
                {score}
            </text>
        </svg>
    );
}

function PlatformCard({ platform }: { platform: SocialPlatformResult }) {
    const colorClass = PLATFORM_COLORS[platform.platform] || 'text-slate-600 bg-slate-50 border-slate-200';

    return (
        <div className={`bg-white border rounded-2xl p-5 ${platform.present ? 'border-blue-100' : 'border-slate-200 opacity-60'}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${colorClass}`}>
                        {PLATFORM_ICONS[platform.platform] || <Users className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="font-semibold text-text-primary text-sm">{platform.platform}</div>
                        {platform.present ? (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="w-3 h-3" /> Active
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-xs text-text-muted">
                                <XCircle className="w-3 h-3" /> Not connected
                            </div>
                        )}
                    </div>
                </div>
                {platform.present && (
                    <div className="flex items-center gap-3">
                        <div className="text-center">
                            <div className="text-[10px] text-text-muted font-medium mb-0.5">Activity</div>
                            <ScoreRing score={platform.activityScore} size={44} />
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] text-text-muted font-medium mb-0.5">Consistency</div>
                            <ScoreRing score={platform.brandConsistency} size={44} />
                        </div>
                    </div>
                )}
            </div>

            {platform.bio && (
                <p className="text-xs text-text-secondary italic mb-3 border-l-2 border-blue-200 pl-3">"{platform.bio}"</p>
            )}

            {platform.issues && platform.issues.length > 0 && (
                <div className="space-y-1.5">
                    {platform.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-500" />
                            {issue}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export const SocialTab: React.FC<SocialTabProps> = ({ report }) => {
    const social = report.socialAnalysis;

    if (!social) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 bg-blue-50 rounded-2xl border border-blue-100"
            >
                <Share2 className="w-12 h-12 text-blue-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">Social Media Analysis Not Available</h3>
                <p className="text-sm text-text-secondary max-w-md mx-auto">
                    Add your social media profiles (Twitter/X, LinkedIn, Instagram, YouTube, Facebook) in the Input step when starting an audit to enable social presence scoring.
                </p>
            </motion.div>
        );
    }

    const coveragePercent = social.platformCoverage;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl">
                            <Share2 className="text-blue-600 w-5 h-5" />
                        </div>
                        Social Media Presence
                    </h2>
                    <p className="text-text-secondary mt-2 text-sm max-w-xl">
                        AI visibility is 15% influenced by social brand consistency. Mismatched profiles reduce citation likelihood across ChatGPT, Perplexity, and Gemini.
                    </p>
                </div>
            </div>

            {/* Summary scores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Overall Presence', value: social.overallPresenceScore, icon: <TrendingUp className="w-4 h-4" /> },
                    { label: 'Activity', value: social.activityScore, icon: <Zap className="w-4 h-4" /> },
                    { label: 'Brand Consistency', value: social.brandConsistencyScore, icon: <CheckCircle2 className="w-4 h-4" /> },
                    { label: 'Platform Coverage', value: coveragePercent, icon: <Users className="w-4 h-4" /> },
                ].map(({ label, value, icon }) => {
                    const color = value < 40
                        ? 'text-red-600 bg-red-50 border-red-100'
                        : value < 70
                        ? 'text-amber-600 bg-amber-50 border-amber-100'
                        : 'text-green-600 bg-green-50 border-green-100';
                    return (
                        <div key={label} className="bg-white border border-blue-100 rounded-2xl p-4 text-center">
                            <div className={`inline-flex p-2 rounded-xl mb-2 ${color}`}>{icon}</div>
                            <div className={`text-2xl font-bold ${color.split(' ')[0]}`}>{value}</div>
                            <div className="text-xs text-text-muted font-medium mt-0.5">{label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Platform grid */}
            <div>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Platform Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {social.platforms.map(platform => (
                        <PlatformCard key={platform.platform} platform={platform} />
                    ))}
                </div>
            </div>

            {/* Key mismatches */}
            {social.keyMismatches && social.keyMismatches.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm font-bold text-amber-800">Brand Consistency Issues</h3>
                    </div>
                    <div className="space-y-2">
                        {social.keyMismatches.map((mismatch, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-sm text-amber-700">
                                <span className="flex-shrink-0 w-5 h-5 bg-amber-200 rounded-full text-amber-800 text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                                {mismatch}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {social.recommendations && social.recommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-bold text-blue-800">Recommendations to Improve AI Citation</h3>
                    </div>
                    <div className="space-y-2">
                        {social.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-sm text-blue-700">
                                <span className="flex-shrink-0 w-5 h-5 bg-blue-200 rounded-full text-blue-800 text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
                                {rec}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};
