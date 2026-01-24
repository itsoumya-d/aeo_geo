
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamSettings } from './TeamSettings';
import * as AuthContext from '../contexts/AuthContext';
import { ToastProvider } from './Toast';

// Mock Auth Context
const mockUseAuth = vi.spyOn(AuthContext, 'useAuth');

// Mock Subcomponents to avoid Supabase calls
vi.mock('./SSOConfig', () => ({
    SSOConfig: () => <div data-testid="sso-config">SSO Config Panel</div>
}));

// Mock Supabase to handle data fetching
const mockSupabaseChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null })
};

vi.mock('../services/supabase', () => ({
    supabase: {
        from: vi.fn(() => mockSupabaseChain)
    }
}));

describe('TeamSettings Component Permissions', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithProviders = (ui: React.ReactNode) => {
        return render(
            <ToastProvider>
                {ui}
            </ToastProvider>
        );
    };

    it('renders invite form for Owners/Admins on paid plan', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'admin-id' },
            profile: { role: 'owner' },
            organization: { id: 'org-id', plan: 'agency' },
            loading: false
        } as any);

        renderWithProviders(<TeamSettings />);

        // Debug output
        screen.debug();

        // Wait significantly for loader to clear
        await screen.findByText('Team Members', {}, { timeout: 3000 }).catch(() => {
            console.log("Failed to find Team Members. DOM state:");
            screen.debug();
        });

        expect(screen.getByPlaceholderText('colleague@company.com')).toBeInTheDocument();
        expect(screen.getByText('Invite')).toBeInTheDocument();
    });

    it('shows upgrade prompt for Free/Starter plan', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'owner-id' },
            profile: { role: 'owner' },
            organization: { id: 'org-id', plan: 'free' },
            loading: false
        } as any);

        renderWithProviders(<TeamSettings />);

        expect(await screen.findByText('Unlock Team Management')).toBeInTheDocument();
        expect(await screen.findByText('Upgrade Now')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('colleague@company.com')).not.toBeInTheDocument();
    });

    it('hides invite form for Members', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'member-id' },
            profile: { role: 'member' },
            organization: { id: 'org-id', plan: 'agency' },
            loading: false
        } as any);

        renderWithProviders(<TeamSettings />);

        // Wait for loading to finish
        expect(await screen.findByText('Team Members')).toBeInTheDocument();

        expect(screen.queryByPlaceholderText('colleague@company.com')).not.toBeInTheDocument();
        expect(screen.getByText('Only team owners and admins can invite or manage team members.')).toBeInTheDocument();
    });

    it('renders SSO config tab', async () => {
        mockUseAuth.mockReturnValue({
            user: { id: 'owner-id' },
            profile: { role: 'owner' },
            organization: { id: 'org-id', plan: 'enterprise' },
            loading: false
        } as any);

        renderWithProviders(<TeamSettings />);

        expect(await screen.findByText('Security')).toBeInTheDocument();
    });
});
