import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, UserProfile } from '../services/supabase';
import { useToast } from './Toast';
import { getTechnicalErrorMessage, toUserMessage } from '../utils/errors';
import {
    Users, Mail, Shield, Trash2, Send, Loader2, Crown,
    UserPlus, Check, X, Clock, AlertTriangle, FileText, Activity, History
} from 'lucide-react';
import { SSOConfig } from './SSOConfig';

interface TeamMember extends UserProfile {
    isCurrentUser: boolean;
}

interface Invitation {
    id: string;
    organization_id: string;
    email: string;
    role: 'admin' | 'member' | 'viewer';
    expires_at: string;
    created_at: string;
    invited_by: string;
}

interface ActivityLog {
    id: string;
    action: string;
    details: any;
    created_at: string;
    user_email?: string;
}

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
    const styles = {
        owner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        member: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        viewer: 'bg-slate-700 text-text-secondary border-slate-600',
    };
    const icons = {
        owner: <Crown className="w-3 h-3" />,
        admin: <Shield className="w-3 h-3" />,
        member: <Users className="w-3 h-3" />,
        viewer: <FileText className="w-3 h-3 text-text-muted" />,
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${styles[role as keyof typeof styles] || styles.viewer}`}>
            {icons[role as keyof typeof icons]}
            {role}
        </span>
    );
};

export const TeamSettings: React.FC = () => {
    const { user, profile, organization } = useAuth();
    const toast = useToast();

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'members' | 'activity' | 'security'>('members');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
    const [sending, setSending] = useState(false);

    const isOwnerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin';
    const isOwner = profile?.role === 'owner';
    const isTeamEnabled = organization?.plan === 'agency' || organization?.plan === 'enterprise';

    useEffect(() => {
        if (organization?.id) {
            loadTeamData();
        }
    }, [organization?.id]);

    const loadTeamData = async () => {
        if (!organization?.id) return;
        setLoading(true);

        try {
            // Load team members
            const { data: membersData, error: membersError } = await supabase
                .from('users')
                .select('*')
                .eq('organization_id', organization.id)
                .order('role', { ascending: true });

            if (membersError) throw membersError;

            const formattedMembers: TeamMember[] = (membersData || []).map(m => ({
                ...m,
                isCurrentUser: m.id === user?.id
            }));
            setMembers(formattedMembers);

            // Load pending invitations
            const { data: invitesData, error: invitesError } = await supabase
                .from('invitations')
                .select('*')
                .eq('organization_id', organization.id)
                .is('accepted_at', null)
                .gt('expires_at', new Date().toISOString());

            if (invitesError) throw invitesError;
            setInvitations(invitesData || []);

            // Load activity logs
            const { data: logsData, error: logsError } = await supabase
                .from('activity_logs')
                .select('*, users(email)')
                .eq('organization_id', organization.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!logsError) {
                setActivityLogs(logsData.map(log => ({
                    ...log,
                    user_email: log.users?.email
                })));
            }

        } catch (error: any) {
            console.error('Failed to load team data:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !organization?.id) return;

        setSending(true);
        try {
            // Duplicate check — already a member?
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', inviteEmail.toLowerCase())
                .eq('organization_id', organization.id)
                .maybeSingle();

            if (existingUser) {
                toast.warning('Already a member', 'This email is already part of your team.');
                return;
            }

            // Duplicate check — pending invite?
            const { data: existingInvite } = await supabase
                .from('invitations')
                .select('id')
                .eq('email', inviteEmail.toLowerCase())
                .eq('organization_id', organization.id)
                .is('accepted_at', null)
                .maybeSingle();

            if (existingInvite) {
                toast.warning('Invite pending', 'An invitation has already been sent to this email.');
                return;
            }

            // Send invitation via edge function (stores + emails invite link)
            const { error: fnError } = await supabase.functions.invoke('send-invitation', {
                body: {
                    email: inviteEmail.toLowerCase().trim(),
                    role: inviteRole,
                    organization_id: organization.id,
                    organization_name: organization.name,
                    invited_by_name: profile?.full_name || user?.email || 'A team member',
                },
            });

            if (fnError) throw fnError;

            toast.success('Invitation sent', `An invite email was sent to ${inviteEmail} as ${inviteRole}.`);
            setInviteEmail('');
            loadTeamData();

        } catch (error: any) {
            console.error('Failed to send invite:', getTechnicalErrorMessage(error));
            const userMsg = toUserMessage(error);
            toast.error(userMsg.title, userMsg.message);
        } finally {
            setSending(false);
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        try {
            const { error } = await supabase
                .from('invitations')
                .delete()
                .eq('id', inviteId);

            if (error) throw error;
            toast.success('Invitation cancelled');
            loadTeamData();
        } catch (error: any) {
            console.error('Cancel invite failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        }
    };

    const handleRemoveMember = async (memberId: string, memberEmail: string) => {
        if (!confirm(`Remove ${memberEmail} from your team?`)) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({ organization_id: null, role: 'member' })
                .eq('id', memberId);

            if (error) throw error;
            toast.success('Member removed', `${memberEmail} has been removed from the team.`);
            loadTeamData();
        } catch (error: any) {
            console.error('Remove member failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        }
    };

    const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('id', memberId);

            if (error) throw error;
            toast.success('Role updated');
            loadTeamData();
        } catch (error: any) {
            console.error('Change role failed:', getTechnicalErrorMessage(error));
            const user = toUserMessage(error);
            toast.error(user.title, user.message);
        }
    };

    const handleExportCSV = () => {
        if (!activityLogs.length) return;

        const headers = ['User', 'Action', 'Target', 'Date'];
        const rows = activityLogs.map(log => [
            log.user_email || 'System',
            log.action,
            log.details?.target || '-',
            new Date(log.created_at).toISOString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-3 rounded-xl">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary">Team Members</h3>
                        <p className="text-sm text-text-muted">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            <div className="flex border-b border-border">
                <button
                    onClick={() => setActiveTab('members')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}
                >
                    Members
                </button>
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}
                >
                    Activity Log
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'security' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}`}
                >
                    <Shield className="w-3.5 h-3.5" />
                    Security
                </button>
            </div>

            {activeTab === 'members' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {isOwnerOrAdmin && !isTeamEnabled && (
                        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-purple-500/20 p-3 rounded-xl">
                                    <Users className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-text-primary text-lg">Unlock Team Management</h4>
                                    <p className="text-sm text-text-muted">Upgrade to the Agency plan to invite members and manage roles.</p>
                                </div>
                            </div>
                            <a
                                href="/settings/billing"
                                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap"
                            >
                                Upgrade Now
                            </a>
                        </div>
                    )}

                    {isOwnerOrAdmin && isTeamEnabled && (
                        <form onSubmit={handleSendInvite} className="bg-surface rounded-xl p-4 border border-border">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="colleague@company.com"
                                        className="w-full bg-background border border-border text-text-primary rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none placeholder:text-text-muted"
                                        required
                                    />
                                </div>
                                <div className="relative group">
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as any)}
                                        className="bg-background border border-border text-text-primary rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                                        title={
                                            inviteRole === 'admin'
                                                ? 'Admin: Can manage members, billing, and all settings'
                                                : inviteRole === 'viewer'
                                                ? 'Viewer: Read-only access to reports and audits'
                                                : 'Member: Can run audits and view reports'
                                        }
                                    >
                                        <option value="member">Member</option>
                                        <option value="admin">Admin</option>
                                        <option value="viewer">Viewer (Read-only)</option>
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    disabled={sending || !inviteEmail.trim()}
                                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Invite
                                </button>
                            </div>
                        </form>
                    )}

                    {invitations.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Pending Invitations ({invitations.length})
                            </h4>
                            <div className="space-y-2">
                                {invitations.map(invite => (
                                    <div key={invite.id} className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-5 h-5 text-amber-400" />
                                            <div className="text-left">
                                                <p className="text-sm text-text-primary">{invite.email}</p>
                                                <p className="text-xs text-slate-500">
                                                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <RoleBadge role={invite.role} />
                                        </div>
                                        {isOwnerOrAdmin && (
                                            <button
                                                onClick={() => handleCancelInvite(invite.id)}
                                                className="text-text-muted hover:text-rose-400 transition-colors p-2"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {members.map(member => (
                            <div
                                key={member.id}
                                className={`flex items-center justify-between rounded-xl px-4 py-4 border transition-colors ${member.isCurrentUser
                                    ? 'bg-primary/5 border-primary/20'
                                    : 'bg-surfaceHighlight border-border hover:border-border'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-surfaceHighlight flex items-center justify-center text-text-primary font-bold">
                                        {(member.full_name || member.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-text-primary">
                                                {member.full_name || member.email}
                                                {member.isCurrentUser && <span className="text-slate-500 text-sm ml-1">(You)</span>}
                                            </p>
                                            <RoleBadge role={member.role} />
                                        </div>
                                        <p className="text-sm text-text-muted">{member.email}</p>
                                    </div>
                                </div>

                                {isOwner && !member.isCurrentUser && member.role !== 'owner' && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={member.role}
                                            onChange={(e) => handleChangeRole(member.id, e.target.value as any)}
                                            className="bg-background border border-border text-text-primary rounded-lg px-3 py-1.5 text-sm outline-none"
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemoveMember(member.id, member.email)}
                                            className="text-text-muted hover:text-rose-400 transition-colors p-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {!isOwnerOrAdmin && (
                        <div className="bg-surfaceHighlight border border-border rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                            <p className="text-sm text-text-muted">
                                Only team owners and admins can invite or manage team members.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-end">
                        <button
                            onClick={handleExportCSV}
                            className="text-xs font-bold uppercase text-text-muted hover:text-text-primary flex items-center gap-2 transition-colors border border-border hover:border-slate-500 rounded-lg px-3 py-2"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Export Audit Log
                        </button>
                    </div>
                    <div className="bg-surfaceHighlight border border-border rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surfaceHighlight text-text-muted">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">User</th>
                                    <th className="px-6 py-3 font-semibold">Action</th>
                                    <th className="px-6 py-3 font-semibold">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {activityLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-surfaceHighlight/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-text-primary font-medium">{log.user_email || 'System'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-text-secondary">
                                                <Activity className="w-3.5 h-3.5 text-primary" />
                                                <span>{log.action.replace(/_/g, ' ')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {activityLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-500 italic">
                                            No activity logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'security' && <SSOConfig />}
        </div>
    );
};
