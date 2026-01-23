import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, UserProfile } from '../services/supabase';
import { useToast } from './Toast';
import {
    Users, Mail, Shield, Trash2, Send, Loader2, Crown,
    UserPlus, Check, X, Clock, AlertTriangle, FileText, Activity, History
} from 'lucide-react';

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
        viewer: 'bg-slate-700 text-slate-300 border-slate-600',
    };
    const icons = {
        owner: <Crown className="w-3 h-3" />,
        admin: <Shield className="w-3 h-3" />,
        member: <Users className="w-3 h-3" />,
        viewer: <FileText className="w-3 h-3 text-slate-400" />,
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${styles[role as keyof typeof styles] || styles.viewer}`}>
            {icons[role as keyof typeof icons]}
            {role}
        </span>
    );
};

export const TeamSettings: React.FC = () => {
    const { user, profile, organization, refreshOrganization } = useAuth();
    const toast = useToast();

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'members' | 'activity'>('members');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
    const [sending, setSending] = useState(false);

    const isOwnerOrAdmin = profile?.role === 'owner' || profile?.role === 'admin';
    const isOwner = profile?.role === 'owner';

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
            console.error('Failed to load team data:', error);
            toast.error('Failed to load team', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !organization?.id) return;

        setSending(true);
        try {
            // Check if user already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', inviteEmail.toLowerCase())
                .eq('organization_id', organization.id)
                .single();

            if (existingUser) {
                toast.warning('Already a member', 'This email is already part of your team.');
                setSending(false);
                return;
            }

            // Check for existing pending invite
            const { data: existingInvite } = await supabase
                .from('invitations')
                .select('id')
                .eq('email', inviteEmail.toLowerCase())
                .eq('organization_id', organization.id)
                .is('accepted_at', null)
                .single();

            if (existingInvite) {
                toast.warning('Invite pending', 'An invitation has already been sent to this email.');
                setSending(false);
                return;
            }

            // Create invitation
            const { error } = await supabase
                .from('invitations')
                .insert({
                    organization_id: organization.id,
                    email: inviteEmail.toLowerCase(),
                    role: inviteRole,
                    invited_by: user?.id,
                });

            if (error) throw error;

            toast.success('Invitation sent', `Invited ${inviteEmail} as ${inviteRole}`);
            setInviteEmail('');
            loadTeamData();

        } catch (error: any) {
            console.error('Failed to send invite:', error);
            toast.error('Invitation failed', error.message);
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
            toast.error('Failed to cancel', error.message);
        }
    };

    const handleRemoveMember = async (memberId: string, memberEmail: string) => {
        if (!confirm(`Remove ${memberEmail} from your team?`)) return;

        try {
            // Set organization_id to null to remove from team
            const { error } = await supabase
                .from('users')
                .update({ organization_id: null, role: 'member' })
                .eq('id', memberId);

            if (error) throw error;

            toast.success('Member removed', `${memberEmail} has been removed from the team.`);
            loadTeamData();
        } catch (error: any) {
            toast.error('Failed to remove', error.message);
        }
    };

    const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member') => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('id', memberId);

            if (error) throw error;

            toast.success('Role updated');
            loadTeamData();
        } catch (error: any) {
            toast.error('Failed to update role', error.message);
        }
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
            {/* Team Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-3 rounded-xl">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Team Members</h3>
                        <p className="text-sm text-slate-400">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            {/* Tab Swicher */}
            <div className="flex border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('members')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    Members
                </button>
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    Activity Log
                </button>
            </div>

            {activeTab === 'members' ? (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Invite Form */}
                    {isOwnerOrAdmin && (
                        <form onSubmit={handleSendInvite} className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="colleague@company.com"
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-500"
                                        required
                                    />
                                </div>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as any)}
                                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                    <option value="viewer">Viewer (Read-only)</option>
                                </select>
                                <button
                                    type="submit"
                                    disabled={sending || !inviteEmail.trim()}
                                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {sending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Invite
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Pending Invitations ({invitations.length})
                            </h4>
                            <div className="space-y-2">
                                {invitations.map(invite => (
                                    <div key={invite.id} className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-5 h-5 text-amber-400" />
                                            <div className="text-left">
                                                <p className="text-sm text-white">{invite.email}</p>
                                                <p className="text-xs text-slate-500">
                                                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <RoleBadge role={invite.role} />
                                        </div>
                                        {isOwnerOrAdmin && (
                                            <button
                                                onClick={() => handleCancelInvite(invite.id)}
                                                className="text-slate-400 hover:text-rose-400 transition-colors p-2"
                                                title="Cancel invitation"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Members List */}
                    <div className="space-y-2">
                        {members.map(member => (
                            <div
                                key={member.id}
                                className={`flex items-center justify-between rounded-xl px-4 py-4 border transition-colors ${member.isCurrentUser
                                    ? 'bg-primary/5 border-primary/20'
                                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold">
                                        {(member.full_name || member.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-white">
                                                {member.full_name || member.email}
                                                {member.isCurrentUser && <span className="text-slate-500 text-sm ml-1">(You)</span>}
                                            </p>
                                            <RoleBadge role={member.role} />
                                        </div>
                                        <p className="text-sm text-slate-400">{member.email}</p>
                                    </div>
                                </div>

                                {isOwner && !member.isCurrentUser && member.role !== 'owner' && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={member.role}
                                            onChange={(e) => handleChangeRole(member.id, e.target.value as any)}
                                            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary outline-none"
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemoveMember(member.id, member.email)}
                                            className="text-slate-400 hover:text-rose-400 transition-colors p-2"
                                            title="Remove member"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Permission Notice */}
                    {!isOwnerOrAdmin && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                            <p className="text-sm text-slate-400">
                                Only team owners and admins can invite or manage team members.
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800/50 text-slate-400">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">User</th>
                                    <th className="px-6 py-3 font-semibold">Action</th>
                                    <th className="px-6 py-3 font-semibold">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {activityLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-white font-medium">{log.user_email || 'System'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Activity className="w-3.5 h-3.5 text-primary" />
                                                <span>{log.action.replace(/_/g, ' ')}</span>
                                                {log.details?.target && (
                                                    <span className="text-slate-500 italic">({log.details.target})</span>
                                                )}
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
        </div>
    );
};
