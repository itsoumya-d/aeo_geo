import React, { useState } from 'react';
import { AuditHistory } from '../components/AuditHistory';
import { ScheduledAudits } from '../components/ScheduledAudits';
import { BulkDomainManagement } from '../components/BulkDomainManagement';
import { History, Clock, ChevronLeft, Files } from 'lucide-react';

type HistoryTab = 'history' | 'scheduled' | 'bulk';

interface HistoryPageProps {
    onSelectAudit?: (audit: any) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectAudit }) => {
    const [activeTab, setActiveTab] = useState<HistoryTab>('history');

    const tabs: { id: HistoryTab; label: string; icon: React.ReactNode }[] = [
        { id: 'history', label: 'Audit History', icon: <History className="w-5 h-5" /> },
        { id: 'scheduled', label: 'Scheduled', icon: <Clock className="w-5 h-5" /> },
        { id: 'bulk', label: 'Bulk Management', icon: <Files className="w-5 h-5" /> },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-slate-800 bg-slate-900/50">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <a
                                href="/"
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </a>
                            <div>
                                <h1 className="text-xl font-bold text-white">Audit Management</h1>
                                <p className="text-sm text-slate-400">View past audits and manage schedules</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="flex gap-2 mb-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === tab.id
                                ? 'bg-primary text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {activeTab === 'history' && <AuditHistory onSelectAudit={onSelectAudit} />}
                {activeTab === 'scheduled' && <ScheduledAudits />}
                {activeTab === 'bulk' && <BulkDomainManagement />}
            </div>
        </div>
    );
};
