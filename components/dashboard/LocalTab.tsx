import React from 'react';
import { motion } from 'framer-motion';
import { Report } from '../../types';
import {
    MapPin, Phone, Clock, Star, AlertTriangle,
    CheckCircle2, Lightbulb, Building2, Camera, MessageSquare
} from 'lucide-react';

interface LocalTabProps {
    report: Report;
}

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
    const radius = (size / 2) - 6;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score < 40 ? '#ef4444' : score < 70 ? '#f59e0b' : '#22c55e';

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="5" />
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700"
            />
            <text
                x={size / 2} y={size / 2}
                textAnchor="middle" dominantBaseline="middle"
                style={{
                    transform: `rotate(90deg)`,
                    transformOrigin: `${size / 2}px ${size / 2}px`,
                    fontSize: '13px',
                    fontWeight: 700,
                    fill: color
                }}
            >
                {score}
            </text>
        </svg>
    );
}

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star
                    key={i}
                    className={`w-4 h-4 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                />
            ))}
        </div>
    );
}

export const LocalTab: React.FC<LocalTabProps> = ({ report }) => {
    const gbp = report.gbpAnalysis;

    if (!gbp) {
        return (
            <div className="p-6 lg:p-8">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <MapPin className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Local Presence Analysis</h3>
                    <p className="text-text-secondary max-w-sm">
                        Local presence data is not available for this report. Run a new analysis to see your Google Business Profile optimization score.
                    </p>
                </div>
            </div>
        );
    }

    const hasNAP = gbp.businessName || gbp.address || gbp.phone;
    const hasHours = gbp.hours && Object.keys(gbp.hours).length > 0;
    const hasRating = gbp.rating > 0;

    const scoreCards = [
        {
            label: 'Overall Score',
            value: gbp.overallScore,
            icon: <MapPin className="w-4 h-4" />,
            color: 'text-primary',
            bg: 'bg-primary/10',
        },
        {
            label: 'NAP Consistency',
            value: gbp.napConsistencyScore,
            icon: <Building2 className="w-4 h-4" />,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            label: 'Review Signals',
            value: hasRating ? Math.min(100, Math.round((gbp.rating / 5) * 80 + (gbp.reviewCount > 0 ? 20 : 0))) : 0,
            icon: <Star className="w-4 h-4" />,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            label: 'Profile Richness',
            value: Math.min(100, Math.round(
                (gbp.businessName ? 20 : 0) +
                (gbp.address ? 20 : 0) +
                (gbp.phone ? 20 : 0) +
                (hasHours ? 20 : 0) +
                Math.min(20, gbp.photosCount)
            )),
            icon: <Camera className="w-4 h-4" />,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
    ];

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-text-primary">Local Presence</h2>
                    <p className="text-text-secondary text-sm mt-0.5">
                        Google Business Profile optimization &amp; local AI citation readiness
                    </p>
                </div>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {scoreCards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="bg-surface border border-border rounded-xl p-4 flex flex-col items-center gap-3"
                    >
                        <div className={`w-9 h-9 rounded-lg ${card.bg} ${card.color} flex items-center justify-center`}>
                            {card.icon}
                        </div>
                        <ScoreRing score={card.value} size={64} />
                        <p className="text-xs font-semibold text-text-secondary text-center">{card.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* NAP Card */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-surface border border-border rounded-xl p-5"
            >
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Business Information (NAP)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Business Name</p>
                            <p className={`text-sm font-semibold mt-0.5 ${gbp.businessName ? 'text-text-primary' : 'text-text-muted italic'}`}>
                                {gbp.businessName || 'Not found'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Address</p>
                            <p className={`text-sm font-semibold mt-0.5 ${gbp.address ? 'text-text-primary' : 'text-text-muted italic'}`}>
                                {gbp.address || 'Not found'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider">Phone</p>
                            <p className={`text-sm font-semibold mt-0.5 ${gbp.phone ? 'text-text-primary' : 'text-text-muted italic'}`}>
                                {gbp.phone || 'Not found'}
                            </p>
                        </div>
                    </div>
                </div>
                {!hasNAP && (
                    <div className="mt-4 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        No NAP data found on the website. This is a critical gap for local AI citations.
                    </div>
                )}
            </motion.div>

            {/* Rating & Sentiment + Hours in a row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Rating & Sentiment */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-surface border border-border rounded-xl p-5"
                >
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        Reviews &amp; Sentiment
                    </h3>
                    {hasRating ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-black text-text-primary">{gbp.rating.toFixed(1)}</span>
                                <div>
                                    <StarRating rating={gbp.rating} />
                                    {gbp.reviewCount > 0 && (
                                        <p className="text-xs text-text-muted mt-1">{gbp.reviewCount.toLocaleString()} reviews</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-text-muted italic">No rating data found on website</p>
                    )}
                    {gbp.sentimentSummary && (
                        <div className="mt-4 flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-text-secondary">{gbp.sentimentSummary}</p>
                        </div>
                    )}
                </motion.div>

                {/* Business Hours */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-surface border border-border rounded-xl p-5"
                >
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Business Hours
                    </h3>
                    {hasHours ? (
                        <div className="space-y-1.5">
                            {Object.entries(gbp.hours!).map(([day, hours]) => (
                                <div key={day} className="flex justify-between items-center text-sm">
                                    <span className="text-text-secondary font-medium w-24">{day}</span>
                                    <span className="text-text-primary font-semibold">{hours}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            No business hours found on website
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Issues */}
            {gbp.issues && gbp.issues.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="bg-surface border border-border rounded-xl p-5"
                >
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Issues Found
                    </h3>
                    <div className="space-y-2">
                        {gbp.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-amber-800">{issue}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Recommendations */}
            {gbp.recommendations && gbp.recommendations.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-surface border border-border rounded-xl p-5"
                >
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        Recommendations
                    </h3>
                    <div className="space-y-2">
                        {gbp.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                                </div>
                                <span className="text-sm text-text-primary">{rec}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* No issues and no recommendations = perfect score banner */}
            {(!gbp.issues || gbp.issues.length === 0) && (!gbp.recommendations || gbp.recommendations.length === 0) && gbp.overallScore >= 80 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4"
                >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-sm text-emerald-800 font-semibold">
                        Excellent local presence! Your business information is well-structured and optimized for local AI citations.
                    </p>
                </motion.div>
            )}
        </div>
    );
};
