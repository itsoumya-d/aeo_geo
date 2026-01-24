import { supabase } from './supabase';

/**
 * Permission Service
 * Manages RBAC (Role-Based Access Control) and granular permission checks.
 */

export type Permission =
    | 'audit.read' | 'audit.create' | 'audit.delete'
    | 'competitor.manage' | 'report.manage'
    | 'team.view' | 'team.manage'
    | 'billing.manage' | 'settings.manage';

/**
 * Check if the current user has a specific permission
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Call the RPC defined in Migration 018
    const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: user.id,
        p_permission: permission
    });

    if (error) {
        console.error(`Permission check failed for ${permission}:`, error);
        return false;
    }

    return !!data;
}

/**
 * Get all permissions for the current user
 */
export async function getMyPermissions(): Promise<Permission[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('users')
        .select(`
            roles:organization_id (
                role_permissions (permission_id)
            )
        `)
        .eq('id', user.id)
        .single();

    // Note: The recursive join above might be complex due to the schema.
    // Simpler fallback: Query roles based on user.role string (Owner, Admin, Editor, Viewer)
    // and fetch their permissions from the role_permissions table.

    const roleName = user.user_metadata?.role || 'Viewer'; // Default to Viewer if unknown

    const { data: permissions, error: pError } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', (
            await supabase.from('roles').select('id').eq('name', roleName).eq('is_system', true).single()
        ).data?.id);

    if (pError) return [];
    return permissions.map(p => p.permission_id as Permission);
}

/**
 * Hook-ready permission check
 * Note: Use this in components to conditionally render UI elements
 */
export const canUse = async (permission: Permission): Promise<boolean> => {
    return hasPermission(permission);
}

export default {
    hasPermission,
    getMyPermissions,
    canUse
};
