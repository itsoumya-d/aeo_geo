import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveAuditDraft, loadAuditDraft, clearAuditDraft } from './auditDraft';
import { AssetType, AnalysisStatus } from '../types';

const PREFIX = 'cognition:auditDraft:';

const mockDraft = {
    assets: [
        { id: '1', url: 'https://example.com', type: AssetType.WEBSITE, status: AnalysisStatus.IDLE }
    ],
    createdAt: Date.now(),
};

describe('auditDraft utilities', () => {
    function clearPrefixedKeys() {
        // Manually remove our prefix-scoped keys; avoids depending on localStorage.clear()
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith(PREFIX)) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    }

    beforeEach(() => {
        clearPrefixedKeys();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        clearPrefixedKeys();
    });

    describe('saveAuditDraft', () => {
        it('writes draft to localStorage under the correct key', () => {
            saveAuditDraft('audit-123', mockDraft);
            const raw = localStorage.getItem(`${PREFIX}audit-123`);
            expect(raw).not.toBeNull();
            const parsed = JSON.parse(raw!);
            expect(parsed.createdAt).toBe(mockDraft.createdAt);
        });

        it('does not throw when localStorage is unavailable', () => {
            const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });

            expect(() => saveAuditDraft('audit-123', mockDraft)).not.toThrow();
            spy.mockRestore();
        });
    });

    describe('loadAuditDraft', () => {
        it('returns the saved draft', () => {
            saveAuditDraft('audit-123', mockDraft);
            const draft = loadAuditDraft('audit-123');
            expect(draft).not.toBeNull();
            expect(draft!.createdAt).toBe(mockDraft.createdAt);
        });

        it('returns null when no draft exists', () => {
            expect(loadAuditDraft('nonexistent-id')).toBeNull();
        });

        it('returns null for corrupted JSON', () => {
            localStorage.setItem(`${PREFIX}bad-id`, 'not-valid-json{{{');
            expect(loadAuditDraft('bad-id')).toBeNull();
        });

        it('returns null when localStorage.getItem throws', () => {
            const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('Storage unavailable');
            });
            expect(loadAuditDraft('audit-123')).toBeNull();
            spy.mockRestore();
        });
    });

    describe('clearAuditDraft', () => {
        it('removes the draft from localStorage', () => {
            saveAuditDraft('audit-123', mockDraft);
            clearAuditDraft('audit-123');
            expect(localStorage.getItem(`${PREFIX}audit-123`)).toBeNull();
        });

        it('does not throw when the key does not exist', () => {
            expect(() => clearAuditDraft('ghost-id')).not.toThrow();
        });

        it('does not throw when localStorage.removeItem throws', () => {
            const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
                throw new Error('Storage unavailable');
            });
            expect(() => clearAuditDraft('audit-123')).not.toThrow();
            spy.mockRestore();
        });
    });

    describe('key isolation', () => {
        it('uses distinct keys for different audit IDs', () => {
            const draft1 = { ...mockDraft, createdAt: 1 };
            const draft2 = { ...mockDraft, createdAt: 2 };
            saveAuditDraft('a1', draft1);
            saveAuditDraft('a2', draft2);

            expect(loadAuditDraft('a1')!.createdAt).toBe(1);
            expect(loadAuditDraft('a2')!.createdAt).toBe(2);
        });

        it('clearing one audit does not affect another', () => {
            saveAuditDraft('a1', mockDraft);
            saveAuditDraft('a2', mockDraft);
            clearAuditDraft('a1');

            expect(loadAuditDraft('a1')).toBeNull();
            expect(loadAuditDraft('a2')).not.toBeNull();
        });
    });
});
