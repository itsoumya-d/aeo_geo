import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileText, Search, ShieldCheck, Zap, Users, History as HistoryIcon, Sparkles, Settings, ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import { TabType } from './DashboardTypes';

interface MobileBottomNavProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = React.useState(false);
    const [showRightArrow, setShowRightArrow] = React.useState(true);

    const tabs = [
        { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
        { id: 'pages' as const, label: 'Audit', icon: FileText },
        { id: 'benchmark' as const, label: 'Benchmark', icon: Users },
        { id: 'search' as const, label: 'SEO', icon: Search },
        { id: 'reports' as const, label: 'Reports', icon: FileText },
        { id: 'consistency' as const, label: 'Align', icon: ShieldCheck },
        { id: 'optimization' as const, label: 'Optimize', icon: Zap },
        { id: 'integrations' as const, label: 'Integrations', icon: Link2 },
        { id: 'history' as const, label: 'History', icon: HistoryIcon },
        { id: 'sandbox' as const, label: 'Sandbox', icon: Sparkles },
        { id: 'settings' as const, label: 'Settings', icon: Settings },
    ];

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowLeftArrow(scrollLeft > 10);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollContainerRef.current) return;
        const scrollAmount = 150;
        scrollContainerRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    // Scroll active tab into view on mount and tab change
    React.useEffect(() => {
        const activeIndex = tabs.findIndex(t => t.id === activeTab);
        if (activeIndex !== -1 && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const tabElements = container.children;
            if (tabElements[activeIndex]) {
                const tabElement = tabElements[activeIndex] as HTMLElement;
                const containerRect = container.getBoundingClientRect();
                const tabRect = tabElement.getBoundingClientRect();

                if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
                    tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }
        }
    }, [activeTab]);

    return (
        <nav aria-label="Mobile navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-surface backdrop-blur-2xl border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            {/* Scroll indicators */}
            {showLeftArrow && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-0 bottom-0 w-8 z-10 flex items-center justify-center bg-gradient-to-r from-background to-transparent"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="w-4 h-4 text-text-muted" />
                </button>
            )}
            {showRightArrow && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-0 bottom-0 w-8 z-10 flex items-center justify-center bg-gradient-to-l from-background to-transparent"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                </button>
            )}

            {/* Scrollable tab container */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex items-center gap-1 overflow-x-auto no-scrollbar px-2 py-2 pb-safe touch-action-pan-x"
            >
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all relative min-w-[60px] ${isActive ? 'text-primary' : 'text-slate-500'
                                }`}
                            aria-label={tab.label}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="mobileActiveTab"
                                    className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'scale-110' : ''} transition-transform`} aria-hidden="true" />
                            <span className={`text-[9px] font-bold uppercase tracking-wide relative z-10 ${isActive ? 'opacity-100' : 'opacity-60'}`} aria-hidden="true">
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
