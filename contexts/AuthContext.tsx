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
import { Workspace } from '../types';
import { getWorkspaces, getDefaultWorkspace } from '../services/workspaceService';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    organization: Organization | null;
    onboarding: OnboardingStatus | null;
    session: Session | null;
    loading: boolean;
    error: AuthError | null;
    isConfigured: boolean;

    // Workspace state
    workspaces: Workspace[] | null;
    currentWorkspace: Workspace | null;

    // Auth methods
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signUp: (email: string, password: string, fullName?: string, emailRedirectTo?: string) => Promise<{ data?: { session: Session | null }; error: AuthError | null }>;
    signInWithGoogle: (returnTo?: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;

    // Organization methods
    createOrg: (name: string) => Promise<Organization | null>;
    refreshOrganization: () => Promise<void>;

    // Workspace methods
    loadWorkspaces: () => Promise<void>;
    switchWorkspace: (workspaceId: string) => Promise<void>;
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

    // Workspace state
    const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

    const isConfigured = isSupabaseConfigured();

    const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = 10000): Promise<T> => {
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new Error('Auth data load timed out'));
            }, timeoutMs);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
        }
    };

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
            setLoading(false);

            if (session?.user) {
                void loadUserData();
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);

                if (event === 'SIGNED_IN' && session?.user) {
                    void loadUserData();
                } else if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    setOrganization(null);
                    setOnboarding(null);
                    setWorkspaces(null);
                    setCurrentWorkspace(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [isConfigured]);

    const loadUserData = async () => {
        try {
            const [userProfile, org, onboardingStatus] = await withTimeout(Promise.all([
                getUserProfile(),
                getOrganization(),
                getOnboardingStatus(),
            ]));
            setProfile(userProfile);
            setOrganization(org);
            setOnboarding(onboardingStatus);

            // Load workspaces if organization exists
            if (org?.id) {
                void loadWorkspacesInternal(org.id);
            }
        } catch (err) {
            console.error('Error loading user data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Internal function to load workspaces
    const loadWorkspacesInternal = async (organizationId: string) => {
        try {
            const workspaceList = await getWorkspaces(organizationId);
            setWorkspaces(workspaceList);

            // Get stored workspace ID or use default
            const storedWorkspaceId = localStorage.getItem('current_workspace_id');
            let workspace: Workspace | null = null;

            if (storedWorkspaceId) {
                workspace = workspaceList.find(w => w.id === storedWorkspaceId) || null;
            }

            // Fallback to default (first) workspace
            if (!workspace && workspaceList.length > 0) {
                workspace = workspaceList[0];
            }

            setCurrentWorkspace(workspace);

            // Store for next session
            if (workspace) {
                localStorage.setItem('current_workspace_id', workspace.id);
            }
        } catch (err) {
            console.error('Error loading workspaces:', err);
        }
    };

    // Public function to reload workspaces
    const loadWorkspaces = async () => {
        if (!organization?.id) return;
        await loadWorkspacesInternal(organization.id);
    };

    // Switch to different workspace
    const switchWorkspace = async (workspaceId: string) => {
        if (!workspaces) return;

        const workspace = workspaces.find(w => w.id === workspaceId);
        if (workspace) {
            setCurrentWorkspace(workspace);
            localStorage.setItem('current_workspace_id', workspaceId);
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

    const signUp = async (email: string, password: string, fullName?: string, emailRedirectTo?: string) => {
        setError(null);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                ...(emailRedirectTo ? { emailRedirectTo } : {}),
                data: {
                    full_name: fullName,
                },
            },
        });
        if (error) setError(error);
        return { data, error };
    };

    const signInWithGoogle = async (returnTo?: string) => {
        setError(null);
        const redirectTo = `${window.location.origin}/auth/callback${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
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
        setWorkspaces(null);
        setCurrentWorkspace(null);
        localStorage.removeItem('current_workspace_id');
    };

    const resetPassword = async (email: string) => {
        setError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
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
        const [userProfile, org, onboardingStatus] = await Promise.all([
            getUserProfile(),
            getOrganization(),
            getOnboardingStatus(),
        ]);
        setProfile(userProfile);
        setOrganization(org);
        setOnboarding(onboardingStatus);
        if (org?.id) {
            await loadWorkspacesInternal(org.id);
        } else {
            setWorkspaces(null);
            setCurrentWorkspace(null);
        }
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
        workspaces,
        currentWorkspace,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        createOrg,
        refreshOrganization,
        loadWorkspaces,
        switchWorkspace,
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
