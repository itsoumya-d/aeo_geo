import React from 'react';
import { cn } from './Button';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
}

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => {
    const variants = {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-surface text-text-primary hover:bg-surface/80',
        success: 'border-transparent bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25',
        warning: 'border-transparent bg-amber-500/15 text-amber-400 hover:bg-amber-500/25',
        destructive: 'border-transparent bg-red-500/15 text-red-400 hover:bg-red-500/25',
        outline: 'text-text-primary border-border',
    };

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                variants[variant],
                className
            )}
            {...props}
        />
    );
};
