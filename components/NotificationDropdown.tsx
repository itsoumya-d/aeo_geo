import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, X, Clock, Zap, AlertTriangle, CheckCircle, Users, TrendingDown, CreditCard } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AppNotification {
    id: string;
    type: 'audit_complete' | 'score_drop' | 'credit_warning' | 'team_invite' | 'competitor_change' | 'general';
    title: string;
    message: string;
    link?: string;
    read_at: string | null;
    created_at: string;
}

const NotificationIcon: React.FC<{ type: AppNotification['type'] }> = ({ type }) => {
    const iconClass = 'w-4 h-4';
    switch (type) {
        case 'audit_complete':
            return <CheckCircle className={`${iconClass} text-emerald-400`} />;
        case 'score_drop':
            return <TrendingDown className={`${iconClass} text-rose-400`} />;
        case 'credit_warning':
            return <CreditCard className={`${iconClass} text-amber-400`} />;
        case 'team_invite':
            return <Users className={`${iconClass} text-blue-400`} />;
        case 'competitor_change':
            return <AlertTriangle className={`${iconClass} text-orange-400`} />;
        default:
            return <Zap className={`${iconClass} text-primary`} />;
    }
};

const formatTimeAgo = (dateStr: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

export const NotificationDropdown: React.FC = () => {
    const { user, organization } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read_at).length;

    // Fetch notifications from DB
    const fetchNotifications = useCallback(async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setNotifications(data);
        }
        setLoading(false);
    }, [user?.id]);

    // Initial fetch + realtime subscription
    useEffect(() => {
        if (!user?.id) { setLoading(false); return; }

        fetchNotifications();

        // Subscribe to new notifications in real-time
        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setNotifications(prev => [payload.new as AppNotification, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, fetchNotifications]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
        );
        await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', id);
    };

    const markAllAsRead = async () => {
        const now = new Date().toISOString();
        setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || now })));

        if (user?.id) {
            await supabase
                .from('notifications')
                .update({ read_at: now })
                .eq('user_id', user.id)
                .is('read_at', null);
        }
    };

    const clearNotification = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        await supabase.from('notifications').delete().eq('id', id);
    };

    const handleNotificationClick = (notification: AppNotification) => {
        markAsRead(notification.id);
        if (notification.link) {
            window.location.href = notification.link;
        }
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={isOpen}
                className="relative p-2 rounded-lg text-text-muted hover:text-white hover:bg-surfaceHighlight transition-colors"
            >
                <Bell className="w-5 h-5" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    role="menu"
                    aria-label="Notifications"
                    className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-primary hover:text-primary/80 font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="px-4 py-8 text-center">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs text-slate-500">Loading...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">No notifications</p>
                                <p className="text-xs text-slate-600 mt-1">We'll let you know when something happens</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    role="menuitem"
                                    tabIndex={0}
                                    className={`px-4 py-3 border-b border-border last:border-0 hover:bg-surfaceHighlight transition-colors cursor-pointer ${!notification.read_at ? 'bg-blue-50' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleNotificationClick(notification);
                                        }
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            <NotificationIcon type={notification.type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm font-medium ${notification.read_at ? 'text-text-muted' : 'text-white'}`}>
                                                    {notification.title}
                                                </p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        clearNotification(notification.id);
                                                    }}
                                                    aria-label={`Dismiss ${notification.title}`}
                                                    className="text-slate-500 hover:text-text-secondary p-1"
                                                >
                                                    <X className="w-3 h-3" aria-hidden="true" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                                                <Clock className="w-3 h-3" aria-hidden="true" />
                                                {formatTimeAgo(notification.created_at)}
                                            </div>
                                        </div>
                                        {!notification.read_at && (
                                            <div className="w-2 h-2 bg-primary rounded-full mt-2 animate-pulse" />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-border bg-surfaceHighlight">
                        <a
                            href="/settings?tab=notifications"
                            className="text-xs text-text-muted hover:text-white transition-colors"
                        >
                            Notification Settings &rarr;
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
