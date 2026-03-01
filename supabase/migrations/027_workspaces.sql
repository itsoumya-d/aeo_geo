-- Migration: Multi-Brand Workspace Management
-- Enables agencies to manage multiple client brands within one organization
-- Each workspace isolates: audits, domains, competitors, scheduled audits, reports

-- ============================================================================
-- 1. Create workspaces table
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)  -- Prevent duplicate workspace names in org
);

-- Create index for fast organization lookups
CREATE INDEX idx_workspaces_organization_id ON workspaces(organization_id);

-- ============================================================================
-- 2. Add workspace_id to existing tables (nullable for backward compatibility)
-- ============================================================================

-- Audits
ALTER TABLE audits ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_audits_workspace_id ON audits(workspace_id);

-- Domains
ALTER TABLE domains ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_domains_workspace_id ON domains(workspace_id);

-- Competitor domains
ALTER TABLE competitor_domains ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_competitor_domains_workspace_id ON competitor_domains(workspace_id);

-- Competitor benchmarks
ALTER TABLE competitor_benchmarks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_competitor_benchmarks_workspace_id ON competitor_benchmarks(workspace_id);

-- Scheduled audits
ALTER TABLE scheduled_audits ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_scheduled_audits_workspace_id ON scheduled_audits(workspace_id);

