// Workspace Service
// Handles CRUD operations for multi-brand workspace management

import { supabase } from './supabase';
import { Workspace } from '../types';

/** Generate a URL-safe slug from a name, with a short random suffix for uniqueness */
function generateSlug(name: string): string {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base || 'workspace'}-${suffix}`;
}

/**
 * Get all workspaces for an organization
 */
export async function getWorkspaces(organizationId: string): Promise<Workspace[]> {
    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[WorkspaceService] Error fetching workspaces:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get a single workspace by ID
 */
export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .maybeSingle();

    if (error) {
        console.error('[WorkspaceService] Error fetching workspace:', error);
        throw error;
    }

    return data;
}

/**
 * Get default workspace for an organization
 * Returns the oldest workspace (created first)
 */
export async function getDefaultWorkspace(organizationId: string): Promise<Workspace | null> {
    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[WorkspaceService] Error fetching default workspace:', error);
        throw error;
    }

    return data;
}

/**
 * Create a new workspace
 */
export async function createWorkspace(
    organizationId: string,
    name: string,
    description?: string,
    iconUrl?: string
): Promise<Workspace | null> {
    const { data, error } = await supabase
        .from('workspaces')
        .insert({
            organization_id: organizationId,
            name,
            slug: generateSlug(name),
            description,
            icon_url: iconUrl,
        })
        .select()
        .single();

    if (error) {
        console.error('[WorkspaceService] Error creating workspace:', error);
        throw error;
    }

    return data;
}

/**
 * Update workspace details
 */
export async function updateWorkspace(
    workspaceId: string,
    updates: {
        name?: string;
        description?: string;
        icon_url?: string;
    }
): Promise<boolean> {
    const { error } = await supabase
        .from('workspaces')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', workspaceId);

    if (error) {
        console.error('[WorkspaceService] Error updating workspace:', error);
        throw error;
    }

    return true;
}

/**
 * Delete a workspace
 * Prevents deletion if it's the last workspace in the organization
 */
export async function deleteWorkspace(
    workspaceId: string,
    organizationId: string
): Promise<boolean> {
    // Check workspace count first
    const { count } = await supabase
        .from('workspaces')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

    if (count !== null && count <= 1) {
        throw new Error('Cannot delete the last workspace. Organizations must have at least one workspace.');
    }

    // Delete the workspace
    const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

    if (error) {
        console.error('[WorkspaceService] Error deleting workspace:', error);
        throw error;
    }

    return true;
}

/**
 * Get workspace count for an organization
 * Useful for enforcing plan tier limits
 */
export async function getWorkspaceCount(organizationId: string): Promise<number> {
    const { count, error } = await supabase
        .from('workspaces')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

    if (error) {
        console.error('[WorkspaceService] Error getting workspace count:', error);
        throw error;
    }

    return count || 0;
}

/**
 * Check if organization can create more workspaces based on plan tier
 */
export async function canCreateWorkspace(
    organizationId: string,
    plan: string
): Promise<{ allowed: boolean; limit: number; current: number }> {
    // Plan tier limits
    const workspaceLimits: Record<string, number> = {
        free: 1,
        starter: 1,
        pro: 3,
        agency: Infinity,
        enterprise: Infinity,
    };

    const limit = workspaceLimits[plan] || 1;
    const current = await getWorkspaceCount(organizationId);

    return {
        allowed: current < limit,
        limit,
        current,
    };
}

/**
 * Validate workspace belongs to organization
 */
export async function validateWorkspaceOwnership(
    workspaceId: string,
    organizationId: string
): Promise<boolean> {
    const { data } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .eq('organization_id', organizationId)
        .maybeSingle();

    return !!data;
}

/**
 * Get workspace members (if using workspace-level permissions)
 */
export async function getWorkspaceMembers(workspaceId: string) {
    const { data, error } = await supabase
        .from('workspace_members')
        .select(`
            *,
            users:user_id (
                id,
                email,
                full_name,
                avatar_url
            )
        `)
        .eq('workspace_id', workspaceId)
        .order('added_at', { ascending: true });

    if (error) {
        console.error('[WorkspaceService] Error fetching workspace members:', error);
        throw error;
    }

    return data || [];
}

/**
 * Add member to workspace
 */
export async function addWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer' = 'member'
) {
    const { data, error } = await supabase
        .from('workspace_members')
        .insert({
            workspace_id: workspaceId,
            user_id: userId,
            role,
        })
        .select()
        .single();

    if (error) {
        console.error('[WorkspaceService] Error adding workspace member:', error);
        throw error;
    }

    return data;
}

/**
 * Remove member from workspace
 */
export async function removeWorkspaceMember(
    workspaceId: string,
    userId: string
): Promise<boolean> {
    const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

    if (error) {
        console.error('[WorkspaceService] Error removing workspace member:', error);
        throw error;
    }

    return true;
}

/**
 * Update workspace member role
 */
export async function updateWorkspaceMemberRole(
    workspaceId: string,
    userId: string,
    role: 'admin' | 'member' | 'viewer'
): Promise<boolean> {
    const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

    if (error) {
        console.error('[WorkspaceService] Error updating workspace member role:', error);
        throw error;
    }

    return true;
}
