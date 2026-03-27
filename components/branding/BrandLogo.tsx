import React from 'react';
import { cn } from '../ui/Button';

type BrandMarkProps = {
    className?: string;
};

type BrandLockupProps = {
    className?: string;
    textClassName?: string;
    subtextClassName?: string;
    stacked?: boolean;
    showTagline?: boolean;
};

export const BrandMark: React.FC<BrandMarkProps> = ({ className }) => (
    <img
        src="/logo.png"
        alt="GOATAEO logo"
        className={cn('object-contain', className)}
        loading="eager"
        decoding="async"
    />
);

export const BrandLockup: React.FC<BrandLockupProps> = ({
    className,
    textClassName,
    subtextClassName,
    stacked = true,
    showTagline = true,
}) => (
    <div className={cn('flex items-center gap-3 min-w-0', className)}>
        <BrandMark className="h-10 w-10 sm:h-11 sm:w-11 shrink-0" />
        <div className="min-w-0">
            <div className={cn(stacked ? 'flex flex-col' : 'flex items-baseline gap-2', textClassName)}>
                <span className="font-display font-bold tracking-[0.04em] text-text-primary leading-none whitespace-nowrap">GOATAEO</span>
                {showTagline ? (
                    <span className={cn('text-[10px] font-bold uppercase tracking-[0.24em] text-[#2f8fff] mt-1', subtextClassName)}>
                        AI Visibility Engine
                    </span>
                ) : null}
            </div>
        </div>
    </div>
);
