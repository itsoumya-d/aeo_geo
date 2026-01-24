-- Migration 019: SSO Configurations
-- Stores SAML metadata for Enterprise customers

CREATE TABLE IF NOT EXISTS sso_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    entity_id TEXT NOT NULL,
    metadata_url TEXT,
    metadata_xml TEXT,
    attribute_mapping JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- RLS
ALTER TABLE sso_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage SSO" ON sso_configurations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can view SSO" ON sso_configurations
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );
