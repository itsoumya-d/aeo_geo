import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'cta' | 'outline' | 'ghost' | 'destructive' | 'link';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {

        const variants = {
            primary: 'bg-primary text-white hover:bg-primary-hover shadow-lg hover:shadow-glow-lg border border-white/10',
            cta: 'bg-gradient-to-r from-cta to-orange-600 text-white hover:shadow-glow-cta hover:scale-[1.02] border border-white/20',
            secondary: 'bg-surface/50 text-text-primary border border-white/10 hover:bg-surface hover:border-primary/30 backdrop-blur-sm',
            outline: 'bg-transparent border border-primary/50 text-primary hover:bg-primary/10 hover:border-primary',
            ghost: 'bg-transparent text-text-secondary hover:text-white hover:bg-white/5',
            destructive: 'bg-red-600/80 text-white hover:bg-red-600 shadow-md backdrop-blur-sm',
            link: 'text-primary underline-offset-4 hover:underline p-0 h-auto',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs',
            md: 'h-10 px-4 py-2',
            lg: 'h-12 px-8 text-lg',
            icon: 'h-10 w-10 p-2 flex items-center justify-center',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background',
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-currentColor border-t-transparent" />
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
