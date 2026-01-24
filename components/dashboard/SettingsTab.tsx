import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Users, Shield, Link2, Mail, Trash2, ShieldCheck, UserPlus, Clock, History, Globe, CreditCard, RefreshCw, Copy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useToast } from '../Toast';
import { getReportSchedule, upsertReportSchedule, getReportDeliveryLogs, ReportSchedule, ReportDeliveryLog } from '../../services/reportService';
import { getAuditLogs, AuditLogEntry } from '../../services/auditService';
import { hasPermission, Permission } from '../../services/permissionService';
import { getSSOConfig, registerSAMLIdP, SAMLConfig } from '../../services/ssoService';

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    created_at: string;
}

interface Invitation {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

export const SettingsTab: React.FC = () => {
    const { user, organization } = useAuth();
    const toast = useToast();
    const [activeSubTab, setActiveSubTab] = useState<'GENERAL' | 'TEAM' | 'BILLING' | 'LOGS' | 'MONITORING'>('GENERAL');
    const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

    // Task 7 State
    const [reportSchedule, setReportSchedule] = useState<ReportSchedule | null>(null);
    const [deliveryLogs, setDeliveryLogs] = useState<ReportDeliveryLog[]>([]);
    const [schedule, setSchedule] = useState<'daily' | 'weekly' | 'monthly' | 'never'>('weekly');
    const [reportFormat, setReportFormat] = useState<'pdf' | 'html' | 'json'>('pdf');
    const [recipients, setRecipients] = useState<string>("");
    const [alerts, setAlerts] = useState({
        scoreDrop: true,
        competitorSurge: true,
        summaryWeekly: true
    });

    // Task 8 State - Audit Logs
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    // Task 9 State - SSO
    const [ssoConfig, setSsoConfig] = useState<SAMLConfig | null>(null);
    const [ssoMetadataUrl, setSsoMetadataUrl] = useState("");
    const [isSavingSSO, setIsSavingSSO] = useState(false);

    useEffect(() => {
        if (organization?.id) {
            checkAllPermissions();
            if (activeSubTab === 'GENERAL') loadSSOConfig();
            if (activeSubTab === 'TEAM') loadTeamData();
            if (activeSubTab === 'MONITORING') loadMonitoringData();
            if (activeSubTab === 'LOGS') loadAuditLogs();
        }
    }, [organization?.id, activeSubTab]);

    const loadSSOConfig = async () => {
        if (!organization?.id) return;
        const config = await getSSOConfig(organization.id);
        if (config) {
            setSsoConfig(config);
            setSsoMetadataUrl(config.metadata_url || "");
        }
    };

    const handleSaveSSO = async () => {
        if (!organization?.id || !ssoMetadataUrl.trim()) return;
        setIsSavingSSO(true);
        try {
            const success = await registerSAMLIdP({
                organizationId: organization.id,
                metadataUrl: ssoMetadataUrl
            });
            if (success) {
                toast.success("SSO Configured", "SAML Identity Provider metadata has been registered.");
                loadSSOConfig();
            } else {
                toast.error("SSO Failed", "Failed to update SAML configuration.");
            }
        } catch (error: any) {
            toast.error("Error", error.message);
        } finally {
            setIsSavingSSO(false);
        }
    };

    const checkAllPermissions = async () => {
        const perms: Permission[] = [
            'team.view', 'team.manage', 'billing.manage', 'settings.manage', 'report.manage', 'audit.read'
        ];
        const results = await Promise.all(perms.map(p => hasPermission(p)));
        const permMap: Record<string, boolean> = {};
        perms.forEach((p, i) => permMap[p] = results[i]);
        setUserPermissions(permMap);
    };

    const loadAuditLogs = async () => {
        setAuditLoading(true);
        try {
            const logs = await getAuditLogs({ limit: 50 });
            setAuditLogs(logs);
        } catch (error) {
            console.error("Failed to load audit logs", error);
        } finally {
            setAuditLoading(false);
        }
    };

    const loadMonitoringData = async () => {
        if (!organization?.id) return;
        setLoading(true);
        try {
            const [scheduleData, logs] = await Promise.all([
                getReportSchedule(organization.id),
                getReportDeliveryLogs(organization.id)
            ]);

            if (scheduleData) {
                setReportSchedule(scheduleData);
                setSchedule(scheduleData.type === 'weekly' ? 'weekly' : scheduleData.type === 'monthly' ? 'monthly' : 'never');
                setReportFormat(scheduleData.format);
                setRecipients(scheduleData.email_recipients.join(', '));
            }
            setDeliveryLogs(logs);
        } catch (error) {
            console.error("Failed to load monitoring data", error);
        } finally {
            setLoading(false);
        }
    };

    const loadTeamData = async () => {
        setLoading(true);
        try {
            const { data: memberData } = await supabase
                .from('users')
                .select('*')
                .eq('organization_id', organization?.id);

            const { data: inviteData } = await supabase
                .from('invitations')
                .select('*')
                .eq('organization_id', organization?.id)
                .eq('status', 'pending');

            if (memberData) setMembers(memberData);
            if (inviteData) setInvites(inviteData);
        } catch (error) {
            console.error("Failed to load team data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendInvite = async () => {
        if (!inviteEmail.trim()) return;

        try {
            const { error } = await supabase.from('invitations').insert({
                organization_id: organization?.id,
                inviter_id: user?.id,
                email: inviteEmail,
                role: inviteRole,
                status: 'pending'
            });

            if (error) throw error;

            toast.success("Invitation Sent", `An invite has been dispatched to ${inviteEmail}`);
            setInviteEmail("");
            loadTeamData();
        } catch (error: any) {
            toast.error("Invite Failed", error.message);
        }
    };

    const handleSaveSchedule = async () => {
        if (!organization?.id) return;
        setLoading(true);
        try {
            // Save to scheduled_audits (existing legacy table)
            const { error: auditError } = await supabase
                .from('scheduled_audits')
                .upsert({
                    organization_id: organization.id,
                    domain_url: "primary",
                    frequency: schedule === 'never' ? 'monthly' : schedule,
                    enabled: schedule !== 'never',
                    next_run_at: new Date(Date.now() + 86400000).toISOString(),
                    notify_email: alerts.scoreDrop || alerts.summaryWeekly
                }, { onConflict: 'organization_id' });

            if (auditError) throw auditError;

            // Save to new report_schedules table
            const recipientList = recipients.split(',').map(e => e.trim()).filter(e => e.length > 0);

            await upsertReportSchedule({
                organization_id: organization.id,
                type: schedule === 'never' ? 'on_demand' : (schedule as any),
                email_recipients: recipientList.length > 0 ? recipientList : [user?.email || ""],
                is_active: schedule !== 'never',
                format: reportFormat
            });

            toast.success("Sentinel Updated", "Your automated monitoring and email reporting schedule has been synced.");
        } catch (error: any) {
            toast.error("Update Failed", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 p-1.5 bg-white/[0.02] border border-white/[0.05] rounded-3xl w-fit">
                {[
                    { id: 'GENERAL', label: 'Domain & Brand', icon: Globe, permission: 'settings.manage' },
                    { id: 'TEAM', label: 'Team & RBAC', icon: Users, permission: 'team.view' },
                    { id: 'MONITORING', label: 'Automated Sentinel', icon: ShieldCheck, permission: 'report.manage' },
                    { id: 'LOGS', label: 'Security Log', icon: History, permission: 'audit.read' },
                    { id: 'BILLING', label: 'Subscription', icon: CreditCard, permission: 'billing.manage' },
                ].filter(tab => !tab.permission || userPermissions[tab.permission]).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' : 'text-slate-500 hover:text-white hover:bg-white/[0.03]'}`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-10">
                <AnimatePresence mode="wait">
                    {activeSubTab === 'GENERAL' && (
                        <motion.div
                            key="general"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl space-y-12"
                        >
                            <div className="max-w-2xl space-y-10">
                                <div>
                                    <h3 className="text-xl font-black text-white mb-2">Organization Configuration</h3>
                                    <p className="text-slate-500 text-sm font-medium">Global settings for your AI visibility instance.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company / Organization Name</label>
                                        <input
                                            type="text"
                                            defaultValue={organization?.name || ""}
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white font-bold outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Primary Audit Domain</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                readOnly
                                                defaultValue="audit-engine.cognition.ai"
                                                className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-sm text-slate-400 font-bold outline-none cursor-not-allowed pr-12"
                                            />
                                            <Globe className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                                        </div>
                                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2 ml-1">To change your primary domain, please contact enterprise support.</p>
                                    </div>
                                </div>
                                <button className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">Update Identity</button>

                                <div className="pt-10 border-t border-white/5 space-y-10">
                                    <div>
                                        <h3 className="text-xl font-black text-white mb-2">Enterprise SSO (SAML 2.0)</h3>
                                        <p className="text-slate-500 text-sm font-medium">Standardize authentication across your enterprise via Okta, Azure AD, or Google Workspace.</p>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <div className="p-6 rounded-3xl bg-black/20 border border-white/5 space-y-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Service Provider (SP) Metadata</label>
                                                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-black uppercase">REQUIRED FOR IDP</span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Entity ID / Audience</p>
                                                        <code className="text-[10px] text-white bg-black/40 px-3 py-1.5 rounded flex items-center justify-between group">
                                                            {ssoConfig?.entity_id || `https://auth.cognition.ai/sso/${organization?.id}`}
                                                            <Copy className="w-3 h-3 text-slate-700 group-hover:text-primary transition-colors cursor-pointer" />
                                                        </code>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Assertion Consumer Service (ACS) URL</p>
                                                        <code className="text-[10px] text-white bg-black/40 px-3 py-1.5 rounded flex items-center justify-between group">
                                                            https://auth.cognition.ai/sso/v1/acs
                                                            <Copy className="w-3 h-3 text-slate-700 group-hover:text-primary transition-colors cursor-pointer" />
                                                        </code>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identity Provider (IdP) Metadata URL</label>
                                                <div className="flex gap-4">
                                                    <input
                                                        type="text"
                                                        value={ssoMetadataUrl}
                                                        onChange={(e) => setSsoMetadataUrl(e.target.value)}
                                                        placeholder="https://okta.com/app/exk.../sso/saml/metadata"
                                                        className="flex-1 bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white font-bold outline-none focus:border-primary/50 transition-all"
                                                    />
                                                    <button
                                                        onClick={handleSaveSSO}
                                                        disabled={isSavingSSO}
                                                        className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center gap-2"
                                                    >
                                                        {isSavingSSO ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                                                        Register IdP
                                                    </button>
                                                </div>
                                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2 ml-1">Enterprise users will be redirected to your IdP based on their email domain.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeSubTab === 'TEAM' && (
                        <motion.div
                            key="team"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-8"
                        >
                            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 flex flex-col lg:flex-row items-center gap-6 shadow-2xl">
                                <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-4">
                                    <div className="flex-1 w-full relative group">
                                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="email"
                                            placeholder="colleague@company.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-2xl px-14 py-4 text-sm text-white font-bold outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as any)}
                                        className="w-full sm:w-48 bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white font-bold outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="member">Network Member</option>
                                        <option value="admin">Admin Partner</option>
                                        <option value="viewer">View-Only Client</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleSendInvite}
                                    className="w-full lg:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 shrink-0"
                                >
                                    <UserPlus className="w-4 h-4" /> Send Invitation
                                </button>
                            </div>

                            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                <div className="bg-white/[0.02] border-b border-white/[0.05] px-10 py-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-primary" />
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Active Team Nodes</h3>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{members.length} Members</span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-black/10">
                                                <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identity</th>
                                                <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Auth Role</th>
                                                <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Join Date</th>
                                                <th className="px-10 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.03]">
                                            {members.map((member) => (
                                                <tr key={member.id} className="group hover:bg-white/[0.01] transition-colors">
                                                    <td className="px-10 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs uppercase shadow-inner">
                                                                {member.full_name?.charAt(0) || member.email.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-white mb-0.5">{member.full_name || 'Incognito Entity'}</p>
                                                                <p className="text-[10px] text-slate-500 font-bold font-mono tracking-tight">{member.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6">
                                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${member.role === 'owner' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10' :
                                                            member.role === 'admin' ? 'bg-primary/10 text-primary border border-primary/10' :
                                                                'bg-white/[0.05] text-slate-400 border border-white/[0.05]'
                                                            }`}>
                                                            {member.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-6">
                                                        <span className="text-xs font-bold text-slate-500">
                                                            {new Date(member.created_at).toLocaleDateString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        {member.role !== 'owner' && (
                                                            <button className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all opacity-0 group-hover:opacity-100">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {invites.map((invite) => (
                                                <tr key={invite.id} className="bg-primary/[0.01] animate-pulse">
                                                    <td className="px-10 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-slate-600 font-black text-xs uppercase shadow-inner">?</div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-400 mb-0.5">Awaiting Acceptance</p>
                                                                <p className="text-[10px] text-slate-600 font-bold font-mono tracking-tight">{invite.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-10 py-6">
                                                        <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary/40 border border-primary/10">
                                                            {invite.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-6">
                                                        <span className="text-xs font-bold text-slate-700 italic flex items-center gap-2">
                                                            <Clock className="w-3.5 h-3.5" /> Pending Sync
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors">Resend</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeSubTab === 'MONITORING' && (
                        <motion.div
                            key="monitoring"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl space-y-12"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-xl font-black text-white mb-2 underline decoration-primary decoration-4 underline-offset-8">Automated Visibility Sentinel</h3>
                                        <p className="text-slate-500 text-sm font-medium mt-4">Configure the interval for neural re-audits and trend tracking.</p>
                                    </div>
                                    <div className="space-y-6">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Audit Schedule Frequency</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['daily', 'weekly', 'monthly', 'never'].map((freq) => (
                                                <button
                                                    key={freq}
                                                    onClick={() => setSchedule(freq as any)}
                                                    className={`px-6 py-4 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${schedule === freq ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/20'}`}
                                                >
                                                    {freq}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pt-8 border-t border-white/5 space-y-8">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Reporting Intelligence</h4>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Recipient Distribution List</label>
                                                <input
                                                    type="text"
                                                    value={recipients}
                                                    onChange={(e) => setRecipients(e.target.value)}
                                                    placeholder="stakeholder@company.com, analytics@company.com"
                                                    className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white font-bold outline-none focus:border-primary/50 transition-all"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Report Format</label>
                                                <div className="flex gap-2">
                                                    {['pdf', 'html', 'json'].map((fmt) => (
                                                        <button
                                                            key={fmt}
                                                            onClick={() => setReportFormat(fmt as any)}
                                                            className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${reportFormat === fmt ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-black/20 border-white/5 text-slate-500'}`}
                                                            style={{
                                                                backgroundColor: reportFormat === fmt ? 'rgba(99, 102, 241, 0.1)' : '',
                                                                borderColor: reportFormat === fmt ? 'rgba(99, 102, 241, 0.4)' : '',
                                                                color: reportFormat === fmt ? '#6366f1' : ''
                                                            }}
                                                        >
                                                            {fmt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {[
                                                { id: 'scoreDrop', label: 'Score Volatility Alert', desc: 'Notify if visibility drops > 5% in 24h.' },
                                                { id: 'competitorSurge', label: 'Competitor Surge Detection', desc: 'Alert if a rival gains > 10% citation share.' },
                                                { id: 'summaryWeekly', label: 'Weekly Performance Digest', desc: 'Executive summary delivered every Monday.' }
                                            ].map((item) => (
                                                <div key={item.id} className="flex items-start justify-between p-6 rounded-3xl bg-black/20 border border-white/5 group hover:border-white/10 transition-all">
                                                    <div>
                                                        <p className="text-sm font-black text-white mb-1">{item.label}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{item.desc}</p>
                                                    </div>
                                                    <div
                                                        onClick={() => setAlerts({ ...alerts, [item.id]: !alerts[item.id as keyof typeof alerts] })}
                                                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${alerts[item.id as keyof typeof alerts] ? 'bg-primary' : 'bg-slate-800'}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${alerts[item.id as keyof typeof alerts] ? 'left-7' : 'left-1'}`} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-8 lg:border-l lg:border-white/5 lg:pl-16">
                                    <div>
                                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Sentinel Activity Feed</h3>
                                        <div className="space-y-6">
                                            {deliveryLogs.length > 0 ? deliveryLogs.map((log, i) => (
                                                <div key={log.id} className="relative pl-8 border-l border-white/5 pb-6 last:pb-0">
                                                    <div className={`absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] ${log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">{new Date(log.sent_at).toLocaleString()}</p>
                                                    <p className="text-xs font-black text-white mb-1">
                                                        {log.status === 'success' ? 'Report Delivered' : 'Delivery Failed'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                                        {log.status === 'success' ? `Successfully sent to ${log.recipient_count} recipients.` : log.error_message}
                                                    </p>
                                                </div>
                                            )) : (
                                                <div className="text-center py-10 opacity-40">
                                                    <Clock className="w-10 h-10 mx-auto mb-4 text-slate-700" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No recent activity</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSaveSchedule}
                                        disabled={loading}
                                        className="w-full bg-primary hover:bg-primary/90 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20 transition-all flex items-center justify-center gap-4"
                                    >
                                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                        {loading ? 'Syncing...' : 'Lock Scheduled Frequency'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeSubTab === 'LOGS' && (
                        <motion.div
                            key="logs"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col min-h-[600px]"
                        >
                            <div className="bg-white/[0.02] border-b border-white/[0.05] px-10 py-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <History className="w-5 h-5 text-primary" />
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Neural Activity Ledger</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={loadAuditLogs}
                                        className="p-2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${auditLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors">Export CSV</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-black/20 border-b border-white/5 sticky top-0 z-10">
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Actor</th>
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Target</th>
                                            <th className="px-10 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Context</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {auditLogs.length > 0 ? auditLogs.map((log) => (
                                            <tr key={log.id} className="group hover:bg-white/[0.01] transition-colors">
                                                <td className="px-10 py-6">
                                                    <div className="text-[11px] font-bold text-slate-400">
                                                        {new Date(log.occurred_at).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-[10px] text-slate-600 font-medium">
                                                        {new Date(log.occurred_at).toLocaleTimeString()}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-white/5">
                                                            {log.actor.name?.charAt(0) || 'A'}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black text-white">{log.actor.name || 'Anonymous'}</div>
                                                            <div className="text-[9px] text-slate-600 font-bold uppercase">{log.actor.type}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${log.action.includes('delete') || log.action.includes('remove') || log.action.includes('untracked') ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                        log.action.includes('create') || log.action.includes('add') || log.action.includes('tracked') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            'bg-primary/10 text-primary border-primary/20'
                                                        }`}>
                                                        {log.action.replace('.', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <div className="text-xs font-bold text-slate-300">{log.target.display_name || log.target.id}</div>
                                                    <div className="text-[9px] text-slate-600 font-bold uppercase">{log.target.type}</div>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {log.metadata.ip_address && (
                                                            <span className="text-[9px] font-mono text-slate-700 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                                                                {log.metadata.ip_address}
                                                            </span>
                                                        )}
                                                        <button
                                                            className="p-2 text-slate-600 hover:text-primary transition-colors"
                                                            title="View raw details"
                                                        >
                                                            <Shield className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="py-20 text-center">
                                                    <Shield className="w-16 h-16 text-slate-800 mb-6 mx-auto" />
                                                    <h4 className="text-white font-black text-lg mb-2">Immutable Security Logging</h4>
                                                    <p className="text-slate-500 max-w-sm font-medium text-sm leading-relaxed mx-auto">
                                                        No security events have been recorded yet. All administrative actions will appear here for compliance auditing.
                                                    </p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
