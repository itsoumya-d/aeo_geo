import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot-password';

interface AuthPageProps {
    onSuccess?: () => void;
    defaultMode?: AuthMode;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, defaultMode = 'login' }) => {
    const { signIn, signUp, signInWithGoogle, resetPassword, loading, error } = useAuth();

    const [mode, setMode] = useState<AuthMode>(defaultMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [localError, setLocalError] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        setSuccessMessage('');
        setIsSubmitting(true);

        try {
            if (mode === 'login') {
                const { error } = await signIn(email, password);
                if (!error && onSuccess) {
                    onSuccess();
                } else if (error) {
                    setLocalError(error.message);
                }
            } else if (mode === 'signup') {
                if (password.length < 6) {
                    setLocalError('Password must be at least 6 characters');
                    setIsSubmitting(false);
                    return;
                }
                const { error } = await signUp(email, password, fullName);
                if (!error) {
                    setSuccessMessage('Check your email for a confirmation link!');
                } else {
                    setLocalError(error.message);
                }
            } else if (mode === 'forgot-password') {
                const { error } = await resetPassword(email);
                if (!error) {
                    setSuccessMessage('Password reset email sent!');
                } else {
                    setLocalError(error.message);
                }
            }
        } catch (err) {
            setLocalError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLocalError('');
        const { error } = await signInWithGoogle();
        if (error) {
            setLocalError(error.message);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Title */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Cognition <span className="text-primary">AI</span>
                    </h1>
                    <p className="text-slate-400">
                        {mode === 'login' && 'Sign in to your account'}
                        {mode === 'signup' && 'Create your account'}
                        {mode === 'forgot-password' && 'Reset your password'}
                    </p>
                </div>

                {/* Auth Card */}
                <div className="bg-surface border border-slate-700 rounded-2xl p-8 shadow-2xl">
                    {/* Google Sign In */}
                    {mode !== 'forgot-password' && (
                        <>
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </button>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-700"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-surface text-slate-400">or continue with email</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-2">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        id="fullName"
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        {mode !== 'forgot-password' && (
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-11 pr-11 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {(localError || error) && (
                            <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{localError || error?.message}</span>
                            </div>
                        )}

                        {/* Success Message */}
                        {successMessage && (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{successMessage}</span>
                            </div>
                        )}

                        {/* Forgot Password Link */}
                        {mode === 'login' && (
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => setMode('forgot-password')}
                                    className="text-sm text-primary hover:underline"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || loading}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {mode === 'login' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending...'}
                                </>
                            ) : (
                                <>
                                    {mode === 'login' && 'Sign In'}
                                    {mode === 'signup' && 'Create Account'}
                                    {mode === 'forgot-password' && 'Send Reset Link'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Mode Switcher */}
                    <div className="mt-6 text-center text-sm text-slate-400">
                        {mode === 'login' && (
                            <>
                                Don't have an account?{' '}
                                <button onClick={() => setMode('signup')} className="text-primary hover:underline font-medium">
                                    Sign up
                                </button>
                            </>
                        )}
                        {mode === 'signup' && (
                            <>
                                Already have an account?{' '}
                                <button onClick={() => setMode('login')} className="text-primary hover:underline font-medium">
                                    Sign in
                                </button>
                            </>
                        )}
                        {mode === 'forgot-password' && (
                            <>
                                Remember your password?{' '}
                                <button onClick={() => setMode('login')} className="text-primary hover:underline font-medium">
                                    Sign in
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Terms */}
                {mode === 'signup' && (
                    <p className="mt-6 text-center text-xs text-slate-500">
                        By creating an account, you agree to our{' '}
                        <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                    </p>
                )}
            </div>
        </div>
    );
};
