/**
 * Recharts Theme Configuration
 * Unified styling for all charts in the Cognition AI platform
 */

import React from 'react';

// Color palette aligned with design system
export const CHART_COLORS = {
    primary: '#3B82F6',      // Blue
    secondary: '#8B5CF6',    // Purple
    success: '#10B981',      // Emerald
    warning: '#F59E0B',      // Amber
    danger: '#EF4444',       // Red
    neutral: '#475569',      // Slate

    // Gradient colors
    primaryLight: '#60A5FA',
    primaryDark: '#1E40AF',

    // Chart specific
    grid: 'rgba(255,255,255,0.05)',
    axis: '#94a3b8',
    background: '#18181b',
    border: '#27272a'
} as const;

// Series colors for multi-line charts
export const CHART_SERIES_COLORS = [
    CHART_COLORS.primary,
    CHART_COLORS.secondary,
    CHART_COLORS.success,
    CHART_COLORS.warning,
    CHART_COLORS.danger
];

// Axis styling
export const AXIS_STYLE = {
    tick: {
        fill: CHART_COLORS.axis,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'Fira Code, monospace'
    },
    axisLine: false,
    tickLine: false
};

// Tooltip styling
export const TOOLTIP_STYLE = {
    contentStyle: {
        backgroundColor: CHART_COLORS.background,
        borderColor: CHART_COLORS.border,
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        color: '#f8fafc',
        padding: '12px 16px',
        fontSize: '11px',
        fontWeight: 600
    },
    itemStyle: {
        color: '#f8fafc',
        fontSize: '11px',
        fontWeight: 'bold' as const
    },
    labelStyle: {
        color: CHART_COLORS.axis,
        fontSize: '9px',
        fontWeight: 'bold' as const,
        marginBottom: '8px',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em'
    },
    cursor: {
        stroke: CHART_COLORS.primary,
        strokeWidth: 2
    }
};

// Grid styling
export const GRID_STYLE = {
    strokeDasharray: '3 3',
    stroke: CHART_COLORS.grid,
    vertical: false
};

// Animation settings
export const ANIMATION_CONFIG = {
    duration: 800,
    easing: 'ease-out'
};

// Gradient definitions for area charts
export const CHART_GRADIENTS = {
    primary: {
        id: 'gradient-primary',
        stops: [
            { offset: '5%', color: CHART_COLORS.primary, opacity: 0.3 },
            { offset: '95%', color: CHART_COLORS.primary, opacity: 0 }
        ]
    },
    success: {
        id: 'gradient-success',
        stops: [
            { offset: '5%', color: CHART_COLORS.success, opacity: 0.3 },
            { offset: '95%', color: CHART_COLORS.success, opacity: 0 }
        ]
    },
    danger: {
        id: 'gradient-danger',
        stops: [
            { offset: '5%', color: CHART_COLORS.danger, opacity: 0.3 },
            { offset: '95%', color: CHART_COLORS.danger, opacity: 0 }
        ]
    }
};

// Custom Tooltip Component
interface ChartTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number | string;
        color: string;
        dataKey: string;
    }>;
    label?: string;
    valueFormatter?: (value: number | string) => string;
    labelFormatter?: (label: string) => string;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
    active,
    payload,
    label,
    valueFormatter = (v) => String(v),
    labelFormatter = (l) => l
}) => {
    if (!active || !payload?.length) return null;

    return (
        <div
            className="bg-surface border border-border rounded-xl shadow-2xl px-4 py-3"
            style={{ backdropFilter: 'blur(12px)' }}
        >
            <p className="text-[9px] uppercase font-bold text-text-secondary tracking-widest mb-2">
                {labelFormatter(label || '')}
            </p>
            <div className="space-y-1.5">
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-xs text-text-secondary capitalize">
                                {entry.name.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <span className="text-xs font-bold text-white tabular-nums">
                            {valueFormatter(entry.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Score indicator dot component
interface ScoreDotProps {
    cx?: number;
    cy?: number;
    value?: number;
    payload?: { highlight?: boolean };
}

export const ScoreDot: React.FC<ScoreDotProps> = ({
    cx = 0,
    cy = 0,
    value = 0,
    payload
}) => {
    const isHighlight = payload?.highlight;
    const color = value >= 70 ? CHART_COLORS.success :
        value >= 40 ? CHART_COLORS.warning :
            CHART_COLORS.danger;

    return (
        <circle
            cx={cx}
            cy={cy}
            r={isHighlight ? 6 : 4}
            fill={isHighlight ? '#fff' : color}
            stroke={color}
            strokeWidth={2}
            className={isHighlight ? 'animate-pulse' : ''}
        />
    );
};

// Helper function to format large numbers
export const formatChartNumber = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
};

// Helper function to format percentages
export const formatChartPercent = (value: number): string => {
    return `${value.toFixed(0)}%`;
};

export default {
    CHART_COLORS,
    CHART_SERIES_COLORS,
    AXIS_STYLE,
    TOOLTIP_STYLE,
    GRID_STYLE,
    ANIMATION_CONFIG,
    CHART_GRADIENTS,
    ChartTooltip,
    ScoreDot,
    formatChartNumber,
    formatChartPercent
};
