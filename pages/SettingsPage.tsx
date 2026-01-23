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
    Mail, Trash2, AlertTriangle, Globe
} from 'lucide-react';

type SettingsTab = 'profile' | 'organization' | 'domains' | 'security' | 'billing' | 'api' | 'branding' | 'notifications' | 'integrations';

export const SettingsPage: React.FC = () => {
    const { user, profile, organization, signOut, loading } = useAuth();

    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Profile state
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

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
        { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
        { id: 'organization', label: 'Organization', icon: <Building2 className="w-5 h-5" /> },
        { id: 'domains', label: 'Domains', icon: <Globe className="w-5 h-5" /> },
        { id: 'security', label: 'Security', icon: <Shield className="w-5 h-5" /> },
        { id: 'billing', label: 'Billing', icon: <CreditCard className="w-5 h-5" /> },
        { id: 'api', label: 'API', icon: <Key className="w-5 h-5" /> },
        { id: 'branding', label: 'Branding', icon: <Palette className="w-5 h-5" /> },
        { id: 'integrations', label: 'Integrations', icon: <Zap className="w-5 h-5" /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar */}
                    <nav className="lg:w-64 flex-shrink-0">
                        <div className="bg-surface border border-slate-700 rounded-xl p-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                    ${activeTab === tab.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }
                  `}
                                >
                                    {tab.icon}
                                    <span className="font-medium">{tab.label}</span>
                                    {activeTab === tab.id && (
                                        <ChevronRight className="w-4 h-4 ml-auto" />
                                    )}
                                </button>
                            ))}

                            <hr className="my-2 border-slate-700" />

                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="font-medium">Sign Out</span>
                            </button>
                        </div>
                    </nav>

                    {/* Content */}
                    <div className="flex-1">
                        <div className="bg-surface border border-slate-700 rounded-xl p-6">
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div className="animate-in fade-in duration-300">
                                    <h2 className="text-xl font-semibold text-white mb-6">Profile Settings</h2>

                                    <div className="space-y-6">
                                        {/* Avatar */}
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-primary">
                                                {fullName?.charAt(0) || user?.email?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <button className="text-sm text-primary hover:underline">
                                                    Change avatar
                                                </button>
                                                <p className="text-xs text-slate-500 mt-1">JPG, PNG or GIF. Max 2MB.</p>
                                            </div>
                                        </div>

                                        {/* Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full max-w-md bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </div>

                                        {/* Email (read-only) */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                Email Address
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-5 h-5 text-slate-500" />
                                                <span className="text-white">{user?.email}</span>
                                                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                                                    Primary
                                                </span>
                                            </div>
                                        </div>

                                        {/* Theme Toggle */}
                                        <div className="flex items-center justify-between max-w-md">
                                            <div>
                                                <p className="text-sm font-medium text-slate-300">Dark Mode</p>
                                                <p className="text-xs text-slate-500">Toggle between light and dark themes</p>
                                            </div>
                                            <button
                                                onClick={() => setIsDarkMode(!isDarkMode)}
                                                className={`
                          w-14 h-8 rounded-full p-1 transition-colors
                          ${isDarkMode ? 'bg-primary' : 'bg-slate-700'}
                        `}
                                            >
                                                <div className={`
                          w-6 h-6 rounded-full bg-white flex items-center justify-center transition-transform
                          ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}
                        `}>
                                                    {isDarkMode ? (
                                                        <Moon className="w-4 h-4 text-slate-800" />
                                                    ) : (
                                                        <Sun className="w-4 h-4 text-yellow-500" />
                                                    )}
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Organization Tab */}
                            {activeTab === 'organization' && (
                                <div className="animate-in fade-in duration-300">
                                    <h2 className="text-xl font-semibold text-white mb-6">Organization Settings</h2>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                Organization Name
                                            </label>
                                            <input
                                                type="text"
                                                value={orgName}
                                                onChange={(e) => setOrgName(e.target.value)}
                                                className="w-full max-w-md bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                Organization ID
                                            </label>
                                            <code className="text-sm text-slate-400 bg-slate-900 px-3 py-2 rounded-lg">
                                                {organization?.id || 'N/A'}
                                            </code>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                Your Role
                                            </label>
                                            <span className="inline-flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-lg">
                                                <Shield className="w-4 h-4" />
                                                {profile?.role || 'Member'}
                                            </span>
                                        </div>

                                        <hr className="border-slate-700" />

                                        {/* Team Members Section */}
                                        <TeamSettings />
                                    </div>
                                </div>
                            )}

                            {/* Domains Tab */}
                            {activeTab === 'domains' && (
                                <div className="animate-in fade-in duration-300">
                                    <DomainManagement />
                                </div>
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && (
                                <div className="animate-in fade-in duration-300">
                                    <h2 className="text-xl font-semibold text-white mb-6">Security Settings</h2>

                                    <div className="space-y-6">
                                        <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Key className="w-8 h-8 text-slate-400" />
                                                <div>
                                                    <p className="font-medium text-white">Password</p>
                                                    <p className="text-sm text-slate-400">Last changed: Never</p>
                                                </div>
                                            </div>
                                            <button className="text-primary hover:underline text-sm">
                                                Change Password
                                            </button>
                                        </div>

                                        <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <Shield className="w-8 h-8 text-slate-400" />
                                                <div>
                                                    <p className="font-medium text-white">Two-Factor Authentication</p>
                                                    <p className="text-sm text-slate-400">Add an extra layer of security</p>
                                                </div>
                                            </div>
                                            <button className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg text-sm transition-colors">
                                                Enable 2FA
                                            </button>
                                        </div>

                                        <hr className="border-slate-700" />

                                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                                            <div className="flex items-start gap-4">
                                                <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />
                                                <div>
                                                    <h3 className="font-medium text-rose-400 mb-1">Danger Zone</h3>
                                                    <p className="text-sm text-slate-400 mb-4">
                                                        Permanently delete your account and all associated data.
                                                    </p>
                                                    <button className="flex items-center gap-2 text-rose-400 hover:text-rose-300 text-sm">
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete Account
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Billing Tab */}
                            {activeTab === 'billing' && (
                                <div className="animate-in fade-in duration-300">
                                    <h2 className="text-xl font-semibold text-white mb-6">Billing & Subscription</h2>
                                    <BillingDashboard />
                                </div>
                            )}

                            {/* API Tab */}
                            {activeTab === 'api' && (
                                <div className="animate-in fade-in duration-300">
                                    <h2 className="text-xl font-semibold text-white mb-6">API Access</h2>
                                    <APIKeyManager />
                                </div>
                            )}

                            {/* Branding Tab */}
                            {activeTab === 'branding' && (
                                <div className="animate-in fade-in duration-300">
                                    <h2 className="text-xl font-semibold text-white mb-6">Report Branding</h2>
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
                                    <h2 className="text-xl font-semibold text-white mb-6">Notification Preferences</h2>

                                    <div className="space-y-4">
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
                                                className="flex items-center justify-between bg-slate-900 rounded-xl p-4"
                                            >
                                                <div>
                                                    <p className="font-medium text-white">{pref.label}</p>
                                                    <p className="text-sm text-slate-400">{pref.desc}</p>
                                                </div>
                                                <button
                                                    onClick={() => pref.onChange(!pref.value)}
                                                    className={`
                            w-12 h-7 rounded-full p-1 transition-colors
                            ${pref.value ? 'bg-primary' : 'bg-slate-700'}
                          `}
                                                >
                                                    <div className={`
                            w-5 h-5 rounded-full bg-white transition-transform
                            ${pref.value ? 'translate-x-5' : 'translate-x-0'}
                          `} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="mt-8 flex items-center gap-4">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Saving...
                                        </>
                                    ) : saveSuccess ? (
                                        <>
                                            <Check className="w-5 h-5" />
                                            Saved!
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                                {saveSuccess && (
                                    <span className="text-sm text-emerald-400">Changes saved successfully</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};
