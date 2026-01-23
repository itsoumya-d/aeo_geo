-- Migration 017: Enterprise Audit Logging
-- Implementation follows best practices for immutable, append-only security ledgers

-- ============================================
-- Audit Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    actor JSONB NOT NULL, -- {id, type: 'user'|'system'|'api_key', name, email}
    action TEXT NOT NULL, -- e.g. 'audit.created', 'member.invited', 'billing.updated'
    target JSONB NOT NULL, -- {id, type, display_name}
    metadata JSONB DEFAULT '{}', -- Environmental context: IP, UA, location
    changes JSONB, -- {before: {}, after: {}}
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred ON audit_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs((actor->>'id'));

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow reading logs for users in the same organization
CREATE POLICY "Users can view org audit logs" ON audit_logs
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- Allow system and users to insert logs
CREATE POLICY "Users can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- CRITICAL: Prevent UPDATE and DELETE to ensure immutability
-- No "FOR UPDATE" or "FOR DELETE" policies exist, and by default (ENABLE RLS),
-- they are restricted unless explicitly granted. We explicitly do not grant them.

-- ============================================
-- Helper Functions
-- ============================================

-- Function to track a security event (can be called via RPC)
CREATE OR REPLACE FUNCTION log_event(
    p_org_id UUID,
    p_actor JSONB,
    p_action TEXT,
    p_target JSONB,
    p_metadata JSONB DEFAULT '{}',
    p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO audit_logs (organization_id, actor, action, target, metadata, changes)
    VALUES (p_org_id, p_actor, p_action, p_target, p_metadata, p_changes)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
