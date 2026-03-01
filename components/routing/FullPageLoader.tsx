import React from 'react';
import { Loader2 } from 'lucide-react';

export const FullPageLoader: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-text-primary">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-xs font-bold text-text-muted uppercase tracking-[0.25em]">{label}</p>
            </div>
        </div>
    );
};

