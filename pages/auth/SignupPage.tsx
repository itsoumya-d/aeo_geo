import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, RefreshCw, User } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/validation';
import { supabase } from '../../services/supabase';
import { GoogleAuthButton } from './GoogleAuthButton';

function getReturnTo(search: string) {
    const params = new URLSearchParams(search);
    return params.get('returnTo') || sessionStorage.getItem('returnTo') || '';
}

const getEmailConfirmationRedirect = () => `${window.location.origin}/auth/callback`;

function validatePassword(password: string) {
    const errors: string[] = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('1 uppercase letter');
    if (!/[0-9]/.test(password)) errors.push('1 number');
    return errors;
}

function getStrength(password: string) {
    const rules = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password)
    ];
    return rules.filter(Boolean).length;
}

export const SignupPage: React.FC = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const returnTo = useMemo(() => getReturnTo(location.search), [location.search]);

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState<string>('');
    const [success, setSuccess] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendDone, setResendDone] = useState(false);

    const canUseOAuth = auth.isConfigured;
    const passwordErrors = validatePassword(password);
    const strength = getStrength(password);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        const emailCheck = validateEmail(email);
        if (!emailCheck.isValid) {
            setLocalError(emailCheck.error || 'Enter a valid email address.');
            return;
        }
        if (!acceptedTerms) {
            setLocalError('You must agree to the Terms and Privacy Policy.');
            return;
        }
        const pwdErrors = validatePassword(password);
        if (pwdErrors.length > 0) {
            setLocalError(`Password requirements: ${pwdErrors.join(', ')}.`);
            return;
        }
        if (password !== confirm) {
            setLocalError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            const { error, data } = await auth.signUp(
                email.trim(),
                password,
                fullName.trim() || undefined,
                getEmailConfirmationRedirect()
            );
            if (error) {
                const msg = error.message?.toLowerCase().includes('already registered')
                    ? 'An account with this email already exists. Try signing in.'
                    : error.message || 'Unable to create account.';
                setLocalError(msg);
                return;
            }

            if (data?.session) {
                sessionStorage.removeItem('returnTo');
                navigate(returnTo || '/audit', { replace: true });
                return;
            }

            setSuccess(true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogle = async () => {
        setLocalError('');
        if (returnTo) sessionStorage.setItem('returnTo', returnTo);
        const { error } = await auth.signInWithGoogle(returnTo || undefined);
        if (error) {
            setLocalError('Google sign-up is currently unavailable. Please use email and password.');
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await supabase.auth.resend({
                type: 'signup',
                email: email.trim(),
                options: {
                    emailRedirectTo: getEmailConfirmationRedirect(),
                },
            });
            setResendDone(true);
        } finally {
            setResending(false);
        }
    };

    if (success) {
        return (
            <AuthShell
                title="Check your email"
                subtitle="Confirm your email address to complete your signup."
                footer={
                    <p className="text-center text-sm text-text-secondary">
                        Already confirmed?{' '}
                        <Link to="/login" className="text-primary hover:underline font-semibold">
                            Back to sign in
                        </Link>
                    </p>
                }
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-sm text-text-primary font-semibold">Email sent</p>
                            <p className="text-sm text-text-secondary mt-1">
                                We&apos;ve sent a confirmation link to <span className="font-semibold text-text-primary">{email.trim()}</span>.
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                        If you don&apos;t see it within a few minutes, check your spam folder.
                    </p>
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending || resendDone}
                        className="w-full flex items-center justify-center gap-2 bg-surfaceHighlight hover:bg-surfaceHighlight/80 border border-border text-text-secondary hover:text-text-primary text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {resending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {resendDone ? 'Email resent!' : 'Resend confirmation email'}
                    </button>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Create your account"
            subtitle="Start a free audit and see how AI search engines perceive your brand."
            footer={
                <p className="text-center text-sm text-text-secondary">
                    Already have an account?{' '}
                    <Link
                        to={`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
                        className="text-primary hover:underline font-semibold"
                    >
                        Sign in
                    </Link>
                </p>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {canUseOAuth && (
                    <>
                        <GoogleAuthButton onClick={handleGoogle} disabled={submitting} />
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-surface/40 px-2 text-text-muted backdrop-blur-md">Or</span>
                            </div>
                        </div>
                    </>
                )}

                <Input
                    label="Full name (optional)"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    icon={<User className="w-4 h-4" />}
                    disabled={submitting}
                />

                <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    icon={<Mail className="w-4 h-4" />}
                    disabled={submitting}
                />

                <div className="space-y-3">
                    <Input
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        icon={<Lock className="w-4 h-4" />}
                        disabled={submitting}
                    />

                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            className="text-xs text-text-muted hover:text-white transition-colors flex items-center gap-2"
                            onClick={() => setShowPassword(v => !v)}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showPassword ? 'Hide password' : 'Show password'}
                        </button>

                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${strength >= 3 ? 'bg-emerald-500' : strength === 2 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                    style={{ width: `${Math.max(1, (strength / 4) * 100)}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                {strength >= 3 ? 'Strong' : strength === 2 ? 'Medium' : 'Weak'}
                            </span>
                        </div>
                    </div>

                    <Input
                        label="Confirm password"
                        type={showPassword ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        icon={<Lock className="w-4 h-4" />}
                        disabled={submitting}
                    />
                </div>

                <label className="flex items-start gap-3 text-sm text-text-secondary cursor-pointer select-none">
                    <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary cursor-pointer"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        disabled={submitting}
                    />
                    <span>
                        I agree to the{' '}
                        <Link to="/terms" className="text-primary hover:underline font-semibold">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-primary hover:underline font-semibold">
                            Privacy Policy
                        </Link>
                        .
                    </span>
                </label>

                {localError ? (
                    <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">
                        {localError}
                    </div>
                ) : null}

                <Button type="submit" size="lg" className="w-full" isLoading={submitting || auth.loading}>
                    {submitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…
                        </>
                    ) : (
                        'Create account'
                    )}
                </Button>
            </form>
        </AuthShell>
    );
};

