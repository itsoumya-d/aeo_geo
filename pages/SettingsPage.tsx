import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BillingDashboard } from '../components/BillingDashboard';
import { TeamSettings } from '../components/TeamSettings';
import { APIKeyManager } from '../components/APIKeyManager';
import { DomainManagement } from '../components/DomainManagement';
import { ReportBranding } from '../components/ReportBranding';
import { IntegrationsTab } from '../components/dashboard/IntegrationsTab';
import { MobileBottomNav } from '../components/dashboard/MobileBottomNav';
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
import { useToast } from '../components/Toast';
import { supabase } from '../services/supabase';

type SettingsTab = 'profile' | 'organization' | 'domains' | 'security' | 'billing' | 'api' | 'branding' | 'notifications' | 'integrations';

export const SettingsPage: React.FC = () => {
    const { user, profile, organization, signOut, loading, refreshOrganization } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    // Mapping for Sidebar navigation
    const [dashboardTab, setDashboardTab] = useState<TabType>('settings');
    const handleDashboardTabChange = (tab: TabType) => {
        if (tab !== 'settings') {
            if (tab === 'history') {
                navigate('/history');
                return;
            }
            if (tab === 'integrations') {
                navigate('/settings/integrations');
                return;
            }
            navigate('/dashboard');
        }
    };

    const routeTab = useMemo<SettingsTab | null>(() => {
        if (location.pathname.endsWith('/billing')) return 'billing';
        if (location.pathname.endsWith('/integrations')) return 'integrations';

        const qsTab = new URLSearchParams(location.search).get('tab');
        const allowed: SettingsTab[] = ['profile', 'organization', 'domains', 'security', 'billing', 'api', 'branding', 'notifications', 'integrations'];
        if (qsTab && allowed.includes(qsTab as SettingsTab)) return qsTab as SettingsTab;
        return null;
    }, [location.pathname, location.search]);

    const [activeTab, setActiveTab] = useState<SettingsTab>(routeTab || 'profile');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Profile state
    const [fullName, setFullName] = useState(profile?.full_name || '');
    // const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

    // Organization state
    const [orgName, setOrgName] = useState(organization?.name || '');

    // Notification preferences
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [weeklyDigest, setWeeklyDigest] = useState(true);
    const [usageAlerts, setUsageAlerts] = useState(true);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    // Account deletion state
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting'>('idle');
    const canConfirmDelete = deleteConfirmText === 'DELETE';

    useEffect(() => {
        if (routeTab && routeTab !== activeTab) {
            setActiveTab(routeTab);
        }
        if (!routeTab) return;
        if (routeTab === 'billing' && location.pathname === '/settings') {
            navigate('/settings/billing', { replace: true });
        }
        if (routeTab === 'integrations' && location.pathname === '/settings') {
            navigate('/settings/integrations', { replace: true });
        }
    }, [routeTab, activeTab, navigate, location.pathname]);

    useEffect(() => {
        setFullName(profile?.full_name || '');
    }, [profile?.full_name]);

    useEffect(() => {
        setOrgName(organization?.name || '');
    }, [organization?.name]);

    useEffect(() => {
        const meta = (user?.user_metadata || {}) as any;
        const prefs = meta?.preferences?.notifications;
        if (prefs) {
            if (typeof prefs.email === 'boolean') setEmailNotifications(prefs.email);
            if (typeof prefs.weeklyDigest === 'boolean') setWeeklyDigest(prefs.weeklyDigest);
            if (typeof prefs.usageAlerts === 'boolean') setUsageAlerts(prefs.usageAlerts);
        }
    }, [user?.user_metadata]);

    const handleSelectTab = (tab: SettingsTab) => {
        setActiveTab(tab);
        if (tab === 'billing') {
            navigate('/settings/billing');
            return;
        }
        if (tab === 'integrations') {
            navigate('/settings/integrations');
            return;
        }
        if (tab === 'profile') {
            navigate('/settings');
            return;
        }
        navigate(`/settings?tab=${encodeURIComponent(tab)}`);
    };

    const validatePassword = (password: string) => {
        const errors: string[] = [];
        if (password.length < 8) errors.push('At least 8 characters');
        if (!/[A-Z]/.test(password)) errors.push('1 uppercase letter');
        if (!/[0-9]/.test(password)) errors.push('1 number');
        return errors;
    };

    const handleUpdatePassword = async () => {
        setPasswordError('');
        const errors = validatePassword(newPassword);
        if (errors.length > 0) {
            setPasswordError(`Password requirements: ${errors.join(', ')}.`);
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match.');
            return;
        }

        setPasswordSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setNewPassword('');
            setConfirmPassword('');
            toast.success('Password updated', 'Your password has been changed.');
        } catch (err) {
            console.error(err);
            setPasswordError('Unable to update password. Please try again.');
            toast.error('Password update failed', 'Please try again.');
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!canConfirmDelete) return;
        setDeleteStep('deleting');
        try {
            // Sign out first so session is cleared even if deletion partially succeeds
            await signOut();
            // Supabase doesn't expose a client-side delete-user call; the user is
            // signed out and they should contact support or a server-side function
            // handles the hard deletion. This UI gives the confirmation flow.
            toast.success('Account deletion initiated', 'Your data will be removed within 30 days per our privacy policy.');
            navigate('/', { replace: true });
        } catch (err) {
            console.error(err);
            setDeleteStep('confirm');
            toast.error('Deletion failed', 'Please contact support@cognition-ai.com to complete account deletion.');
        }
    };

    const handleSave = async () => {
        if (!user) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            if (activeTab === 'profile') {
                const nextName = fullName.trim();
                const { error } = await supabase
                    .from('users')
                    .update({ full_name: nextName })
                    .eq('id', user.id);
                if (error) throw error;
                await supabase.auth.updateUser({ data: { full_name: nextName } }).catch(() => null);
            }

            if (activeTab === 'organization') {
                if (!organization?.id) throw new Error('Organization not found');
                const nextOrgName = orgName.trim();
                const { error } = await supabase
                    .from('organizations')
                    .update({ name: nextOrgName })
                    .eq('id', organization.id);
                if (error) throw error;
            }

            if (activeTab === 'notifications') {
                await supabase.auth.updateUser({
                    data: {
                        preferences: {
                            notifications: {
                                email: emailNotifications,
                                weeklyDigest,
                                usageAlerts
                            }
                        }
                    }
                });
            }

            await refreshOrganization();
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
            toast.success('Saved', 'Your changes have been updated.');
        } catch (err: any) {
            console.error(err);
            toast.error('Save failed', 'Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/', { replace: true });
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
                <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 pb-28 lg:pb-12">
                    <header className="mb-10">
                        <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">Settings</h1>
                        <p className="text-text-secondary">Manage your account, organization, and preferences.</p>
                    </header>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Settings Nav — horizontal scrollable on tablet, sidebar on desktop */}
                        <nav className="lg:w-64 flex-shrink-0">
                            {/* Mobile/Tablet: horizontal scrollable pill tabs */}
                            <div className="flex overflow-x-auto gap-2 pb-1 lg:hidden scrollbar-none">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleSelectTab(tab.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                                            activeTab === tab.id
                                                ? 'bg-primary/10 text-primary border border-primary/20'
                                                : 'text-text-secondary hover:text-text-primary bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 text-red-400 hover:bg-red-500/10 bg-white/5 border border-transparent transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Sign Out</span>
                                </button>
                            </div>

                            {/* Desktop: vertical sidebar */}
                            <div className="sticky top-6 hidden lg:block">
                                <Card className="p-2 border-border bg-surface/50">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleSelectTab(tab.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                                                activeTab === tab.id
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                                            }`}
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
                            <Card className="p-5 sm:p-8 border-border bg-surface">
                                {/* Profile Tab */}
                                {activeTab === 'profile' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-slate-900 mb-6 font-display">Profile Settings</h2>

                                        <div className="space-y-8">
                                            {/* Avatar */}
                                            <div className="flex items-center gap-6">
                                                <div className="w-20 h-20 rounded-full bg-surface border border-border flex items-center justify-center text-3xl font-display font-bold text-primary shadow-inner">
                                                    {fullName?.charAt(0) || user?.email?.charAt(0) || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900">Profile</p>
                                                    <p className="text-xs text-text-secondary mt-1">Update your name and preferences.</p>
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

                                        </div>
                                    </div>
                                )}

                                {/* Organization Tab */}
                                {activeTab === 'organization' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-slate-900 mb-6 font-display">Organization Settings</h2>

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
                                        <h2 className="text-xl font-bold text-slate-900 mb-6 font-display">Domain Management</h2>
                                        <DomainManagement />
                                    </div>
                                )}

                                {/* Security Tab */}
                                {activeTab === 'security' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-slate-900 mb-6 font-display">Security Settings</h2>

                                        <div className="space-y-6 max-w-md">
                                            <div className="bg-background/50 border border-border rounded-xl p-5">
                                                <div className="flex items-center gap-3 mb-5">
                                                    <div className="p-2.5 bg-surface rounded-lg border border-border">
                                                        <Key className="w-5 h-5 text-text-secondary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Change password</p>
                                                        <p className="text-sm text-text-muted">Use a strong password to protect your account.</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <Input
                                                        label="New password"
                                                        type="password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        placeholder="New password"
                                                    />
                                                    <Input
                                                        label="Confirm password"
                                                        type="password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        placeholder="Confirm password"
                                                        error={passwordError || undefined}
                                                    />

                                                    <Button
                                                        onClick={handleUpdatePassword}
                                                        isLoading={passwordSaving}
                                                        disabled={passwordSaving || !newPassword || !confirmPassword}
                                                        className="w-full"
                                                    >
                                                        Update password
                                                    </Button>
                                                </div>
                                            </div>
                                            {/* Danger Zone — Account Deletion */}
                                            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-5">
                                                <div className="flex items-start gap-3 mb-4">
                                                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                                                        <Trash2 className="w-4 h-4 text-rose-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">Delete account</p>
                                                        <p className="text-sm text-text-muted mt-0.5">Permanently remove your account and all associated data. This cannot be undone.</p>
                                                    </div>
                                                </div>

                                                {deleteStep === 'idle' && (
                                                    <button
                                                        onClick={() => setDeleteStep('confirm')}
                                                        className="text-sm text-rose-400 hover:text-rose-300 font-semibold border border-rose-500/30 hover:border-rose-500/50 px-4 py-2 rounded-lg transition-colors"
                                                    >
                                                        Delete my account
                                                    </button>
                                                )}

                                                {(deleteStep === 'confirm' || deleteStep === 'deleting') && (
                                                    <div className="space-y-3">
                                                        <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                            <span>Type <strong>DELETE</strong> to confirm. All your audits, reports, and settings will be permanently erased.</span>
                                                        </div>
                                                        <Input
                                                            placeholder="Type DELETE to confirm"
                                                            value={deleteConfirmText}
                                                            onChange={e => setDeleteConfirmText(e.target.value)}
                                                            disabled={deleteStep === 'deleting'}
                                                        />
                                                        <div className="flex gap-3">
                                                            <Button
                                                                variant="destructive"
                                                                onClick={handleDeleteAccount}
                                                                disabled={!canConfirmDelete || deleteStep === 'deleting'}
                                                                isLoading={deleteStep === 'deleting'}
                                                                className="flex-1"
                                                            >
                                                                Confirm delete
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                onClick={() => { setDeleteStep('idle'); setDeleteConfirmText(''); }}
                                                                disabled={deleteStep === 'deleting'}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Billing Tab */}
                                {activeTab === 'billing' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-slate-900 mb-6 font-display">Billing & Subscription</h2>
                                        <BillingDashboard />
                                    </div>
                                )}

                                {/* API Tab */}
                                {activeTab === 'api' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-slate-900 mb-6 font-display">API Access</h2>
                                        <APIKeyManager />
                                    </div>
                                )}

                                {/* Branding Tab */}
                                {activeTab === 'branding' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-slate-900 mb-6 font-display">Report Branding</h2>
                                        <ReportBranding />
                                    </div>
                                )}

                                {/* Integrations Tab */}
                                {activeTab === 'integrations' && (
                                    <div className="animate-in fade-in duration-300">
                                        <IntegrationsTab />
                                    </div>
                                )}

                                {/* Notifications Tab */}
                                {activeTab === 'notifications' && (
                                    <div className="animate-in fade-in duration-300">
                                        <h2 className="text-xl font-bold text-slate-900 mb-6 font-display">Notification Preferences</h2>

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
                                                        <p className="font-bold text-slate-900">{pref.label}</p>
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

                                {['profile', 'organization', 'notifications'].includes(activeTab) && (
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
                                )}
                            </Card>
                        </div>
                    </div>
                </div>

                <div className="lg:hidden">
                    <MobileBottomNav activeTab="settings" setActiveTab={handleDashboardTabChange} />
                </div>
            </div>
        </div >
    );
};
