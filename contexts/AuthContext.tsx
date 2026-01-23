import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import {
    supabase,
    Organization,
    UserProfile,
    OnboardingStatus,
    isSupabaseConfigured,
    getOrganization,
    getUserProfile,
    createOrganization,
    getOnboardingStatus
} from '../services/supabase';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    organization: Organization | null;
    onboarding: OnboardingStatus | null;
    session: Session | null;
    loading: boolean;
    error: AuthError | null;
    isConfigured: boolean;

    // Auth methods
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
    signInWithGoogle: () => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;

    // Organization methods
    createOrg: (name: string) => Promise<Organization | null>;
    refreshOrganization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<AuthError | null>(null);

    const isConfigured = isSupabaseConfigured();

    // Initialize auth state
    useEffect(() => {
        if (!isConfigured) {
            setLoading(false);
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                loadUserData();
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                if (event === 'SIGNED_IN' && session?.user) {
                    await loadUserData();
                } else if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    setOrganization(null);
                    setOnboarding(null);
                }

                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, [isConfigured]);

    const loadUserData = async () => {
        try {
            const [userProfile, org, onboardingStatus] = await Promise.all([
                getUserProfile(),
                getOrganization(),
                getOnboardingStatus(),
            ]);
            setProfile(userProfile);
            setOrganization(org);
            setOnboarding(onboardingStatus);
        } catch (err) {
            console.error('Error loading user data:', err);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) setError(error);
        return { error };
    };

    const signUp = async (email: string, password: string, fullName?: string) => {
        setError(null);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });
        if (error) setError(error);
        return { error };
    };

    const signInWithGoogle = async () => {
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) setError(error);
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setOrganization(null);
        setSession(null);
        setOnboarding(null);
    };

    const resetPassword = async (email: string) => {
        setError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) setError(error);
        return { error };
    };

    const createOrg = async (name: string) => {
        const org = await createOrganization(name);
        if (org) {
            setOrganization(org);
            await loadUserData(); // Refresh profile with new org
        }
        return org;
    };

    const refreshOrganization = async () => {
        const [org, onboardingStatus] = await Promise.all([
            getOrganization(),
            getOnboardingStatus(),
        ]);
        setOrganization(org);
        setOnboarding(onboardingStatus);
    };

    const value: AuthContextType = {
        user,
        profile,
        organization,
        onboarding,
        session,
        loading,
        error,
        isConfigured,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        createOrg,
        refreshOrganization,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function useRequireAuth(): AuthContextType {
    const auth = useAuth();

    useEffect(() => {
        if (!auth.loading && !auth.user && auth.isConfigured) {
            console.warn('User is not authenticated');
        }
    }, [auth.loading, auth.user, auth.isConfigured]);

    return auth;
}