-- Report templates (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_templates') THEN
        ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_report_templates_workspace_id ON report_templates(workspace_id);
    END IF;
END $$;

-- ============================================================================
-- 3. Create default workspace for existing organizations (migration helper)
-- ============================================================================

-- Insert default workspace for each existing organization
INSERT INTO workspaces (organization_id, name, description, created_at)
SELECT
    id,
    name || ' - Default',
    'Default workspace created during migration',
    NOW()
FROM organizations
WHERE NOT EXISTS (
    SELECT 1 FROM workspaces WHERE workspaces.organization_id = organizations.id
);

-- ============================================================================
-- 4. Backfill workspace_id for existing data
-- ============================================================================

-- Update audits to point to default workspace
UPDATE audits a
SET workspace_id = w.id
FROM workspaces w
WHERE a.organization_id = w.organization_id
AND a.workspace_id IS NULL
AND w.name LIKE '% - Default';

-- Update domains to point to default workspace
UPDATE domains d
SET workspace_id = w.id
FROM workspaces w
WHERE d.organization_id = w.organization_id
AND d.workspace_id IS NULL
AND w.name LIKE '% - Default';

-- Update competitor_domains to point to default workspace
UPDATE competitor_domains cd
SET workspace_id = w.id
FROM workspaces w
WHERE cd.organization_id = w.organization_id
AND cd.workspace_id IS NULL
AND w.name LIKE '% - Default';

-- Update competitor_benchmarks to point to default workspace
UPDATE competitor_benchmarks cb
SET workspace_id = w.id
FROM workspaces w
WHERE cb.organization_id = w.organization_id
AND cb.workspace_id IS NULL
AND w.name LIKE '% - Default';

-- Update scheduled_audits to point to default workspace
UPDATE scheduled_audits sa
SET workspace_id = w.id
FROM workspaces w
WHERE sa.organization_id = w.organization_id
AND sa.workspace_id IS NULL
AND w.name LIKE '% - Default';

-- Update report_templates if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_templates') THEN
        EXECUTE 'UPDATE report_templates rt
                 SET workspace_id = w.id
                 FROM workspaces w
                 WHERE rt.organization_id = w.organization_id
                 AND rt.workspace_id IS NULL
                 AND w.name LIKE ''% - Default''';
    END IF;
END $$;

-- ============================================================================
-- 5. Optional: workspace_members table (for granular workspace-level permissions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (workspace_id, user_id)
);

-- Index for fast user workspace lookups
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);

-- ============================================================================
-- 6. Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all workspaces in their organization
CREATE POLICY "Users can read org workspaces"
ON workspaces
FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    )
);

-- Policy: Only org admins/owners can create workspaces
CREATE POLICY "Admins can create workspaces"
ON workspaces
FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Policy: Only org admins/owners can update workspaces
CREATE POLICY "Admins can update workspaces"
ON workspaces
FOR UPDATE
USING (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Policy: Only org admins/owners can delete workspaces
CREATE POLICY "Admins can delete workspaces"
ON workspaces
FOR DELETE
USING (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Enable RLS on workspace_members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read workspace members for workspaces they belong to
CREATE POLICY "Users can read workspace members"
ON workspace_members
FOR SELECT
USING (
    workspace_id IN (
        SELECT id FROM workspaces
        WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    )
);

-- Policy: Only workspace admins can manage members
CREATE POLICY "Workspace admins can manage members"
ON workspace_members
FOR ALL
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    workspace_id IN (
        SELECT id FROM workspaces
        WHERE organization_id IN (
            SELECT organization_id FROM users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
);

-- ============================================================================
-- 7. Update RLS policies on scoped tables to include workspace filtering
-- ============================================================================

-- Note: Existing policies on audits, domains, etc. already filter by organization_id
-- We add additional checks for workspace_id where applicable

-- Drop existing audit policies if needed and recreate with workspace filtering
DO $$
BEGIN
    -- Drop old policies if they exist
    DROP POLICY IF EXISTS "Users can view organization audits" ON audits;
    DROP POLICY IF EXISTS "Users can create organization audits" ON audits;
    DROP POLICY IF EXISTS "Users can update organization audits" ON audits;

    -- Recreate with workspace support
    CREATE POLICY "Users can view organization audits"
    ON audits
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND (
            workspace_id IS NULL  -- Legacy audits without workspace
            OR
            workspace_id IN (
                SELECT id FROM workspaces
                WHERE organization_id IN (
                    SELECT organization_id FROM users WHERE id = auth.uid()
                )
            )
        )
    );

    CREATE POLICY "Users can create organization audits"
    ON audits
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;  -- Ignore if policies already exist
END $$;

-- ============================================================================
-- 8. Helper functions
-- ============================================================================

-- Function: Get default workspace for an organization
CREATE OR REPLACE FUNCTION get_default_workspace(org_id UUID)
RETURNS UUID AS $$
DECLARE
    workspace_id UUID;
BEGIN
    SELECT id INTO workspace_id
    FROM workspaces
    WHERE organization_id = org_id
    ORDER BY created_at ASC
    LIMIT 1;

    RETURN workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if workspace belongs to organization
CREATE OR REPLACE FUNCTION workspace_belongs_to_org(workspace_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    belongs BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM workspaces
        WHERE id = workspace_id AND organization_id = org_id
    ) INTO belongs;

    RETURN belongs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get workspace count for organization
CREATE OR REPLACE FUNCTION get_workspace_count(org_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*) INTO count
    FROM workspaces
    WHERE organization_id = org_id;

    RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. Triggers for updated_at timestamp
-- ============================================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update workspaces.updated_at on UPDATE
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_updated_at();

-- ============================================================================
-- 10. Comments for documentation
-- ============================================================================

COMMENT ON TABLE workspaces IS 'Multi-brand workspaces within organizations. Enables agencies to manage multiple client brands with isolated data.';
COMMENT ON COLUMN workspaces.organization_id IS 'Parent organization owning this workspace';
COMMENT ON COLUMN workspaces.name IS 'Workspace display name (must be unique within organization)';
COMMENT ON COLUMN workspaces.description IS 'Optional workspace description for user context';
COMMENT ON COLUMN workspaces.icon_url IS 'Optional custom icon/logo URL for workspace branding';

COMMENT ON TABLE workspace_members IS 'Workspace-level permissions. Allows granular access control within workspaces (optional feature).';

COMMENT ON FUNCTION get_default_workspace(UUID) IS 'Returns the first (oldest) workspace for an organization, typically used as default.';
COMMENT ON FUNCTION workspace_belongs_to_org(UUID, UUID) IS 'Validates that a workspace belongs to a specific organization.';
COMMENT ON FUNCTION get_workspace_count(UUID) IS 'Returns total number of workspaces for an organization (for plan tier limits).';
