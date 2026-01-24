import React from 'react';
import { LayoutDashboard, FileText, Search, Users, ShieldCheck, Zap, History, Sparkles, TrendingUp, Settings, Brain } from 'lucide-react';
import { TabType } from './DashboardTypes';
import { cn } from '../ui/Button';

interface SidebarProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    onReset?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onReset }) => {
    const tabs = [
        { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
        { id: 'pages' as const, label: 'Page Audit', icon: FileText },
        { id: 'search' as const, label: 'Search & SEO', icon: Search },
        { id: 'benchmark' as const, label: 'Benchmark', icon: Users },
        { id: 'consistency' as const, label: 'Alignment', icon: ShieldCheck },
        { id: 'optimization' as const, label: 'Optimization', icon: Zap },
        { id: 'correlation' as const, label: 'Correlation', icon: TrendingUp },
        { id: 'sandbox' as const, label: 'Sandbox', icon: Sparkles },
        { id: 'reports' as const, label: 'Reports', icon: FileText },
        { id: 'history' as const, label: 'History', icon: History },
        { id: 'integrations' as const, label: 'Connect', icon: Zap },
        { id: 'settings' as const, label: 'Settings', icon: Settings },
    ];

    return (
        <aside className="hidden lg:flex flex-col w-64 h-screen bg-surface border-r border-border shrink-0 fixed top-0 left-0 z-40">
            {/* Logo Area */}
            <div className="h-20 flex items-center px-6 border-b border-border">
                <div
                    className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity"
                    onClick={onReset}
                >
                    <div className="bg-gradient-to-tr from-primary to-purple-600 p-2 rounded-lg shadow-lg shadow-primary/20">
                        <Brain className="text-white w-5 h-5 group-hover:rotate-12 transition-transform" />
                    </div>
                    <div>
                        <span className="font-display font-bold text-lg text-white tracking-tight">Cognition</span>
                        <span className="text-[10px] text-text-secondary block -mt-1 font-bold uppercase tracking-widest">Visibility Engine</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                isActive
                                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                                    : "text-text-secondary hover:text-white hover:bg-white/5 border border-transparent"
                            )}
                        >
                            <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-text-muted group-hover:text-white")} />
                            <span>{tab.label}</span>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-glow" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer / Version */}
            <div className="p-4 border-t border-border">
                <div className="bg-background/50 rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-medium text-emerald-400">System Online</span>
                    </div>
                    <p className="text-[10px] text-text-muted">
                        v2.4.0 • <a href="/changelog" className="hover:text-primary transition-colors">Changelog</a>
                    </p>
                </div>
            </div>
        </aside>
    );
};
