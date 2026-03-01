import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Lock, Mail } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { validateEmail } from '../../utils/validation';

function getReturnTo(search: string) {
    const params = new URLSearchParams(search);
    return params.get('returnTo') || sessionStorage.getItem('returnTo') || '';
}

function isRecoveryLink(location: Location) {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('type') === 'recovery') return true;

    const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
    const hashParams = new URLSearchParams(hash);
    return hashParams.get('type') === 'recovery';
}

function validatePassword(password: string) {
    const errors: string[] = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('1 uppercase letter');
    if (!/[0-9]/.test(password)) errors.push('1 number');
    return errors;
}

export const ResetPasswordPage: React.FC = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const returnTo = useMemo(() => getReturnTo(location.search), [location.search]);

    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [localError, setLocalError] = useState('');

    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [updating, setUpdating] = useState(false);
    const [updated, setUpdated] = useState(false);

    const recovery = useMemo(() => isRecoveryLink(window.location), [location.key]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        if (!code) return;
        supabase.auth.exchangeCodeForSession(code).catch(() => null);
    }, [location.search]);

    const requestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        const emailCheck = validateEmail(email);
        if (!emailCheck.isValid) {
            setLocalError(emailCheck.error || 'Enter a valid email address.');
            return;
        }

        setSending(true);
        try {
            const { error } = await auth.resetPassword(email.trim());
            if (error) {
                setLocalError(error.message || 'Unable to send reset email.');
                return;
            }
            setSent(true);
        } finally {
            setSending(false);
        }
    };

    const setPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        const pwdErrors = validatePassword(newPassword);
        if (pwdErrors.length > 0) {
            setLocalError(`Password requirements: ${pwdErrors.join(', ')}.`);
            return;
        }
        if (newPassword !== confirm) {
            setLocalError('Passwords do not match.');
            return;
        }

        setUpdating(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                setLocalError(error.message || 'Unable to update password.');
                return;
            }
            setUpdated(true);
            sessionStorage.removeItem('returnTo');
            setTimeout(() => navigate(`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`, { replace: true }), 1200);
        } finally {
            setUpdating(false);
        }
    };

    if (recovery) {
        return (
            <AuthShell
                title="Set a new password"
                subtitle="Choose a strong password to secure your account."
                footer={
                    <p className="text-center text-sm text-text-secondary">
                        <Link to="/login" className="text-primary hover:underline font-semibold">
                            Back to sign in
                        </Link>
                    </p>
                }
            >
                {updated ? (
                    <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-sm text-white font-semibold">Password updated</p>
                            <p className="text-sm text-text-secondary mt-1">Redirecting to sign in…</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={setPassword} className="space-y-5">
                        <Input
                            label="New password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            autoComplete="new-password"
                            icon={<Lock className="w-4 h-4" />}
                            disabled={updating}
                        />
                        <Input
                            label="Confirm new password"
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="Repeat new password"
                            autoComplete="new-password"
                            icon={<Lock className="w-4 h-4" />}
                            disabled={updating}
                        />

                        {localError ? (
                            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">
                                {localError}
                            </div>
                        ) : null}

                        <Button type="submit" size="lg" className="w-full" isLoading={updating}>
                            {updating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…
                                </>
                            ) : (
                                'Update password'
                            )}
                        </Button>
                    </form>
                )}
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Reset password"
            subtitle="We’ll email you a secure reset link."
            footer={
                <p className="text-center text-sm text-text-secondary">
                    Remembered your password?{' '}
                    <Link
                        to={`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
                        className="text-primary hover:underline font-semibold"
                    >
                        Back to sign in
                    </Link>
                </p>
            }
        >
            {sent ? (
                <div className="space-y-4">
                    <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-sm text-white font-semibold">Check your email</p>
                            <p className="text-sm text-text-secondary mt-1">
                                If an account exists for <span className="font-semibold text-white">{email.trim()}</span>, you’ll receive reset instructions shortly.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={requestReset} className="space-y-5">
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoComplete="email"
                        icon={<Mail className="w-4 h-4" />}
                        disabled={sending}
                    />

                    {localError ? (
                        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">
                            {localError}
                        </div>
                    ) : null}

                    <Button type="submit" size="lg" className="w-full" isLoading={sending}>
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                            </>
                        ) : (
                            'Send reset link'
                        )}
                    </Button>
                </form>
            )}
        </AuthShell>
    );
};

