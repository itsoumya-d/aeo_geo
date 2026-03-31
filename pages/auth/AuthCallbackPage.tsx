import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { FullPageLoader } from '../../components/routing/FullPageLoader';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

function getReturnTo(search: string) {
    const params = new URLSearchParams(search);
    return params.get('returnTo') || sessionStorage.getItem('returnTo') || '';
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
    access_denied: 'You denied access. Sign in again to continue.',
    server_error: 'The authentication server encountered an error. Please try again.',
    temporarily_unavailable: 'The service is temporarily unavailable. Please try again shortly.',
};

export const AuthCallbackPage: React.FC = () => {
    const auth = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [oauthError, setOauthError] = useState<string | null>(null);
    const [completingSession, setCompletingSession] = useState(true);

    const returnTo = useMemo(() => getReturnTo(location.search), [location.search]);

    // Detect OAuth error params in the URL (e.g. ?error=access_denied)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const error = params.get('error');
        const errorDesc = params.get('error_description');
        if (error) {
            const friendly = OAUTH_ERROR_MESSAGES[error] || errorDesc || 'An unexpected error occurred during sign in.';
            setOauthError(friendly);
            console.error('[AuthCallback] OAuth error:', error, errorDesc);
        }
    }, [location.search]);

    useEffect(() => {
        let active = true;

        const completeSession = async () => {
            const params = new URLSearchParams(location.search);
            const code = params.get('code');
            const tokenHash = params.get('token_hash');
            const type = params.get('type');

            const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
            const hashError = hashParams.get('error');
            const hashErrorDescription = hashParams.get('error_description');
            const hashTokenHash = hashParams.get('token_hash');
            const hashType = hashParams.get('type');

            if (hashError) {
                if (active) {
                    setOauthError(hashErrorDescription || OAUTH_ERROR_MESSAGES[hashError] || 'We could not complete sign in.');
                    setCompletingSession(false);
                }
                return;
            }

            if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    console.error('[AuthCallback] Session exchange failed:', error);
                    if (active) {
                        setOauthError(error.message || 'We could not complete sign in.');
                        setCompletingSession(false);
                    }
                    return;
                }

                if (active) setCompletingSession(false);
                return;
            }

            const confirmationTokenHash = tokenHash || hashTokenHash;
            const confirmationType = (type || hashType) as 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';

            if (confirmationTokenHash && confirmationType) {
                const { error } = await supabase.auth.verifyOtp({
                    token_hash: confirmationTokenHash,
                    type: confirmationType,
                });

                if (error) {
                    console.error('[AuthCallback] OTP verification failed:', error);
                    if (active) {
                        setOauthError(error.message || 'We could not confirm your email.');
                        setCompletingSession(false);
                    }
                    return;
                }

                if (active) setCompletingSession(false);
                return;
            }

            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error) {
                    console.error('[AuthCallback] Session set failed:', error);
                    if (active) {
                        setOauthError(error.message || 'We could not complete sign in.');
                        setCompletingSession(false);
                    }
                    return;
                }

                if (active) setCompletingSession(false);
                return;
            }

            if (!code && !confirmationTokenHash && !accessToken) {
                if (active) setCompletingSession(false);
                return;
            }
        };

        completeSession().catch((error) => {
            console.error('[AuthCallback] Unexpected callback error:', error);
            if (active) {
                setOauthError('We could not complete sign in.');
                setCompletingSession(false);
            }
        });

        return () => {
            active = false;
        };
    }, [location.search]);

    useEffect(() => {
        if (oauthError) return;
        if (completingSession) return;
        if (!auth.isConfigured && import.meta.env.PROD) return;
        if (auth.loading) return;

        if (!auth.user) {
            navigate('/login', { replace: true });
            return;
        }

        const onboardingIncomplete = !auth.organization || !auth.onboarding?.is_completed;
        sessionStorage.removeItem('returnTo');

        if (onboardingIncomplete) {
            navigate(`/onboarding${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`, { replace: true });
            return;
        }

        navigate(returnTo || '/audit', { replace: true });
    }, [auth.isConfigured, auth.loading, auth.user, auth.organization, auth.onboarding, navigate, returnTo, oauthError, completingSession]);

    if (oauthError) {
        return (
            <div className="min-h-screen bg-background text-text-primary flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-5">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <AlertCircle className="w-7 h-7 text-rose-400" />
                    </div>
                    <h1 className="text-xl font-bold text-text-primary">Sign-in failed</h1>
                    <p className="text-text-secondary text-sm leading-relaxed">{oauthError}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                        >
                            Back to sign in
                        </Link>
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center bg-surface hover:bg-surfaceHighlight border border-border text-text-secondary hover:text-text-primary px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                        >
                            Go home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return <FullPageLoader label="Completing sign in…" />;
};
