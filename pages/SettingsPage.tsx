import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BillingDashboard } from '../components/BillingDashboard';
import { TeamSettings } from '../components/TeamSettings';
import { APIKeyManager } from '../components/APIKeyManager';
import { ReportBranding } from '../components/ReportBranding';
import { IntegrationHub } from '../components/IntegrationHub';
import {
    User, Building2, Shield, CreditCard, Bell, Key, Palette,
    LogOut, Loader2, Check, ChevronRight, Moon, Sun,
    Mail, Trash2, AlertTriangle, Globe, Zap
} from 'lucide-react';
import { Sidebar } from '../components/dashboard/Sidebar';
import { TabType } from '../components/dashboard/DashboardTypes';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

type SettingsTab = 'profile' | 'organization' | 'domains' | 'security' | 'billing' | 'api' | 'branding' | 'notifications' | 'integrations';

export const SettingsPage: React.FC = () => {
    const { user, profile, organization, signOut, loading } = useAuth();

    // Mapping for Sidebar navigation
    const [dashboardTab, setDashboardTab] = useState<TabType>('settings');
    const handleDashboardTabChange = (tab: TabType) => {
        if (tab !== 'settings') {
            window.location.href = `/dashboard?tab=${tab}`;
        }
    };

    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Profile state
    const [fullName, setFullName] = useState(profile?.full_name || '');
    // const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

    // Organization state
    const [orgName, setOrgName] = useState(organization?.name || '');

    // Theme state (local)
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Notification preferences
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [weeklyDigest, setWeeklyDigest] = useState(true);
    const [usageAlerts, setUsageAlerts] = useState(true);

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(r => setTimeout(r, 1000));
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };

    const handleSignOut = async () => {
        await signOut();
        window.location.href = '/';
    };

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
        { id: 'organization', label: 'Organization', icon: <Building2 className="w-4 h-4" /> },
        { id: 'domains', label: 'Domains', icon: <Globe className="w-4 h-4" /> },
        { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
        { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
        { id: 'api', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
        { id: 'branding', label: 'Branding', icon: <Palette className="w-4 h-4" /> },
        { id: 'integrations', label: 'Integrations', icon: <Zap className="w-4 h-4" /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text-primary flex">
            {/* Sidebar Navigation */}
            <Sidebar activeTab={dashboardTab} setActiveTab={handleDashboardTabChange} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
                <div className="max-w-5xl mx-auto w-full px-6 py-12">
                    <header className="mb-10">
                        <h1 className="text-3xl font-display font-bold text-white mb-2">Settings</h1>
                        <p className="text-text-secondary">Manage your account, organization, and preferences.</p>
                    </header>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Settings Nav */}
                        <nav className="lg:w-64 flex-shrink-0">
                            <div className="sticky top-6">
                                <Card className="p-2 border-border bg-surface/50">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors
                        ${activeTab === tab.id
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                                                }
                      `}
                                        >
                                            {tab.icon}
                                            <span>{tab.label}</span>
                                            {activeTab === tab.id && (
                                                <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
                                            )}
                                        </button>
                                    ))}

                                    <hr className="my-2 border-border" />

                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Sign Out</span>
                                    </button>
                                </Card>
                            </div>
                        </nav>

                        {/* Content Area */}
                        <div className="flex-1 min-w-0">
                            <Card className="p-8 border-border bg-surface">
                                {/* Profile Tab */}
                                {activeTab === 'profile' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-white mb-6 font-display">Profile Settings</h2>

                                        <div className="space-y-8">
                                            {/* Avatar */}
                                            <div className="flex items-center gap-6">
                                                <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center text-3xl font-display font-bold text-primary shadow-inner">
                                                    {fullName?.charAt(0) || user?.email?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <Button variant="outline" size="sm">
                                                        Change avatar
                                                    </Button>
                                                    <p className="text-xs text-text-muted mt-2">JPG, PNG or GIF. Max 2MB.</p>
                                                </div>
                                            </div>

                                            {/* Name */}
                                            <div className="max-w-md">
                                                <Input
                                                    label="Full Name"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                />
                                            </div>

                                            {/* Email (read-only) */}
                                            <div className="max-w-md">
                                                <Input
                                                    label="Email Address"
                                                    value={user?.email || ''}
                                                    readOnly
                                                    disabled
                                                    icon={<Mail className="w-4 h-4" />}
                                                />
                                                <p className="mt-2 text-xs text-text-muted flex items-center gap-2">
                                                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">Primary</Badge>
                                                    Used for account recovery and notifications.
                                                </p>
                                            </div>

                                            {/* Theme Toggle */}
                                            <div className="flex items-center justify-between max-w-md p-4 rounded-xl bg-background/50 border border-border">
                                                <div>
                                                    <p className="text-sm font-medium text-white">Dark Mode</p>
                                                    <p className="text-xs text-text-secondary">Toggle between light and dark themes</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsDarkMode(!isDarkMode)}
                                                    className={`
                            relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
                            ${isDarkMode ? 'bg-primary' : 'bg-slate-600'}
                          `}
                                                >
                                                    <span className={`
                            absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform flex items-center justify-center
                            ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}
                          `}>
                                                        {isDarkMode ? (
                                                            <Moon className="w-2.5 h-2.5 text-slate-800" />
                                                        ) : (
                                                            <Sun className="w-2.5 h-2.5 text-yellow-500" />
                                                        )}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Organization Tab */}
                                {activeTab === 'organization' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-white mb-6 font-display">Organization Settings</h2>

                                        <div className="space-y-6">
                                            <div className="max-w-md">
                                                <Input
                                                    label="Organization Name"
                                                    value={orgName}
                                                    onChange={(e) => setOrgName(e.target.value)}
                                                />
                                            </div>

                                            <div className="max-w-md">
                                                <label className="block text-sm font-medium text-text-secondary mb-1.5 ml-1">
                                                    Organization ID
                                                </label>
                                                <code className="flex items-center justify-between text-sm text-text-primary bg-background border border-border px-3 py-2 rounded-lg font-mono">
                                                    {organization?.id || 'N/A'}
                                                    {organization?.id && <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Check className="w-3 h-3" /></Button>}
                                                </code>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-2 ml-1">
                                                    Your Role
                                                </label>
                                                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                                                    <Shield className="w-3.5 h-3.5 mr-2" />
                                                    {profile?.role || 'Member'}
                                                </Badge>
                                            </div>

                                            <hr className="border-border" />

                                            {/* Team Members Section */}
                                            <TeamSettings />
                                        </div>
                                    </div>
                                )}

                                {/* Domains Tab */}
                                {activeTab === 'domains' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-white mb-6 font-display">Domain Management</h2>
                                        <div className="p-8 text-center text-text-muted bg-background/30 rounded-xl border border-border border-dashed">
                                            <Globe className="w-10 h-10 mx-auto mb-4 text-slate-600" />
                                            <p>Domain management component placeholder</p>
                                        </div>
                                    </div>
                                )}

                                {/* Security Tab */}
                                {activeTab === 'security' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-white mb-6 font-display">Security Settings</h2>

                                        <div className="space-y-6">
                                            <div className="bg-background/50 border border-border rounded-xl p-5 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-surface rounded-lg border border-border">
                                                        <Key className="w-6 h-6 text-text-secondary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">Password</p>
                                                        <p className="text-sm text-text-muted">Last changed: Never</p>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm">
                                                    Change Password
                                                </Button>
                                            </div>

                                            <div className="bg-background/50 border border-border rounded-xl p-5 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-surface rounded-lg border border-border">
                                                        <Shield className="w-6 h-6 text-text-secondary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">Two-Factor Authentication</p>
                                                        <p className="text-sm text-text-muted">Add an extra layer of security</p>
                                                    </div>
                                                </div>
                                                <Button variant="secondary" size="sm">
                                                    Enable 2FA
                                                </Button>
                                            </div>

                                            <hr className="border-border" />

                                            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                                                <div className="flex items-start gap-4">
                                                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <h3 className="font-bold text-red-400 mb-1">Danger Zone</h3>
                                                        <p className="text-sm text-red-400/70 mb-4">
                                                            Permanently delete your account and all associated data.
                                                        </p>
                                                        <Button variant="destructive" size="sm">
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete Account
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Billing Tab */}
                                {activeTab === 'billing' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-white mb-6 font-display">Billing & Subscription</h2>
                                        <BillingDashboard />
                                    </div>
                                )}

                                {/* API Tab */}
                                {activeTab === 'api' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-white mb-6 font-display">API Access</h2>
                                        <APIKeyManager />
                                    </div>
                                )}

                                {/* Branding Tab */}
                                {activeTab === 'branding' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-white mb-6 font-display">Report Branding</h2>
                                        <ReportBranding />
                                    </div>
                                )}

                                {/* Integrations Tab */}
                                {activeTab === 'integrations' && (
                                    <div className="animate-in fade-in duration-300">
                                        <IntegrationHub />
                                    </div>
                                )}

                                {/* Notifications Tab */}
                                {activeTab === 'notifications' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-white mb-6 font-display">Notification Preferences</h2>

                                        <div className="space-y-4 max-w-2xl">
                                            {[
                                                {
                                                    id: 'email',
                                                    label: 'Email Notifications',
                                                    desc: 'Receive audit completion and report emails',
                                                    value: emailNotifications,
                                                    onChange: setEmailNotifications
                                                },
                                                {
                                                    id: 'digest',
                                                    label: 'Weekly Digest',
                                                    desc: 'Get a weekly summary of your AI visibility trends',
                                                    value: weeklyDigest,
                                                    onChange: setWeeklyDigest
                                                },
                                                {
                                                    id: 'usage',
                                                    label: 'Usage Alerts',
                                                    desc: 'Get notified when approaching plan limits (80%, 100%)',
                                                    value: usageAlerts,
                                                    onChange: setUsageAlerts
                                                },
                                            ].map(pref => (
                                                <div
                                                    key={pref.id}
                                                    className="flex items-center justify-between bg-background/50 border border-border rounded-xl p-4"
                                                >
                                                    <div>
                                                        <p className="font-bold text-white">{pref.label}</p>
                                                        <p className="text-sm text-text-muted">{pref.desc}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => pref.onChange(!pref.value)}
                                                        className={`
                            relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
                            ${pref.value ? 'bg-primary' : 'bg-slate-600'}
                          `}
                                                    >
                                                        <span className={`
                            absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform
                            ${pref.value ? 'translate-x-5' : 'translate-x-0'}
                          `} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Save Button */}
                                <div className="mt-10 pt-6 border-t border-border flex items-center justify-end gap-4">
                                    {saveSuccess && (
                                        <span className="text-sm text-emerald-400 flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                                            <Check className="w-4 h-4" /> Changes saved
                                        </span>
                                    )}
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        isLoading={isSaving}
                                        size="lg"
                                        className="min-w-[140px]"
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};
