/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const fallbackSupabaseUrl = 'https://placeholder.supabase.co';
const fallbackSupabaseAnonKey = 'placeholder-anon-key';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        'Supabase credentials not configured. Authentication features will be disabled. ' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
}

// Create Supabase client
export const supabase: SupabaseClient = createClient(
    supabaseUrl || fallbackSupabaseUrl,
    supabaseAnonKey || fallbackSupabaseAnonKey,
    {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});

// Database Types
export interface Organization {
    id: string;
    name: string;
    plan: 'free' | 'starter' | 'pro' | 'agency' | 'enterprise';
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    subscription_status: string | null;
    audit_credits_remaining: number;
    rewrite_credits_remaining: number;
    created_at: string;
    updated_at: string;
}

export interface UserProfile {
    id: string;
    organization_id: string | null;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    created_at: string;
}

export interface Domain {
    id: string;
    organization_id: string;
    domain: string;
    verified: boolean;
    verification_token: string | null;
    created_at: string;
}

export interface OnboardingStatus {
    organization_id: string;
    persona: 'agency' | 'brand' | 'developer' | null;
    current_step: number;
    is_completed: boolean;
    onboarding_data: Record<string, any>;
    completed_at?: string;
}

export interface Audit {
    id: string;
    organization_id: string;
    workspace_id?: string | null;
    domain_id: string | null;
    domain_url: string;
    status: 'pending' | 'processing' | 'complete' | 'failed';
    report: Record<string, unknown> | null;
    overall_score: number | null;
    error_message?: string | null;
    created_at: string;
    completed_at: string | null;
}

export interface AuditPage {
    id: string;
    audit_id: string;
    url: string;
    page_type: string;
    quote_likelihood: number;
    recommendations: Record<string, unknown>;
    created_at: string;
}

export interface RewriteSimulation {
    id: string;
    organization_id: string;
    audit_page_id: string | null;
    original_text: string;
    rewrite_text: string;
    score_delta: number;
    vector_shift: number;
    reasoning: string;
    created_at: string;
}

export interface KeywordRanking {
    id: string;
    audit_id: string;
    keyword: string;
    platform: string;
    rank: number | null;
    citation_found: boolean;
    sentiment_score: number | null;
    created_at: string;
}

// Helper functions for database operations

export async function bootstrapOrganization(name?: string): Promise<{
    organization: Organization | null;
    onboarding: OnboardingStatus | null;
}> {
    const { data, error } = await supabase.functions.invoke('bootstrap-org', {
        body: { name }
    });

    if (error) {
        console.error('Error bootstrapping organization:', error);
        return { organization: null, onboarding: null };
    }

    if (!data?.success) {
        console.error('Organization bootstrap failed:', data?.error || 'Unknown error');
        return { organization: null, onboarding: null };
    }

    return {
        organization: data.organization ?? null,
        onboarding: data.onboarding ?? null
    };
}

/**
 * Get the current user's profile
 */
export async function getUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return data;
}

/**
 * Get the current user's organization
 */
export async function getOrganization(): Promise<Organization | null> {
    const profile = await getUserProfile();
    if (!profile?.organization_id) return null;

    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

    if (error) {
        console.error('Error fetching organization:', error);
        return null;
    }

    return data;
}

/**
 * Create a new organization
 */
export async function createOrganization(name: string): Promise<Organization | null> {
    const { organization } = await bootstrapOrganization(name);
    return organization;
}

/**
 * Get onboarding status for the current organization
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus | null> {
    const profile = await getUserProfile();
    if (!profile?.organization_id) return null;

    const { data, error } = await supabase
        .from('organization_onboarding')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching onboarding status:', error);
        return null;
    }

    return data;
}

/**
 * Update onboarding status
 */
export async function updateOnboardingStatus(updates: Partial<OnboardingStatus>): Promise<boolean> {
    const profile = await getUserProfile();
    if (!profile?.organization_id) return false;

    const { error } = await supabase
        .from('organization_onboarding')
        .upsert({
            organization_id: profile.organization_id,
            ...updates,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error updating onboarding status:', error);
        return false;
    }

    return true;
}

/**
 * Create or Update Domain for the organization, optionally scoped to a workspace
 */
export async function upsertDomain(domain: string, workspaceId?: string | null): Promise<Domain | null> {
    const org = await getOrganization();
    if (!org) return null;

    // Remove protocol and trailing slashes
    const cleanDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
    const verificationToken = crypto.randomUUID();

    const { data, error } = await supabase
        .from('domains')
        .upsert({
            organization_id: org.id,
            ...(workspaceId ? { workspace_id: workspaceId } : {}),
            domain: cleanDomain,
            verification_token: verificationToken,
            verified: false
        }, { onConflict: 'organization_id,domain' })
        .select()
        .single();

    if (error) {
        console.error('Error upserting domain:', error);
        return null;
    }

    return data;
}

/**
 * Get all audits for the current organization, optionally filtered by workspace
 */
export async function getAudits(workspaceId?: string | null): Promise<Audit[]> {
    const org = await getOrganization();
    if (!org) return [];

    let query = supabase
        .from('audits')
        .select('*')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false });

    if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching audits:', error);
        return [];
    }

    return data || [];
}

