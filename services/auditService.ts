import { supabase } from './supabase';

/**
 * Audit Service
 * Manages enterprise-grade security logging for accountability and compliance.
 */

export interface AuditActor {
    id: string;
    type: 'user' | 'system' | 'api_key';
    name?: string;
    email?: string;
}

export interface AuditTarget {
    id: string;
    type: 'organization' | 'audit' | 'report' | 'user' | 'billing' | 'competitor' | 'integration';
    display_name?: string;
}

export interface AuditLogEntry {
    id: string;
    organization_id: string;
    actor: AuditActor;
    action: string;
    target: AuditTarget;
    metadata: Record<string, any>;
    changes?: {
        before: any;
        after: any;
    };
    occurred_at: string;
}

/**
 * Track a security event
 */
export async function auditLog(params: {
    actor: AuditActor;
    action: string;
    target: AuditTarget;
    metadata?: Record<string, any>;
    changes?: { before: any; after: any };
}): Promise<string | null> {
    const { data: userData } = await supabase.auth.getUser();
    const { data: orgData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userData.user?.id)
        .single();

    if (!orgData?.organization_id) return null;

    // Enrich metadata with client info
    const enrichedMetadata = {
        ...params.metadata,
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        url: window.location.href,
        timestamp_ms: Date.now()
    };

    const { data, error } = await supabase
        .from('audit_logs')
        .insert({
            organization_id: orgData.organization_id,
            actor: params.actor,
            action: params.action,
            target: params.target,
            metadata: enrichedMetadata,
            changes: params.changes || null
        })
        .select('id')
        .single();

    if (error) {
        console.error('Audit Log failed:', error);
        return null;
    }

    return data.id;
}

/**
 * Helper to get current user as an AuditActor
 */
export async function getCurrentActor(): Promise<AuditActor | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return {
        id: user.id,
        type: 'user',
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        email: user.email
    };
}

/**
 * Get audit logs for the current organization
 */
export async function getAuditLogs(params?: {
    limit?: number;
    offset?: number;
    action?: string;
}): Promise<AuditLogEntry[]> {
    let query = supabase
        .from('audit_logs')
        .select('*')
        .order('occurred_at', { ascending: false });

    if (params?.limit) query = query.limit(params.limit);
    if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    if (params?.action) query = query.eq('action', params.action);

    const { data, error } = await query;

    if (error) {
        console.error('Failed to fetch audit logs:', error);
        return [];
    }

    return data || [];
}

export default {
    auditLog,
    getCurrentActor,
    getAuditLogs
};
