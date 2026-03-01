
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getCompetitors,
    addCompetitor,
    removeCompetitor,
    getCompetitorBenchmarks
} from './competitorService';
import { supabase } from './supabase';

// Mock Supabase client
vi.mock('./supabase', () => ({
    supabase: {
        from: vi.fn(),
        auth: {
            getUser: vi.fn()
        }
    }
}));

// Mock services that depend on other things
vi.mock('./auditService', () => ({
    auditLog: vi.fn(),
    getCurrentActor: vi.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' })
}));

vi.mock('./slackService', () => ({
    sendSlackNotification: vi.fn()
}));

const mockCompetitor = {
    id: 'comp-123',
    organization_id: 'org-123',
    domain: 'competitor.com',
    name: 'Competitor',
    is_active: true,
    last_audited_at: null,
    created_at: '2023-01-01T00:00:00Z'
};

const mockSummary = {
    id: 'comp-123',
    domain: 'competitor.com',
    name: 'Competitor',
    latestScore: 85,
    scoreChange: 5,
    lastUpdated: '2023-01-01T00:00:00Z',
    platformScores: [
        { platform: 'Gemini', score: 80 }
    ]
};

describe('competitorService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getCompetitors', () => {
        it('should return active competitors', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-123' } } });

            const usersMock = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-123' } }) };
            const compsMock = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [mockCompetitor], error: null }) };

            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'users') return usersMock;
                return compsMock;
            });

            const result = await getCompetitors();
            expect(result).toHaveLength(1);
            expect(result[0].domain).toBe('competitor.com');
        });

        it('should return empty array on error', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-123' } } });

            const usersMock = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-123' } }) };
            const compsMock = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: null, error: 'Database error' }) };

            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'users') return usersMock;
                return compsMock;
            });

            const result = await getCompetitors();
            expect(result).toEqual([]);
        });
    });

    describe('addCompetitor', () => {
        it('should add valid competitor', async () => {
            // Mock auth user
            (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-123' } } });

            // Mock fetching org
            const orgSelectMock = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { organization_id: 'org-123' } })
                    })
                })
            });

            // Mock insert/upsert
            const insertMock = vi.fn().mockReturnValue({
                upsert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: mockCompetitor, error: null })
                    })
                })
            });

            (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'users') return orgSelectMock();
                if (table === 'competitor_domains') return insertMock();
                return { select: vi.fn() };
            });

            const result = await addCompetitor('https://www.competitor.com');
            expect(result).toEqual(mockCompetitor);
            expect(insertMock().upsert).toHaveBeenCalledWith(expect.objectContaining({
                domain: 'competitor.com', // Should be cleaned
                organization_id: 'org-123'
            }), expect.any(Object));
        });

        it('should return null if user has no org', async () => {
            (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: 'user-no-org' } } });
            const orgSelectMock = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: null }) // No org
                    })
                })
            });
            (supabase.from as any).mockReturnValue(orgSelectMock());

            const result = await addCompetitor('competitor.com');
            expect(result).toBeNull();
        });
    });

    describe('removeCompetitor', () => {
        it('should mark competitor as inactive', async () => {
            const updateMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null })
            });
            (supabase.from as any).mockReturnValue({ update: updateMock });

            const result = await removeCompetitor('comp-123');
            expect(result).toBe(true);
            expect(updateMock).toHaveBeenCalledWith({ is_active: false });
        });

        it('should return false on error', async () => {
            const updateMock = vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: 'Update failed' })
            });
            (supabase.from as any).mockReturnValue({ update: updateMock });

            const result = await removeCompetitor('comp-123');
            expect(result).toBe(false);
        });
    });
});
