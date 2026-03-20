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

const GoogleMark: React.FC = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
            fill="#EA4335"
            d="M12.24 10.285v3.879h5.395c-.238 1.249-.95 2.307-2.02 3.018l3.266 2.535c1.904-1.754 3.004-4.337 3.004-7.405 0-.711-.064-1.394-.183-2.027H12.24z"
        />
        <path
            fill="#34A853"
            d="M12 22c2.7 0 4.965-.894 6.62-2.428l-3.266-2.535c-.907.609-2.068.968-3.354.968-2.579 0-4.763-1.741-5.545-4.082H3.08v2.615A9.997 9.997 0 0 0 12 22z"
        />
        <path
            fill="#4A90E2"
            d="M6.455 13.923a5.999 5.999 0 0 1 0-3.846V7.462H3.08a9.997 9.997 0 0 0 0 9.076l3.375-2.615z"
        />
        <path
            fill="#FBBC05"
            d="M12 5.995c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.96 2.995 14.695 2 12 2A9.997 9.997 0 0 0 3.08 7.462l3.375 2.615c.782-2.341 2.966-4.082 5.545-4.082z"
        />
    </svg>
);

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
                            <GoogleMark />
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

