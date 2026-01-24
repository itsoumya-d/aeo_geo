-- Migration 018: Granular RBAC (Role-Based Access Control)
-- Implements a flexible permission system for Enterprise scalability

-- ============================================
-- 1. Permissions Table
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY, -- e.g. 'audit.create', 'billing.manage'
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- e.g. 'Audit', 'Team', 'Billing'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Roles Table
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations ON DELETE CASCADE, -- NULL for system roles
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- ============================================
-- 3. Role Permissions (Mapping)
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles ON DELETE CASCADE,
    permission_id TEXT REFERENCES permissions ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================
-- 4. Seed Standard Roles & Permissions
-- ============================================
INSERT INTO permissions (id, name, description, category) VALUES
    ('audit.read', 'View Audits', 'Ability to view visibility reports and scores', 'Audit'),
    ('audit.create', 'Run Audits', 'Ability to initiate new site audits', 'Audit'),
    ('audit.delete', 'Delete Audits', 'Ability to remove audit history', 'Audit'),
    ('competitor.manage', 'Manage Competitors', 'Add or remove competitor domains', 'Benchmark'),
    ('report.manage', 'Manage Scheduled Reports', 'Configure automated email reports', 'Reporting'),
    ('team.view', 'View Team', 'View organization members', 'Team'),
    ('team.manage', 'Manage Team', 'Invite or remove team members', 'Team'),
    ('billing.manage', 'Manage Billing', 'View invoices and change plans', 'Billing'),
    ('settings.manage', 'Edit Settings', 'Change organization profile and domains', 'Settings')
ON CONFLICT (id) DO NOTHING;

-- Seed default roles for a global/template level
-- NOTE: In a multi-tenant setup, we usually clone these for each org or use system roles
INSERT INTO roles (name, description, is_system) VALUES
    ('Owner', 'Full organization access including billing and team management', TRUE),
    ('Admin', 'Complete dashboard access excluding billing', TRUE),
    ('Editor', 'Can run audits and manage competitors but cannot invite members', TRUE),
    ('Viewer', 'Read-only access to all reports', TRUE)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Map permissions to System Roles
-- This would typically be a script, but we'll do the basics here
-- For simplicitiy in this migration, we'll use a subquery for the newly created roles
DO $$
DECLARE
    owner_id UUID;
    admin_id UUID;
    editor_id UUID;
    viewer_id UUID;
BEGIN
    SELECT id INTO owner_id FROM roles WHERE name = 'Owner' AND is_system = TRUE;
    SELECT id INTO admin_id FROM roles WHERE name = 'Admin' AND is_system = TRUE;
    SELECT id INTO editor_id FROM roles WHERE name = 'Editor' AND is_system = TRUE;
    SELECT id INTO viewer_id FROM roles WHERE name = 'Viewer' AND is_system = TRUE;

    -- Owner: All
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT owner_id, id FROM permissions ON CONFLICT DO NOTHING;

    -- Admin: Everything except billing.manage
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT admin_id, id FROM permissions WHERE id != 'billing.manage' ON CONFLICT DO NOTHING;

    -- Editor: Audit, Competitor, Report, Team View
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT editor_id, id FROM permissions 
    WHERE id LIKE 'audit.%' OR id LIKE 'competitor.%' OR id LIKE 'report.%' OR id = 'team.view'
    ON CONFLICT DO NOTHING;

    -- Viewer: Only read permissions
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT viewer_id, id FROM permissions WHERE id LIKE '%.read' OR id = 'team.view' ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 5. RLS
-- ============================================
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read permissions" ON permissions FOR SELECT USING (true);
CREATE POLICY "Users can view roles in their org" ON roles FOR SELECT USING (
    organization_id IS NULL OR organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Users can view role mapping in their org" ON role_permissions FOR SELECT USING (
    role_id IN (SELECT id FROM roles WHERE organization_id IS NULL OR organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()))
);

-- ============================================
-- 6. RPC: Check User Permission
-- ============================================
CREATE OR REPLACE FUNCTION check_user_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users u
        JOIN roles r ON (r.organization_id = u.organization_id OR (r.is_system = TRUE AND r.name = INITCAP(u.role)))
        JOIN role_permissions rp ON rp.role_id = r.id
        WHERE u.id = p_user_id AND rp.permission_id = p_permission
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
