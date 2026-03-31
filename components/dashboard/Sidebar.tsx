import React, { useState, useEffect, useCallback } from 'react';
import {
    LayoutDashboard, FileText, Search, Users, ShieldCheck,
    Zap, History, Sparkles, Settings, Brain, Upload,
    ChevronLeft, ChevronRight, Plus, Share2, MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TabType } from './DashboardTypes';
import { cn } from '../ui/Button';
import { BrandMark } from '../branding/BrandLogo';
import { BulkImportModal } from './BulkImportModal';
import { WorkspaceSwitcher } from '../WorkspaceSwitcher';
import { CreateWorkspaceModal } from '../CreateWorkspaceModal';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    onReset?: () => void;
    onNewAudit?: () => void;
    onCollapsedChange?: (collapsed: boolean) => void;
}

const COLLAPSED_KEY = 'cognition:sidebar-collapsed';

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onReset, onNewAudit, onCollapsedChange }) => {
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; } catch { return false; }
    });
    const [tooltip, setTooltip] = useState<string | null>(null);
    const { t } = useTranslation();

    // Persist collapsed state and notify parent
    useEffect(() => {
        try { localStorage.setItem(COLLAPSED_KEY, String(collapsed)); } catch {}
        onCollapsedChange?.(collapsed);
    }, [collapsed, onCollapsedChange]);

    const tabs = [
        { id: 'overview' as const,     label: t('sidebar.dashboard', 'Overview'),       icon: LayoutDashboard, shortcut: '1' },
        { id: 'pages' as const,        label: t('sidebar.pages', 'Pages'),              icon: FileText,        shortcut: '2' },
        { id: 'search' as const,       label: t('sidebar.search', 'Search'),            icon: Search,          shortcut: '3' },
        { id: 'benchmark' as const,    label: t('sidebar.benchmark', 'Benchmark'),      icon: Users,           shortcut: '4' },
        { id: 'social' as const,       label: t('sidebar.social', 'Social'),            icon: Share2,          shortcut: '' },
        { id: 'local' as const,        label: t('sidebar.local', 'Local'),              icon: MapPin,          shortcut: '' },
        { id: 'consistency' as const,  label: t('sidebar.consistency', 'Consistency'),  icon: ShieldCheck,     shortcut: '5' },
        { id: 'optimization' as const, label: t('sidebar.optimization', 'Optimize'),    icon: Zap,             shortcut: '6' },
        { id: 'sandbox' as const,      label: t('sidebar.sandbox', 'Sandbox'),          icon: Sparkles,        shortcut: '7' },
        { id: 'reports' as const,      label: t('sidebar.reports', 'Reports'),          icon: FileText,        shortcut: '8' },
        { id: 'history' as const,      label: t('sidebar.history', 'History'),          icon: History,         shortcut: '9' },
        { id: 'integrations' as const, label: t('sidebar.integrations', 'Integrations'),icon: Zap,             shortcut: '' },
        { id: 'settings' as const,     label: t('sidebar.settings', 'Settings'),        icon: Settings,        shortcut: '' },
    ];

    // Keyboard shortcuts: Ctrl+1…9 to switch tabs
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!e.ctrlKey && !e.metaKey) return;
        const digit = parseInt(e.key, 10);
        if (isNaN(digit) || digit < 1 || digit > 9) return;
        const target = tabs[digit - 1];
        if (target) {
            e.preventDefault();
            setActiveTab(target.id);
        }
    }, [setActiveTab, tabs]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const width = collapsed ? 'w-[68px]' : 'w-64';

    return (
        <>
            <motion.aside
                layout
                transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                className={cn(
                    'hidden lg:flex flex-col h-screen bg-surface border-r border-border shrink-0 fixed top-0 left-0 z-40 overflow-hidden',
                    width
                )}
            >
                {/* Logo area */}
                <div className="h-20 flex items-center px-3 border-b border-border">
                    <button
                        type="button"
                        className="flex items-center justify-center cursor-pointer group hover:opacity-80 transition-opacity w-10 h-10 text-left bg-transparent border-0 p-0"
                        onClick={onReset}
                        title="Back to home"
                        aria-label="Back to home"
                    >
                        <BrandMark className="h-10 w-10 shrink-0 rounded-xl" />
                    </button>

                    {/* Collapse toggle — only visible when expanded */}
                    <AnimatePresence initial={false}>
                        {!collapsed && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setCollapsed(true)}
                                className="ml-auto p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-slate-100 transition-colors"
                                title="Collapse sidebar (Ctrl+\\)"
                                aria-label="Collapse sidebar"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Expand button when collapsed */}
                {collapsed && (
                    <div className="px-3 pt-3">
                        <button
                            onClick={() => setCollapsed(false)}
                            className="w-full flex items-center justify-center p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-slate-100 transition-colors"
                            title="Expand sidebar"
                            aria-label="Expand sidebar"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Workspace switcher — hidden when collapsed */}
                <AnimatePresence initial={false}>
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-3 py-3 border-b border-border overflow-hidden"
                        >
                            <WorkspaceSwitcher onCreateClick={() => setShowCreateWorkspace(true)} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* New Audit CTA */}
                <div className={cn('px-3 pt-3 pb-2', collapsed ? 'border-b border-border' : '')}>
                    <button
                        onClick={onNewAudit || onReset}
                        className={cn(
                            'w-full flex items-center gap-2 rounded-lg text-sm font-semibold transition-all duration-200',
                            'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40',
                            collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
                        )}
                        title={collapsed ? 'New Audit' : undefined}
                        aria-label="Start new audit"
                    >
                        <Plus className="w-4 h-4 flex-shrink-0" />
                        <AnimatePresence initial={false}>
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    New Audit
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 custom-scrollbar" role="navigation" aria-label="Main navigation">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <div key={tab.id} className="relative">
                                <button
                                    onClick={() => setActiveTab(tab.id)}
                                    onMouseEnter={() => collapsed && setTooltip(tab.label)}
                                    onMouseLeave={() => setTooltip(null)}
                                    aria-label={tab.label}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'w-full flex items-center rounded-lg text-sm font-medium transition-all duration-200 group relative',
                                        collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                                        isActive
                                            ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                                            : 'text-text-secondary hover:text-text-primary hover:bg-slate-100 border border-transparent'
                                    )}
                                >
                                    <Icon className={cn('w-4 h-4 flex-shrink-0 transition-colors', isActive ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary')} />

                                    <AnimatePresence initial={false}>
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: 'auto' }}
                                                exit={{ opacity: 0, width: 0 }}
                                                className="overflow-hidden whitespace-nowrap flex-1 text-left"
                                            >
                                                {tab.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>

                                    {!collapsed && tab.shortcut && (
                                        <span className="text-[10px] text-text-muted font-mono opacity-0 group-hover:opacity-60 transition-opacity ml-auto">
                                            ⌘{tab.shortcut}
                                        </span>
                                    )}

                                    {!collapsed && isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-glow flex-shrink-0" />
                                    )}
                                </button>

                                {/* Tooltip for collapsed mode */}
                                {collapsed && tooltip === tab.label && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none">
                                        <div className="bg-surface border border-border rounded-md px-2.5 py-1.5 text-xs font-medium text-text-primary whitespace-nowrap shadow-lg">
                                            {tab.label}
                                            {tab.shortcut && (
                                                <span className="ml-2 text-text-muted font-mono">⌘{tab.shortcut}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Bulk Import */}
                <div className="px-3 pb-2">
                    <button
                        onClick={() => setShowBulkImport(true)}
                        title={collapsed ? 'Bulk Import' : undefined}
                        aria-label="Bulk Import"
                        className={cn(
                            'w-full flex items-center gap-2 rounded-lg text-xs font-bold uppercase tracking-wider',
                            'bg-slate-100 hover:bg-slate-200 text-text-secondary hover:text-text-primary border border-border transition-colors',
                            collapsed ? 'justify-center p-3' : 'px-3 py-2.5'
                        )}
                    >
                        <Upload className="w-3.5 h-3.5 flex-shrink-0" />
                        <AnimatePresence initial={false}>
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    Bulk Import
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>

                {/* Footer / Version */}
                <div className="p-3 border-t border-border">
                    <AnimatePresence initial={false}>
                        {!collapsed ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-background/50 rounded-lg p-3 border border-border"
                            >
                                <p className="text-[10px] text-text-muted">
                                    GOATAEO &middot; v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center"
                            >
                                <p className="text-[9px] text-text-muted font-mono">
                                    v{(import.meta.env.VITE_APP_VERSION || '1.0.0').split('.')[0]}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.aside>

            <BulkImportModal isOpen={showBulkImport} onClose={() => setShowBulkImport(false)} />
            <CreateWorkspaceModal isOpen={showCreateWorkspace} onClose={() => setShowCreateWorkspace(false)} />
        </>
    );
};
