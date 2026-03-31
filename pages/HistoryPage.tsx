import React, { useState } from 'react';
import { AuditHistory } from '../components/AuditHistory';
import { ScheduledAudits } from '../components/ScheduledAudits';
import { History, Clock } from 'lucide-react';
import { Sidebar } from '../components/dashboard/Sidebar';
import { MobileBottomNav } from '../components/dashboard/MobileBottomNav';
import { TabType } from '../components/dashboard/DashboardTypes';
import { useNavigate } from 'react-router-dom';

type HistoryPageTab = 'history' | 'scheduled';

export const HistoryPage: React.FC = () => {
    const navigate = useNavigate();
    // Sidebar Navigation state
    const [dashboardTab, setDashboardTab] = useState<TabType>('history');
    const handleDashboardTabChange = (tab: TabType) => {
        if (tab !== 'history') {
            if (tab === 'settings') {
                navigate('/settings');
                return;
            }
            if (tab === 'integrations') {
                navigate('/settings/integrations');
                return;
            }
            navigate('/dashboard');
        }
    };

    const [activeTab, setActiveTab] = useState<HistoryPageTab>('history');

    const tabs: { id: HistoryPageTab; label: string; icon: React.ReactNode }[] = [
        { id: 'history', label: 'Audit History', icon: <History className="w-4 h-4" /> },
        { id: 'scheduled', label: 'Scheduled', icon: <Clock className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen bg-background text-text-primary flex">
            {/* Sidebar Navigation */}
            <Sidebar activeTab={dashboardTab} setActiveTab={handleDashboardTabChange} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
                <header className="bg-surface/50 border-b border-border backdrop-blur-md sticky top-0 z-30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-xl font-display font-bold text-text-primary">Audit Management</h1>
                                <p className="text-sm text-text-secondary">View past audits, manage schedules, and bulk operations.</p>
                            </div>
                            <div className="flex flex-wrap bg-background border border-border rounded-lg p-1">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                                            ${activeTab === tab.id
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                                            }
                                        `}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 lg:pb-8">
                    {activeTab === 'history' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <AuditHistory />
                        </div>
                    )}
                    {activeTab === 'scheduled' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <ScheduledAudits />
                        </div>
                    )}
                </main>

                <div className="lg:hidden">
                    <MobileBottomNav activeTab="history" setActiveTab={handleDashboardTabChange} />
                </div>
            </div>
        </div>
    );
};
