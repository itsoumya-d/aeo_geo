import React, { useState } from 'react';
import { Menu, Zap, Download, FileText, PlusCircle, X, Brain } from 'lucide-react';
import { TabType } from './DashboardTypes';
import { NotificationDropdown } from '../NotificationDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
// import { MobileMenu } from './MobileMenu'; // Could extract mobile menu separately

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

    // Mobile Tabs list for the mobile menu
    const tabs = [
        { id: 'overview' as const, label: 'Overview' },
        { id: 'pages' as const, label: 'Page Audit' },
        { id: 'search' as const, label: 'Search & SEO' },
        { id: 'benchmark' as const, label: 'Benchmark' },
        { id: 'consistency' as const, label: 'Alignment' },
        { id: 'optimization' as const, label: 'Optimization' },
        { id: 'sandbox' as const, label: 'Sandbox' },
        { id: 'reports' as const, label: 'Reports' },
        { id: 'settings' as const, label: 'Settings' },
    ];

    return (
        <>
            <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-border lg:pl-64 transition-all duration-300">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        {/* Mobile: Logo & Menu Toggle */}
                        <div className="flex lg:hidden items-center gap-4">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 -ml-2 text-text-secondary hover:text-white transition-colors"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                            <div className="flex items-center gap-2" onClick={onReset}>
                                <div className="bg-primary/20 p-1.5 rounded-lg">
                                    <Brain className="text-primary w-4 h-4" />
                                </div>
                                <span className="font-bold text-white tracking-tight">Cognition</span>
                            </div>
                        </div>

                        {/* Title / Breadcrumbs (Desktop) */}
                        <div className="hidden lg:flex items-center gap-2">
                            <h2 className="text-xl font-display font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
                            {/* Credits Badge */}
                            <div
                                onClick={onTopUp}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                <Badge variant={auditCredits <= 5 ? 'warning' : 'default'} className="px-3 py-1.5 flex gap-2">
                                    <Zap className="w-3.5 h-3.5 fill-current" />
                                    <span>{auditCredits} Credits</span>
                                </Badge>
                            </div>

                            <div className="h-6 w-px bg-border hidden sm:block"></div>

                            {/* Tools */}
                            <div className="flex items-center gap-1 sm:gap-2">
                                <NotificationDropdown />
                                <div className="hidden sm:flex items-center bg-surface p-1 rounded-lg border border-border">
                                    <button onClick={onExportPDF} className="p-2 text-text-secondary hover:text-white transition-colors tooltip" title="Export PDF">
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button onClick={onExportCSV} className="p-2 text-text-secondary hover:text-white transition-colors tooltip" title="Export CSV">
                                        <FileText className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <Button onClick={onReset} size="sm" className="hidden sm:flex">
                                New Audit
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Slide-out Menu (Simplified) */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <div className="lg:hidden fixed inset-0 z-50 flex">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-64 bg-surface h-full border-r border-border p-4 overflow-y-auto"
                        >
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium mb-1 ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
