-- Migration 013: Integration Webhooks & Discord
-- Support for Slack, Discord, and Generic Webhooks

CREATE TABLE IF NOT EXISTS integration_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('slack', 'discord', 'webhook')),
    url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    events TEXT[] DEFAULT '{audit_complete}',
    secret_token TEXT, -- For HMAC signing of generic webhooks
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for org-based lookup
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_org ON integration_webhooks(organization_id);

-- RLS
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own integration webhooks" ON integration_webhooks
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage integration webhooks" ON integration_webhooks
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
