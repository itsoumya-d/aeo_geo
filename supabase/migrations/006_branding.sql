-- Organization Branding Schema for Cognition AI Visibility Engine
-- Enables white-label customization for Agency/Enterprise plans

-- ============================================
-- Organization Branding Table
-- ============================================
CREATE TABLE IF NOT EXISTS organization_branding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations ON DELETE CASCADE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3b82f6',
    secondary_color TEXT DEFAULT '#8b5cf6',
    company_name TEXT,
    hide_cognition_branding BOOLEAN DEFAULT FALSE,
    custom_font TEXT,
    report_footer_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_org_branding_org ON organization_branding(organization_id);

-- Enable RLS
ALTER TABLE organization_branding ENABLE ROW LEVEL SECURITY;

-- Policies for branding
CREATE POLICY "Users can read own org branding" ON organization_branding
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Owners and admins can manage branding" ON organization_branding
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
