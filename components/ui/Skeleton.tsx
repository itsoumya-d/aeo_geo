import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

/**
 * Base skeleton component with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    width,
    height,
    rounded = 'lg'
}) => {
    const roundedClass = {
        none: '',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        full: 'rounded-full',
    }[rounded];

    return (
        <div
            className={`skeleton bg-slate-800 ${roundedClass} ${className}`}
            style={{
                width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
                height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
            }}
        />
    );
};

/**
 * Dashboard skeleton for loading state
 */
/**
 * Overview Tab Skeleton
 * Replaces the spinner with a high-fidelity layout mock
 */
export const OverviewSkeleton: React.FC = () => {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Score Card Skeleton */}
                <div className="lg:col-span-4 bg-surface rounded-2xl border border-white/5 p-8 flex flex-col items-center justify-center h-[400px]">
                    <Skeleton width={150} height={16} className="mb-8" />
                    <Skeleton width={180} height={180} rounded="full" className="mb-8" />
                    <div className="w-full grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                        <div className="flex flex-col items-center gap-2">
                            <Skeleton width={60} height={12} />
                            <Skeleton width={40} height={20} />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Skeleton width={80} height={12} />
                            <Skeleton width={50} height={20} />
                        </div>
                    </div>
                </div>

                {/* Platform Breakdown Skeleton */}
                <div className="lg:col-span-8 bg-surface rounded-2xl border border-white/5 p-8 h-[400px]">
                    <div className="flex justify-between mb-8">
                        <Skeleton width={200} height={20} />
                        <Skeleton width={150} height={16} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="h-full">
                            <Skeleton height={250} className="w-full rounded-xl" />
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <Skeleton width={80} height={16} />
                                        <Skeleton width={50} height={20} />
                                    </div>
                                    <Skeleton height={32} className="w-full rounded-lg" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-surface rounded-2xl border border-white/5 p-8 h-48">
                    <Skeleton width={180} height={20} className="mb-6" />
                    <div className="flex flex-wrap gap-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} width={80 + Math.random() * 50} height={30} rounded="lg" />
                        ))}
                    </div>
                </div>
                <div className="bg-surface rounded-2xl border border-white/5 p-8 h-48">
                    <Skeleton width={200} height={20} className="mb-6" />
                    <div className="space-y-3">
                        <Skeleton width="100%" height={14} />
                        <Skeleton width="90%" height={14} />
                        <Skeleton width="95%" height={14} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen pb-20 bg-background text-slate-200">
            {/* Header Skeleton */}
            <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Skeleton width={40} height={40} rounded="lg" />
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <OverviewSkeleton />
            </main>
        </div>
    )
}

/**
 * Page breakdown skeleton
 */
export const PageBreakdownSkeleton: React.FC = () => {
    return (
        <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <Skeleton width={56} height={56} rounded="xl" />
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Skeleton width={200} height={24} />
                            <Skeleton width={60} height={20} />
                        </div>
                        <Skeleton width={250} height={16} />
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <Skeleton width={100} height={12} className="mb-1" />
                        <Skeleton width={150} height={16} />
                    </div>
                    <div className="text-right">
                        <Skeleton width={50} height={12} className="mb-1" />
                        <Skeleton width={80} height={16} />
                    </div>
                    <Skeleton width={36} height={36} rounded="full" />
                </div>
            </div>
        </div>
    );
};

/**
 * Generic Table Skeleton
 */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
    return (
        <div className="bg-surface rounded-xl border border-white/5 overflow-hidden animate-pulse">
            <div className="px-6 py-4 border-b border-white/5 flex gap-4">
                <Skeleton width={200} height={20} />
            </div>
            <div className="divide-y divide-white/5">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Skeleton width={16} height={16} rounded="sm" />
                            <div className="space-y-2">
                                <Skeleton width={140} height={16} />
                                <Skeleton width={200} height={14} />
                            </div>
                        </div>
                        <div className="flex gap-8">
                            <Skeleton width={80} height={24} />
                            <Skeleton width={60} height={24} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * History Page skeleton — audit list + trend chart
 */
export const HistorySkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Skeleton width={48} height={48} rounded="xl" />
                <div className="space-y-2">
                    <Skeleton width={140} height={18} />
                    <Skeleton width={100} height={14} />
                </div>
            </div>
            <Skeleton width={96} height={36} rounded="lg" />
        </div>
        {/* Trend chart placeholder */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <Skeleton width={200} height={16} className="mb-4" />
            <Skeleton height={192} className="w-full rounded-xl" />
        </div>
        {/* Search bar */}
        <Skeleton height={40} width={280} rounded="lg" />
        {/* Audit rows */}
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Skeleton width={44} height={32} rounded="md" />
                    <div className="space-y-1.5">
                        <Skeleton width={180} height={16} />
                        <Skeleton width={120} height={12} />
                    </div>
                </div>
                <Skeleton width={90} height={28} rounded="lg" />
            </div>
        ))}
    </div>
);

/**
 * Benchmark Tab skeleton — competitor comparison
 */
export const BenchmarkSkeleton: React.FC = () => (
    <div className="space-y-8 animate-pulse">
        <div className="flex items-center justify-between">
            <Skeleton width={200} height={24} />
            <Skeleton width={140} height={36} rounded="lg" />
        </div>
        {/* Radar chart placeholder */}
        <div className="bg-surface rounded-2xl border border-white/5 p-8 flex flex-col items-center">
            <Skeleton width={300} height={300} rounded="full" className="mb-6" />
            <div className="flex gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-2">
                        <Skeleton width={12} height={12} rounded="full" />
                        <Skeleton width={80} height={14} />
                    </div>
                ))}
            </div>
        </div>
        {/* Competitor rows */}
        {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-white/5 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton width={40} height={40} rounded="xl" />
                    <div className="space-y-1.5">
                        <Skeleton width={150} height={16} />
                        <Skeleton width={100} height={12} />
                    </div>
                </div>
                <Skeleton width={60} height={28} rounded="lg" />
            </div>
        ))}
    </div>
);

/**
 * Sentinel Dashboard skeleton — keyword ranking table
 */
export const SentinelSkeleton: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
            <Skeleton width={220} height={24} />
            <Skeleton width={160} height={36} rounded="lg" />
        </div>
        {/* Keyword input row */}
        <div className="flex gap-3">
            <Skeleton height={40} className="flex-1 max-w-xs rounded-lg" />
            <Skeleton height={40} width={120} rounded="lg" />
        </div>
        {/* Line chart placeholder */}
        <div className="bg-surface border border-white/5 rounded-xl p-6">
            <Skeleton width={180} height={16} className="mb-4" />
            <Skeleton height={200} className="w-full rounded-xl" />
        </div>
        {/* Ranking rows */}
        <TableSkeleton rows={4} />
    </div>
);
