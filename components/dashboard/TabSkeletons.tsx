import React from 'react';
import { Skeleton } from '../ui/Skeleton';

/**
 * Generic Card Skeleton for consistent loading states in dashboard cards
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`bg-blue-50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
            <Skeleton width={48} height={48} rounded="xl" />
            <div>
                <Skeleton width={120} height={16} className="mb-2" />
                <Skeleton width={80} height={12} />
            </div>
        </div>
        <Skeleton height={120} className="w-full mb-4" rounded="xl" />
        <div className="flex gap-2">
            <Skeleton width={80} height={32} rounded="lg" />
            <Skeleton width={100} height={32} rounded="lg" />
        </div>
    </div>
);

/**
 * Table Row Skeleton
 */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
    <div className="flex items-center justify-between p-4 border-b border-white/5">
        {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} width={i === 0 ? 200 : 80 + i * 20} height={16} />
        ))}
    </div>
);

/**
 * History Tab Skeleton
 */
export const HistoryTabSkeleton: React.FC = () => (
    <div className="space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-10">
            <div>
                <div className="flex items-center gap-4 mb-4">
                    <Skeleton width={44} height={44} rounded="xl" />
                    <Skeleton width={200} height={32} />
                </div>
                <Skeleton width={400} height={16} />
            </div>
            <Skeleton width={180} height={48} rounded="2xl" />
        </div>

        {/* Chart and Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
                {/* Chart */}
                <div className="bg-blue-50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-10">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-3">
                            <Skeleton width={20} height={20} rounded="md" />
                            <Skeleton width={150} height={16} />
                        </div>
                    </div>
                    <Skeleton height={350} className="w-full" rounded="2xl" />
                </div>

                {/* Snapshot Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-blue-50 p-8 rounded-[2rem] border border-white/5">
                            <div className="flex items-center gap-4 mb-6">
                                <Skeleton width={44} height={44} rounded="2xl" />
                                <div>
                                    <Skeleton width={100} height={12} className="mb-2" />
                                    <Skeleton width={60} height={12} />
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <Skeleton width={80} height={10} className="mb-2" />
                                    <Skeleton width={100} height={40} />
                                </div>
                                <Skeleton width={60} height={24} rounded="full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4">
                <div className="bg-blue-50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-10 h-[500px] flex flex-col items-center justify-center">
                    <Skeleton width={80} height={80} rounded="2xl" className="mb-8" />
                    <Skeleton width={150} height={20} className="mb-2" />
                    <Skeleton width={180} height={14} />
                </div>
            </div>
        </div>
    </div>
);

/**
 * Benchmark Tab Skeleton
 */
export const BenchmarkTabSkeleton: React.FC = () => (
    <div className="space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-10">
            <div>
                <div className="flex items-center gap-4 mb-4">
                    <Skeleton width={44} height={44} rounded="xl" />
                    <Skeleton width={180} height={32} />
                </div>
                <Skeleton width={350} height={16} />
            </div>
            <div className="flex gap-4">
                <Skeleton width={150} height={48} rounded="2xl" />
                <Skeleton width={150} height={48} rounded="2xl" />
            </div>
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <CardSkeleton key={i} />
            ))}
        </div>

        {/* Chart */}
        <div className="bg-blue-50 backdrop-blur-xl rounded-3xl border border-white/5 p-10">
            <Skeleton width={150} height={16} className="mb-8" />
            <Skeleton height={300} className="w-full" rounded="2xl" />
        </div>
    </div>
);

/**
 * Integrations Tab Skeleton
 */
