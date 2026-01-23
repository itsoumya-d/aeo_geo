import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Clock, Zap, AlertTriangle } from 'lucide-react';

interface Notification {
    id: string;
    type: 'success' | 'warning' | 'info' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
}

// Simulated notifications - in production, fetch from API
const SAMPLE_NOTIFICATIONS: Notification[] = [
    {
        id: '1',
        type: 'success',
        title: 'Audit Complete',
        message: 'Your audit for example.com has completed successfully.',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
        read: false,
    },
    {
        id: '2',
        type: 'info',
        title: 'Weekly Report Ready',
        message: 'Your weekly visibility report is ready to view.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        read: false,
    },
    {
        id: '3',
        type: 'warning',
        title: 'Low Credits',
        message: 'You have 2 audit credits remaining.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: true,
    },
];

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
    const iconClass = 'w-4 h-4';
    switch (type) {
        case 'success':
            return <Check className={`${iconClass} text-emerald-400`} />;
        case 'warning':
            return <AlertTriangle className={`${iconClass} text-amber-400`} />;
        case 'error':
            return <X className={`${iconClass} text-rose-400`} />;
        default:
            return <Zap className={`${iconClass} text-blue-400`} />;
    }
};

const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

export const NotificationDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

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

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
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
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">No notifications</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`px-4 py-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors cursor-pointer ${!notification.read ? 'bg-slate-800/30' : ''
                                        }`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            <NotificationIcon type={notification.type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-sm font-medium ${notification.read ? 'text-slate-400' : 'text-white'}`}>
                                                    {notification.title}
                                                </p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        clearNotification(notification.id);
                                                    }}
                                                    className="text-slate-500 hover:text-slate-300 p-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                                                <Clock className="w-3 h-3" />
                                                {formatTimeAgo(notification.timestamp)}
                                            </div>
                                        </div>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50">
                        <a
                            href="/settings?tab=notifications"
                            className="text-xs text-slate-400 hover:text-white transition-colors"
                        >
                            Notification Settings →
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
