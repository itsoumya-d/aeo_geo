import React, { useState } from 'react';
import { Brain, Zap, FileText, Download, RefreshCw, PlusCircle, LayoutDashboard, Search, ShieldCheck, Users, Settings, History as HistoryIcon, Sparkles, TrendingUp, Menu, X } from 'lucide-react';
import { TabType } from './DashboardTypes';
// Active re-lint trigger
import { NotificationDropdown } from '../NotificationDropdown';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardHeaderProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    auditCredits: number;
    onReset: () => void;
    onExportPDF: () => void;
    onExportCSV: () => void;
    onTopUp: () => void;
    isExporting: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    activeTab,
    setActiveTab,
    auditCredits,
    onReset,
    onExportPDF,
    onExportCSV,
    onTopUp,
    isExporting
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    if (isExporting) return null;

    const tabs = [
        { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
        { id: 'pages' as const, label: 'Page Audit', icon: FileText },
        { id: 'search' as const, label: 'Search & SEO', icon: Search },
        { id: 'benchmark' as const, label: 'Benchmark', icon: Users },
        { id: 'reports' as const, label: 'Reports', icon: FileText },
        { id: 'consistency' as const, label: 'Alignment', icon: ShieldCheck },
        { id: 'optimization' as const, label: 'Optimization', icon: Zap },
        { id: 'history' as const, label: 'History', icon: HistoryIcon },
        { id: 'sandbox' as const, label: 'Sandbox', icon: Sparkles },
        { id: 'correlation' as const, label: 'Correlation', icon: TrendingUp },
        { id: 'integrations' as const, label: 'Connect', icon: Zap },
        { id: 'settings' as const, label: 'Settings', icon: Settings },
    ];

    const handleTabChange = (tabId: TabType) => {
        setActiveTab(tabId);
        setMobileMenuOpen(false);
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full bg-background/60 backdrop-blur-2xl border-b border-white/[0.05]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        {/* Logo & Navigation */}
                        <div className="flex items-center gap-4 sm:gap-8">
                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
                                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>

                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
                                onClick={onReset}
                            >
                                <div className="bg-primary/20 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                    <Brain className="text-primary w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
                                </div>
                                <div className="hidden xs:block sm:block">
                                    <span className="font-black text-lg sm:text-xl tracking-tighter text-white">COGNITION</span>
                                    <span className="text-[8px] sm:text-[10px] text-slate-500 block -mt-1 font-bold uppercase tracking-widest">Visibility Engine</span>
                                </div>
                            </motion.div>

                            <div className="h-8 w-px bg-white/10 hidden lg:block"></div>

                            {/* Desktop Navigation - Scrollable */}
                            <nav className="hidden lg:flex items-center bg-white/[0.02] p-1 rounded-2xl border border-white/[0.05] max-w-[600px] xl:max-w-none overflow-x-auto no-scrollbar">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`relative flex items-center gap-2 px-3 xl:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute inset-0 bg-white/[0.05] border border-white/[0.1] rounded-xl shadow-lg"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : ''}`} />
                                            <span className="relative z-10 hidden xl:inline">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
                            {/* Mobile Credits - Compact */}
                            <button
                                onClick={onTopUp}
                                className="flex lg:hidden items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                            >
                                <Zap className={`w-3.5 h-3.5 ${auditCredits <= 5 ? 'text-amber-400 animate-pulse' : 'text-primary'}`} />
                                <span className="text-xs font-black text-white">{auditCredits}</span>
                            </button>

                            {/* Desktop Credits */}
                            <motion.button
                                whileHover={{ y: -1 }}
                                onClick={onTopUp}
                                className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group"
                            >
                                <Zap className={`w-3.5 h-3.5 ${auditCredits <= 5 ? 'text-amber-400 animate-pulse' : 'text-primary'}`} />
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter leading-none mb-0.5">Credits</span>
                                    <span className="text-xs font-black text-white leading-none">{auditCredits}</span>
                                </div>
                                <PlusCircle className="w-3 h-3 text-slate-600 group-hover:text-primary transition-colors" />
                            </motion.button>

                            <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

                            <div className="flex items-center gap-1 sm:gap-2">
                                <NotificationDropdown />
                                <div className="hidden sm:flex items-center bg-white/[0.02] p-1 rounded-2xl border border-white/[0.05]">
                                    <button onClick={onExportPDF} className="p-2 text-slate-500 hover:text-white transition-colors" title="Export PDF">
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button onClick={onExportCSV} className="p-2 text-slate-500 hover:text-white transition-colors" title="Export CSV">
                                        <FileText className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={onReset}
                                className="bg-primary hover:bg-primary/90 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.05em] sm:tracking-[0.1em] shadow-[0_5px_20px_rgba(99,102,241,0.3)] transition-all hover:translate-y-[-2px] active:translate-y-[0]"
                            >
                                <span className="hidden sm:inline">New Audit</span>
                                <span className="sm:hidden">New</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Slide-out Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                        />

                        {/* Menu Panel */}
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-slate-900 border-r border-white/10 overflow-y-auto"
                        >
                            {/* Menu Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/20">
                                        <Brain className="text-primary w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-white">Navigation</span>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-2 text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Menu Items */}
                            <nav className="p-3 space-y-1">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                                ? 'bg-primary/10 text-primary border border-primary/20'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            {/* Mobile Quick Actions */}
                            <div className="p-4 border-t border-white/5 space-y-3">
                                <button
                                    onClick={() => { onExportPDF(); setMobileMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    <Download className="w-5 h-5" />
                                    <span>Export PDF</span>
                                </button>
                                <button
                                    onClick={() => { onExportCSV(); setMobileMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    <FileText className="w-5 h-5" />
                                    <span>Export CSV</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