/**
 * Get a specific audit by ID
 */
export async function getAudit(auditId: string): Promise<Audit | null> {
    const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('id', auditId)
        .single();

    if (error) {
        console.error('Error fetching audit:', error);
        return null;
    }

    return data;
}

/**
 * Create a new audit, optionally scoped to a workspace
 */
export async function createAudit(domainUrl: string, workspaceId?: string | null): Promise<Audit | null> {
    const org = await getOrganization();
    if (!org) return null;

    const { data, error } = await supabase
        .from('audits')
        .insert({
            organization_id: org.id,
            ...(workspaceId ? { workspace_id: workspaceId } : {}),
            domain_url: domainUrl,
            status: 'pending',
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating audit:', error);
        return null;
    }

    return data;
}

export async function insertFreeAuditLead(websiteUrl: string): Promise<boolean> {
    const org = await getOrganization();

    const normalizedUrl = websiteUrl.startsWith('http://') || websiteUrl.startsWith('https://')
        ? websiteUrl
        : `https://${websiteUrl}`;
    const hostname = new URL(normalizedUrl).hostname.replace(/^www\./, "");

    if (org) {
        const { error } = await supabase
            .from("audits")
            .insert([
                {
                    organization_id: org.id,
                    domain_url: hostname,
                    status: "pending"
                }
            ]);

        if (error) {
            console.error("Supabase insert error:", error);
            throw error;
        }

        return true;
    }

    const response = await fetch('/api/free-audit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            websiteUrl: normalizedUrl,
            domainUrl: hostname,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Supabase insert error:', errorText);
        throw new Error(errorText || 'Could not save free audit request.');
    }

    return true;
}

/**
 * Create a new audit page
 */
export async function createAuditPage(auditId: string, url: string, type: string): Promise<AuditPage | null> {
    const { data, error } = await supabase
        .from('audit_pages')
        .insert({
            audit_id: auditId,
            url: url,
            page_type: type,
            quote_likelihood: 0, // Default
            recommendations: []  // Default
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating audit page:', error);
        return null;
    }

    return data;
}

/**
 * Update audit with results
 */
export async function updateAudit(
    auditId: string,
    updates: Partial<Pick<Audit, 'status' | 'report' | 'overall_score' | 'completed_at' | 'error_message'>>
): Promise<boolean> {
    const { error } = await supabase
        .from('audits')
        .update(updates)
        .eq('id', auditId);

    if (error) {
        console.error('Error updating audit:', error);
        return false;
    }

    return true;
}

/**
 * Save a keyword ranking result
 */
export async function saveKeywordRanking(ranking: Omit<KeywordRanking, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await supabase
        .from('keyword_rankings')
        .insert(ranking);

    if (error) {
        console.error('Error saving keyword ranking:', error);
        return false;
    }

    return true;
}

/**
 * Get keyword rankings for an audit
 */
export async function getKeywordRankings(auditId: string): Promise<KeywordRanking[]> {
    const { data, error } = await supabase
        .from('keyword_rankings')
        .select('*')
        .eq('audit_id', auditId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching keyword rankings:', error);
        return [];
    }

    return data || [];
}

/**
 * Save a rewrite simulation
 */
export async function saveRewriteSimulation(simulation: Omit<RewriteSimulation, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await supabase
        .from('rewrite_simulations')
        .insert(simulation);

    if (error) {
        console.error('Error saving rewrite simulation:', error);
        return false;
    }

    return true;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
    return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Get rewrite simulations for an organization
 */
export async function getRewriteSimulations(organizationId: string): Promise<RewriteSimulation[]> {
    const { data, error } = await supabase
        .from('rewrite_simulations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching simulations:', error);
        return [];
    }

    return data || [];
}
/**
 * Update recommendation status in the audit report JSON
 */
export async function updateRecommendationStatus(auditId: string, pageUrl: string, recommendationId: string, status: 'OPEN' | 'DONE' | 'IGNORED'): Promise<boolean> {
    // 1. Fetch current audit
    const { data: audit, error: fetchError } = await supabase
        .from('audits')
        .select('report')
        .eq('id', auditId)
        .single();

    if (fetchError || !audit || !audit.report) {
        console.error('Error fetching audit:', fetchError);
        return false;
    }

    const report = audit.report as any;

    // 2. Find and update the recommendation
    let updated = false;
    if (report.pages) {
        report.pages = report.pages.map((p: any) => {
            if (p.url === pageUrl) {
                p.recommendations = p.recommendations.map((r: any) => {
                    if (r.id === recommendationId) {
                        updated = true;
                        return { ...r, status };
                    }
                    return r;
                });
            }
            return p;
        });
    }

    if (!updated) {
        console.warn('Recommendation not found in report');
        return false;
    }

    // 3. Save back the updated report
    const { error: updateError } = await supabase
        .from('audits')
        .update({ report: report })
        .eq('id', auditId);

    if (updateError) {
        console.error('Error updating audit report:', updateError);
        return false;
    }

    return true;
}
