import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Loader2, Users } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

type InviteState =
    | { status: 'loading' }
    | { status: 'valid'; email: string; role: string; organizationId: string }
    | { status: 'accepting' }
    | { status: 'accepted' }
    | { status: 'expired' }
    | { status: 'already_accepted' }
    | { status: 'email_mismatch'; expectedEmail: string }
    | { status: 'error'; message: string };

export const AcceptInvitePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, signIn } = useAuth();

    const token = searchParams.get('token');
    const [state, setState] = useState<InviteState>({ status: 'loading' });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    // Step 1: Validate token on mount
    useEffect(() => {
        if (!token) {
            setState({ status: 'error', message: 'No invitation token provided.' });
            return;
        }

        (async () => {
            try {
                const { data, error } = await supabase.functions.invoke('accept-invitation', {
                    body: { token },
                });

                if (error) throw new Error(error.message);

                if (data?.expired) {
                    setState({ status: 'expired' });
                } else if (data?.alreadyAccepted) {
                    setState({ status: 'already_accepted' });
                } else if (data?.valid) {
                    setState({
                        status: 'valid',
                        email: data.invitation.email,
                        role: data.invitation.role,
                        organizationId: data.invitation.organization_id,
                    });
                    setEmail(data.invitation.email);
                } else {
                    setState({ status: 'error', message: data?.error || 'Invalid invitation.' });
                }
            } catch (err: any) {
                setState({ status: 'error', message: err.message || 'Failed to validate invitation.' });
            }
        })();
    }, [token]);

    // Step 2: Accept the invitation (called after user is authenticated)
    const acceptInvitation = async () => {
        if (!token) return;
        setState({ status: 'accepting' });

        try {
            const { data, error } = await supabase.functions.invoke('accept-invitation', {
                body: { token, accept: true },
            });

            if (error) throw new Error(error.message);

            if (data?.success) {
                await supabase.auth.refreshSession();
                setState({ status: 'accepted' });
                setTimeout(() => navigate('/dashboard'), 2000);
            } else if (data?.error?.includes('sign in with that account')) {
                const expectedEmail = state.status === 'valid' ? state.email : '';
                setState({ status: 'email_mismatch', expectedEmail });
            } else {
                throw new Error(data?.error || 'Failed to accept invitation.');
            }
        } catch (err: any) {
            setState({ status: 'error', message: err.message });
        }
    };

    // If user is already signed in, try to accept immediately
    useEffect(() => {
        if (user && state.status === 'valid') {
            acceptInvitation();
        }
    }, [user, state.status]);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        try {
            await signIn(email, password);
            // acceptInvitation will be triggered by the useEffect above once user state updates
        } catch (err: any) {
            setAuthError(err.message || 'Sign in failed.');
        }
    };

    const roleLabels: Record<string, string> = {
        owner: 'Owner',
        admin: 'Admin',
        member: 'Member',
        viewer: 'Viewer (read-only)',
    };

    return (
        <AuthShell
            title="Team Invitation"
            subtitle="You've been invited to join an organization on GOAT AEO"
        >
            <div className="space-y-6">
                {/* Loading */}
                {state.status === 'loading' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4 py-6"
                    >
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-text-secondary text-sm">Validating invitation…</p>
                    </motion.div>
                )}

                {/* Valid — show sign-in form if not authenticated */}
                {state.status === 'valid' && !user && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-5"
                    >
                        <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl border border-primary/20">
                            <Users className="w-5 h-5 text-primary flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-white">
                                    Role: <span className="text-primary">{roleLabels[state.role] || state.role}</span>
                                </p>
                                <p className="text-xs text-text-muted mt-0.5">
                                    Invited as <strong>{state.email}</strong>
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-text-secondary">
                            Sign in with <strong className="text-white">{state.email}</strong> to accept this invitation.
                        </p>

                        <form onSubmit={handleSignIn} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                            {authError && (
                                <p className="text-xs text-rose-400">{authError}</p>
                            )}
                            <Button type="submit" variant="primary" className="w-full">
                                Sign In & Accept Invitation
                            </Button>
                        </form>

                        <p className="text-xs text-center text-text-muted">
                            Don't have an account?{' '}
                            <a href={`/signup?email=${encodeURIComponent(state.email)}&redirect=/accept-invite?token=${token}`}
                               className="text-primary hover:underline">
                                Create one
                            </a>
                        </p>
                    </motion.div>
                )}

                {/* Accepting */}
                {(state.status === 'accepting') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4 py-6"
                    >
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-text-secondary text-sm">Accepting invitation…</p>
                    </motion.div>
                )}

                {/* Accepted */}
                {state.status === 'accepted' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-4 py-6 text-center"
                    >
                        <CheckCircle className="w-14 h-14 text-emerald-400" />
                        <div>
                            <p className="text-lg font-semibold text-white">You're in!</p>
                            <p className="text-sm text-text-secondary mt-1">
                                Redirecting you to the dashboard…
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Expired */}
                {state.status === 'expired' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4 py-6 text-center"
                    >
                        <Clock className="w-14 h-14 text-amber-400" />
                        <div>
                            <p className="text-lg font-semibold text-white">Invitation Expired</p>
                            <p className="text-sm text-text-secondary mt-1">
                                This invitation link has expired. Ask your admin to send a new one.
                            </p>
                        </div>
                        <Button variant="secondary" onClick={() => navigate('/')}>Go Home</Button>
                    </motion.div>
                )}

                {/* Already accepted */}
                {state.status === 'already_accepted' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4 py-6 text-center"
                    >
                        <CheckCircle className="w-14 h-14 text-emerald-400" />
                        <div>
                            <p className="text-lg font-semibold text-white">Already Accepted</p>
                            <p className="text-sm text-text-secondary mt-1">
                                This invitation was already accepted. Sign in to access the dashboard.
                            </p>
                        </div>
                        <Button variant="primary" onClick={() => navigate('/login')}>Sign In</Button>
                    </motion.div>
                )}

                {/* Email mismatch */}
                {state.status === 'email_mismatch' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4 py-6 text-center"
                    >
                        <XCircle className="w-14 h-14 text-rose-400" />
                        <div>
                            <p className="text-lg font-semibold text-white">Wrong Account</p>
                            <p className="text-sm text-text-secondary mt-1">
                                This invitation was sent to <strong className="text-white">{state.expectedEmail}</strong>.<br />
                                Please sign out and sign in with that account.
                            </p>
                        </div>
                        <Button variant="secondary" onClick={() => navigate('/login')}>Switch Account</Button>
                    </motion.div>
                )}

                {/* Generic error */}
                {state.status === 'error' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4 py-6 text-center"
                    >
                        <XCircle className="w-14 h-14 text-rose-400" />
                        <div>
                            <p className="text-lg font-semibold text-white">Invalid Invitation</p>
                            <p className="text-sm text-text-secondary mt-1">{state.message}</p>
                        </div>
                        <Button variant="secondary" onClick={() => navigate('/')}>Go Home</Button>
                    </motion.div>
                )}
            </div>
        </AuthShell>
    );
};
