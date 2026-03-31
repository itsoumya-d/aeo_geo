import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLockup } from '../../components/branding/BrandLogo';
import { Card } from '../../components/ui/Card';

export const AuthShell: React.FC<{
    title: string;
    subtitle: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}> = ({ title, subtitle, children, footer }) => {
    return (
        <div className="min-h-screen bg-background text-text-primary relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute top-[-10%] left-[-10%] hidden h-[42%] w-[42%] rounded-full bg-primary/14 blur-[72px] sm:block sm:blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] hidden h-[42%] w-[42%] rounded-full bg-secondary/10 blur-[72px] sm:block sm:blur-[120px]" />
            </div>

            <div className="relative z-10 min-h-screen flex flex-col">
                <header className="h-20 flex items-center justify-between px-4 sm:px-6">
                    <Link to="/" className="group">
                        <BrandLockup showTagline={false} />
                    </Link>
                    <div className="text-xs text-text-muted font-bold uppercase tracking-[0.25em] hidden sm:block">
                        AI Visibility
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-10">
                    <div className="w-full max-w-md">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-display font-bold text-text-primary mb-2">{title}</h1>
                            <p className="text-text-secondary leading-relaxed">{subtitle}</p>
                        </div>

                        <Card variant="glass" className="p-5 sm:p-8 border-border shadow-[0_28px_70px_rgba(74,123,173,0.14)]">
                            {children}
                        </Card>

                        {footer ? <div className="mt-6">{footer}</div> : null}
                    </div>
                </main>
            </div>
        </div>
    );
};
