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
export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen pb-20 bg-background text-slate-200">
            {/* Header Skeleton */}
            <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <Skeleton width={40} height={40} rounded="lg" />
                            <div>
                                <Skeleton width={100} height={20} className="mb-1" />
                                <Skeleton width={80} height={12} />
                            </div>
                        </div>

                        <div className="flex space-x-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                            <Skeleton width={80} height={32} />
                            <Skeleton width={90} height={32} />
                            <Skeleton width={100} height={32} />
                            <Skeleton width={80} height={32} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Skeleton width={70} height={32} />
                            <Skeleton width={90} height={36} />
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Skeleton */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Score Card Skeleton */}
                    <div className="lg:col-span-4 bg-surface rounded-2xl border border-slate-700 p-8 flex flex-col items-center justify-center">
                        <Skeleton width={150} height={16} className="mb-6" />
                        <Skeleton width={180} height={180} rounded="full" className="mb-4" />
                    </div>

                    {/* Platform Breakdown Skeleton */}
                    <div className="lg:col-span-8 bg-surface rounded-2xl border border-slate-700 p-8">
                        <Skeleton width={200} height={16} className="mb-6" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="h-64">
                                <Skeleton height={256} className="w-full" />
                            </div>
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/50">
                                        <div className="flex justify-between items-center mb-2">
                                            <Skeleton width={80} height={16} />
                                            <Skeleton width={50} height={20} />
                                        </div>
                                        <Skeleton height={32} className="w-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Topics Skeleton */}
                    <div className="lg:col-span-12 bg-surface rounded-2xl border border-slate-700 p-8">
                        <Skeleton width={180} height={16} className="mb-4" />
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <Skeleton key={i} width={100 + i * 20} height={36} rounded="full" />
                            ))}
                        </div>
                    </div>

                    {/* Critical Actions Skeleton */}
                    <div className="lg:col-span-12">
                        <Skeleton width={200} height={16} className="mb-6" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-surface rounded-xl p-6 border border-slate-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <Skeleton width={100} height={20} />
                                        <Skeleton width={60} height={20} />
                                    </div>
                                    <Skeleton height={24} className="w-full mb-3" />
                                    <Skeleton height={48} className="w-full mb-5" />
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                        <Skeleton width={150} height={16} />
                                        <Skeleton width={50} height={16} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

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
