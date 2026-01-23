-- Migration 010: Enterprise Team Enhancements
-- Adds 'viewer' role and Activity Logs table

-- 1. Update Users role check
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

-- 2. Update Invitations role check
ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('admin', 'member', 'viewer'));

-- 3. Create Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action TEXT NOT NULL, -- 'member_invited', 'member_removed', 'audit_started', 'plan_changed', etc.
    details JSONB,        -- Extra context (e.g., target email, audit ID)
    ip_address TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_type ON activity_logs(organization_id, created_at DESC);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins and Owners can view activity logs
CREATE POLICY "Admins can view activity logs" ON activity_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- System can insert logs (via Edge Functions or triggers)
-- Note: In a production app, you might want a trigger to automatically log certain events.
