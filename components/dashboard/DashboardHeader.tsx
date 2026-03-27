import React, { useState } from 'react';
import { Menu, Zap, Download, FileText, PlusCircle, X, Share2, LogOut, Settings } from 'lucide-react';
import { useToast } from '../Toast';
import { TabType } from './DashboardTypes';
import { NotificationDropdown } from '../NotificationDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLockup } from '../branding/BrandLogo';
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
    sidebarCollapsed?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    activeTab,
    setActiveTab,
    auditCredits,
    onReset,
    onExportPDF,
    onExportCSV,
    onTopUp,
    isExporting,
    sidebarCollapsed,
}) => {
    const { t, i18n } = useTranslation();
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const toast = useToast();

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied!', 'Share this report with your team.');
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login', { replace: true });
    };

    if (isExporting) return null;

    return (
        <>
            <header className={`sticky top-0 z-30 w-full bg-slate-950/90 backdrop-blur-md border-b border-white/10 transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-64'}`}>
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        {/* Mobile: Logo & Menu Toggle */}
                        <div className="flex lg:hidden items-center gap-4">
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 -ml-2 text-text-secondary hover:text-white transition-colors"
                                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                                aria-expanded={mobileMenuOpen}
                                aria-controls="mobile-nav-menu"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
                            </button>
                            <Link to="/" className="transition-transform duration-300 hover:-translate-y-0.5">
                                <BrandLockup showTagline={false} />
                            </Link>
                        </div>

                        {/* Title / Breadcrumbs (Desktop) */}
                        <div className="hidden lg:flex items-center gap-4">
                            <Link to="/" className="transition-transform duration-300 hover:-translate-y-0.5">
                                <BrandLockup showTagline={false} />
                            </Link>
                            <div className="h-6 w-px bg-white/10" />
                            <h2 className="text-xl font-display font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
                            {/* Credits Badge */}
                            <button
                                onClick={onTopUp}
                                className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full"
                                aria-label={`${auditCredits} credits remaining. Click to top up.`}
                            >
                                <Badge variant={auditCredits <= 5 ? 'warning' : 'default'} className="px-3 py-1.5 flex gap-2">
                                    <Zap className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                                    <span aria-hidden="true">{auditCredits} Credits</span>
                                </Badge>
                            </button>

                            <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

                            {/* Tools */}
                            <div className="flex items-center gap-1 sm:gap-2">
                                <NotificationDropdown />

                                {/* Language Selector */}
                                <div
                                    role="group"
                                    aria-label="Language selector"
                                    className="hidden sm:flex items-center bg-slate-900 p-1 rounded-lg border border-white/10 mr-1"
                                >
                                    <button
                                        onClick={() => i18n.changeLanguage('en')}
                                        className={`px-2 py-1 text-xs font-bold rounded ${i18n.language.startsWith('en') ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'}`}
                                        aria-label="English"
                                        aria-pressed={i18n.language.startsWith('en')}
                                    >
                                        EN
                                    </button>
                                    <button
                                        onClick={() => i18n.changeLanguage('es')}
                                        className={`px-2 py-1 text-xs font-bold rounded ${i18n.language.startsWith('es') ? 'bg-primary text-white' : 'text-text-secondary hover:text-white'}`}
                                        aria-label="Español"
                                        aria-pressed={i18n.language.startsWith('es')}
                                    >
                                        ES
                                    </button>
                                </div>

                                <div className="hidden sm:flex items-center bg-slate-900 p-1 rounded-lg border border-white/10">
                                    <button
                                        onClick={onExportPDF}
                                        className="p-2 text-text-secondary hover:text-white transition-colors tooltip"
                                        title="Export PDF"
                                        aria-label="Export as PDF"
                                    >
                                        <Download className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={onExportCSV}
                                        className="p-2 text-text-secondary hover:text-white transition-colors tooltip"
                                        title="Export CSV"
                                        aria-label="Export as CSV"
                                    >
                                        <FileText className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    <div className="w-px h-4 bg-white/10 mx-1" aria-hidden="true" />
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 text-text-secondary hover:text-white transition-colors tooltip"
                                        title="Logout"
                                        aria-label="Logout"
                                    >
                                        <LogOut className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    <div className="w-px h-4 bg-white/10 mx-1" aria-hidden="true" />
                                    <button
                                        onClick={handleShare}
                                        className="p-2 text-text-secondary hover:text-white transition-colors tooltip"
                                        title="Copy link"
                                        aria-label="Copy link to clipboard"
                                    >
                                        <Share2 className="w-4 h-4" aria-hidden="true" />
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
                            id="mobile-nav-menu"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Navigation menu"
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-64 bg-surface h-full border-r border-border p-4 overflow-y-auto"
                        >
                            <div className="mb-4">
                                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-text-muted">Menu</p>
                            </div>

                            <div className="space-y-2">
                                <button
                                    onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium ${activeTab === 'overview' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-secondary hover:bg-slate-100 hover:text-text-primary border border-transparent'}`}
                                    aria-current={activeTab === 'overview' ? 'page' : undefined}
                                >
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => { onReset(); setMobileMenuOpen(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-lg text-sm font-medium border border-primary/20"
                                >
                                    <PlusCircle className="w-4 h-4" /> New Audit
                                </button>
                                <button
                                    onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-text-secondary rounded-lg text-sm font-medium hover:bg-slate-100 hover:text-text-primary"
                                >
                                    <Settings className="w-4 h-4" /> Settings
                                </button>
                                <button
                                    onClick={async () => { await handleLogout(); setMobileMenuOpen(false); }}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-text-secondary rounded-lg text-sm font-medium hover:bg-slate-100 hover:text-text-primary"
                                >
                                    <LogOut className="w-4 h-4" /> Sign Out
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
