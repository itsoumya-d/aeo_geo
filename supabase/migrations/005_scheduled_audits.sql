-- Scheduled Audits Schema for Cognition AI Visibility Engine
-- Enables automated recurring audits

-- ============================================
-- Scheduled Audits Table
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    domain_url TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    next_run_at TIMESTAMPTZ NOT NULL,
    last_run_at TIMESTAMPTZ,
    enabled BOOLEAN DEFAULT TRUE,
    notify_email BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scheduled audits
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_org ON scheduled_audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_next_run ON scheduled_audits(next_run_at) WHERE enabled = true;

-- Enable RLS
ALTER TABLE scheduled_audits ENABLE ROW LEVEL SECURITY;

-- Policies for scheduled audits
CREATE POLICY "Users can read own org scheduled audits" ON scheduled_audits
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Owners and admins can create scheduled audits" ON scheduled_audits
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners and admins can update scheduled audits" ON scheduled_audits
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners and admins can delete scheduled audits" ON scheduled_audits
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- Audit Notifications Table
-- ============================================
CREATE TABLE IF NOT EXISTS audit_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('email', 'webhook', 'slack')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    recipient TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_audit_notifications_audit ON audit_notifications(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_notifications_status ON audit_notifications(status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE audit_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can read own org notifications" ON audit_notifications
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );
