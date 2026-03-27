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
            primary: 'bg-[#2f8fff] text-white hover:bg-[#2179e0] shadow-lg hover:shadow-[0_18px_45px_rgba(47,143,255,0.24)] border border-[#d7e7f4]',
            cta: 'bg-gradient-to-r from-[#2f8fff] via-[#41a8ff] to-[#5fe1f0] text-white shadow-[0_12px_35px_rgba(47,143,255,0.2)] hover:shadow-[0_22px_55px_rgba(47,143,255,0.28)] border border-[#d7e7f4]',
            secondary: 'bg-surface/90 text-text-primary border border-border hover:bg-surfaceHighlight hover:border-primary/30 hover:shadow-[0_12px_32px_rgba(74,123,173,0.18)] backdrop-blur-sm',
            outline: 'bg-transparent border border-primary/50 text-primary hover:bg-primary/10 hover:border-primary hover:shadow-[0_10px_30px_rgba(47,143,255,0.16)]',
            ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-primary/5',
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
                    'inline-flex items-center justify-center rounded-xl font-semibold transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-out active:scale-[0.985] hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background',
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
