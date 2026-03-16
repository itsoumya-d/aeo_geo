import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { AuthShell } from './AuthShell';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/validation';

function getReturnTo(search: string) {
    const params = new URLSearchParams(search);
    return params.get('returnTo') || sessionStorage.getItem('returnTo') || '';
}

export const LoginPage: React.FC = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const returnTo = useMemo(() => getReturnTo(location.search), [location.search]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState<string>('');

    const canUseOAuth = auth.isConfigured;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        const emailCheck = validateEmail(email);
        if (!emailCheck.isValid) {
            setLocalError(emailCheck.error || 'Enter a valid email address.');
            return;
        }
        if (!password) {
            setLocalError('Enter your password.');
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await auth.signIn(email.trim(), password);
            if (error) {
                const msg = error.message?.toLowerCase().includes('invalid login credentials')
                    ? 'Invalid email or password.'
                    : error.message || 'Unable to sign in.';
                setLocalError(msg);
                return;
            }

            sessionStorage.removeItem('returnTo');
            navigate(returnTo || '/audit', { replace: true });
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoogle = async () => {
        setLocalError('');
        if (returnTo) sessionStorage.setItem('returnTo', returnTo);
        const { error } = await auth.signInWithGoogle(returnTo || undefined);
        if (error) {
            setLocalError('Google sign-in is currently unavailable. Please use email and password.');
        }
    };

    return (
        <AuthShell
            title="Sign in"
            subtitle="Access your workspace to run audits and view reports."
            footer={
                <p className="text-center text-sm text-text-secondary">
                    Don&apos;t have an account?{' '}
                    <Link
                        to={`/signup${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
                        className="text-primary hover:underline font-semibold"
                    >
                        Sign up
                    </Link>
                </p>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {canUseOAuth && (
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            className="w-full bg-white text-black hover:bg-slate-100 hover:text-black"
                            onClick={handleGoogle}
                            disabled={submitting}
                        >
                            Continue with Google
                        </Button>
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
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    icon={<Mail className="w-4 h-4" />}
                    disabled={submitting}
                />

                <div className="space-y-2">
                    <Input
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your password"
                        autoComplete="current-password"
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
                        <Link
                            to={`/reset-password${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`}
                            className="text-xs text-primary hover:underline font-semibold"
                        >
                            Forgot password?
                        </Link>
                    </div>
                </div>

                {localError ? (
                    <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">
                        {localError}
                    </div>
                ) : null}

                <Button type="submit" size="lg" className="w-full" isLoading={submitting || auth.loading}>
                    {submitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…
                        </>
                    ) : (
                        'Sign in'
                    )}
                </Button>

                <p className="text-center text-xs text-text-muted pt-2">
                    Join teams tracking AI visibility across ChatGPT, Gemini &amp; more.
                </p>
            </form>
        </AuthShell>
    );
};