export const IntegrationsTabSkeleton: React.FC = () => (
    <div className="space-y-12">
        {/* Header */}
        <div className="border-b border-white/[0.05] pb-10">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton width={44} height={44} rounded="xl" />
                <Skeleton width={180} height={32} />
            </div>
            <Skeleton width={400} height={16} />
        </div>

        {/* API Key Card */}
        <div className="bg-blue-50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-10">
            <Skeleton width={200} height={14} className="mb-6" />
            <div className="flex gap-4">
                <Skeleton height={56} className="flex-1" rounded="2xl" />
                <Skeleton width={80} height={56} rounded="2xl" />
                <Skeleton width={56} height={56} rounded="2xl" />
            </div>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-blue-50 p-8 rounded-[2rem] border border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <Skeleton width={48} height={48} rounded="2xl" />
                        <Skeleton width={80} height={20} rounded="full" />
                    </div>
                    <Skeleton width={120} height={20} className="mb-3" />
                    <Skeleton width="100%" height={40} className="mb-6" />
                    <Skeleton height={48} className="w-full" rounded="xl" />
                </div>
            ))}
        </div>
    </div>
);

/**
 * Settings Tab Skeleton
 */
export const SettingsTabSkeleton: React.FC = () => (
    <div className="space-y-10">
        {/* Header */}
        <div className="border-b border-white/[0.05] pb-10">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton width={44} height={44} rounded="xl" />
                <Skeleton width={150} height={32} />
            </div>
            <Skeleton width={300} height={16} />
        </div>

        {/* Settings Sections */}
        {[1, 2, 3].map(section => (
            <div key={section} className="bg-blue-50 backdrop-blur-xl rounded-3xl border border-white/5 p-10">
                <Skeleton width={180} height={20} className="mb-6" />
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl">
                            <div className="flex items-center gap-4">
                                <Skeleton width={40} height={40} rounded="lg" />
                                <div>
                                    <Skeleton width={120} height={16} className="mb-2" />
                                    <Skeleton width={200} height={12} />
                                </div>
                            </div>
                            <Skeleton width={50} height={24} rounded="full" />
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

/**
 * Reports Tab Skeleton
 */
export const ReportsTabSkeleton: React.FC = () => (
    <div className="space-y-10">
        {/* Header */}
        <div className="border-b border-white/[0.05] pb-10">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton width={44} height={44} rounded="xl" />
                <Skeleton width={180} height={32} />
            </div>
            <Skeleton width={300} height={16} />
        </div>

        {/* Report Preview */}
        <div className="bg-white rounded-3xl p-10 space-y-8">
            <div className="flex items-center justify-between">
                <Skeleton width={200} height={32} />
                <Skeleton width={100} height={100} rounded="xl" />
            </div>
            <Skeleton height={2} className="w-full" />
            <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="text-center">
                        <Skeleton width={80} height={60} className="mx-auto mb-3" rounded="xl" />
                        <Skeleton width={100} height={14} className="mx-auto" />
                    </div>
                ))}
            </div>
            <Skeleton height={200} className="w-full" rounded="xl" />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
            <Skeleton width={150} height={50} rounded="2xl" />
            <Skeleton width={150} height={50} rounded="2xl" />
        </div>
    </div>
);

/**
 * Sandbox Tab Skeleton
 */
export const SandboxTabSkeleton: React.FC = () => (
    <div className="space-y-10">
        {/* Header */}
        <div className="border-b border-white/[0.05] pb-10">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton width={44} height={44} rounded="xl" />
                <Skeleton width={180} height={32} />
            </div>
            <Skeleton width={350} height={16} />
        </div>

        {/* Input Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map(i => (
                <div key={i} className="bg-blue-50 backdrop-blur-xl rounded-3xl border border-white/5 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Skeleton width={32} height={32} rounded="lg" />
                        <Skeleton width={100} height={16} />
                    </div>
                    <Skeleton height={200} className="w-full" rounded="xl" />
                </div>
            ))}
        </div>

        {/* Goal Input */}
        <div className="bg-blue-50 backdrop-blur-xl rounded-3xl border border-white/5 p-8">
            <Skeleton width={120} height={14} className="mb-4" />
            <Skeleton height={50} className="w-full" rounded="xl" />
        </div>

        {/* Action Button */}
        <Skeleton height={56} width={200} className="mx-auto" rounded="2xl" />
    </div>
);
