import React from 'react';
import { Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
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
                <div className="absolute bottom-[-10%] right-[-10%] hidden h-[42%] w-[42%] rounded-full bg-purple-600/8 blur-[72px] sm:block sm:blur-[120px]" />
            </div>

            <div className="relative z-10 min-h-screen flex flex-col">
                <header className="h-20 flex items-center justify-between px-6">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-gradient-to-tr from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                            <Cpu className="text-white w-5 h-5" />
                        </div>
                        <span className="font-display font-bold text-lg tracking-tight text-white group-hover:text-primary transition-colors">
                            Cognition AI
                        </span>
                    </Link>
                    <div className="text-xs text-text-muted font-bold uppercase tracking-[0.25em] hidden sm:block">
                        Visibility Engine
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center px-6 pb-10">
                    <div className="w-full max-w-md">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-display font-bold text-white mb-2">{title}</h1>
                            <p className="text-text-secondary leading-relaxed">{subtitle}</p>
                        </div>

                        <Card variant="glass" className="p-8 border-white/10 shadow-2xl">
                            {children}
                        </Card>

                        {footer ? <div className="mt-6">{footer}</div> : null}
                    </div>
                </main>
            </div>
        </div>
    );
};

