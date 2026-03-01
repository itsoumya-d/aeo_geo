import { Asset, DiscoveredPage } from '../types';

export interface AuditDraft {
    assets: Asset[];
    discoveredPages?: DiscoveredPage[];
    createdAt: number;
}

const PREFIX = 'cognition:auditDraft:';

export function saveAuditDraft(auditId: string, draft: AuditDraft) {
    try {
        localStorage.setItem(`${PREFIX}${auditId}`, JSON.stringify(draft));
    } catch {
        // Ignore storage errors (private mode, quotas)
    }
}

export function loadAuditDraft(auditId: string): AuditDraft | null {
    try {
        const raw = localStorage.getItem(`${PREFIX}${auditId}`);
        if (!raw) return null;
        return JSON.parse(raw) as AuditDraft;
    } catch {
        return null;
    }
}

export function clearAuditDraft(auditId: string) {
    try {
        localStorage.removeItem(`${PREFIX}${auditId}`);
    } catch {
        // Ignore
    }
}

