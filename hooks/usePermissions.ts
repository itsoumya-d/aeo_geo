
import { useAuth } from '../contexts/AuthContext';

type Permission =
    | 'view_dashboard'
    | 'create_audit'
    | 'manage_team'
    | 'manage_billing'
    | 'manage_api_keys'
    | 'edit_settings';

export const usePermissions = () => {
    const { profile } = useAuth();
    const role = profile?.role || 'viewer';

    const can = (permission: Permission): boolean => {
        if (role === 'owner') return true;

        switch (permission) {
            case 'view_dashboard':
                return true; // Everyone
            case 'create_audit':
                return ['admin', 'member'].includes(role);
            case 'manage_team':
                return ['admin'].includes(role);
            case 'manage_billing':
                return false; // Only owner
            case 'manage_api_keys':
                return ['admin'].includes(role);
            case 'edit_settings':
                return ['admin'].includes(role);
            default:
                return false;
        }
    };

    return { can, role };
};
