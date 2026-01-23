import React from 'react';
import { Brain } from 'lucide-react';
import { Branding } from './DashboardTypes';

interface DashboardPrintHeaderProps {
    branding: Branding | null;
    organizationName?: string;
    overallScore: number;
}

export const DashboardPrintHeader: React.FC<DashboardPrintHeaderProps> = ({
    branding,
    organizationName,
    overallScore
}) => {
    return (
        <div className="hidden print:block mb-8 border-b-2 pb-6" style={{ borderTop: `8px solid ${branding?.primary_color || '#3b82f6'}` }}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    {branding?.logo_url ? (
                        <img src={branding.logo_url} alt="Logo" className="h-12 w-auto" />
                    ) : (
                        <Brain className="w-8 h-8 text-primary" />
                    )}
                    <div className="text-left">
                        <h1 className="text-2xl font-bold text-slate-900">
                            {branding?.company_name || organizationName || 'AI Visibility Report'}
                        </h1>
                        <p className="text-sm text-slate-500">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-black" style={{ color: branding?.primary_color || '#3b82f6' }}>
                        {overallScore}
                    </div>
                    <div className="text-xs font-bold uppercase text-slate-400">Visibility Score</div>
                </div>
            </div>
        </div>
    );
};
