-- Migration 014: Google Search Console (GSC) Sync
-- Integration for traditional SEO performance data

CREATE TABLE IF NOT EXISTS gsc_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

CREATE TABLE IF NOT EXISTS gsc_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain_url TEXT NOT NULL,
    date DATE NOT NULL,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    ctr FLOAT DEFAULT 0,
    position FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, domain_url, date)
);

-- Enable RLS
ALTER TABLE gsc_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for gsc_auth (only user's own org)
CREATE POLICY "Users can manage own GSC auth" ON gsc_auth
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- Policies for gsc_metrics (read-only for members, manage for admins)
CREATE POLICY "Users can read own GSC metrics" ON gsc_metrics
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_gsc_metrics_domain_date ON gsc_metrics(organization_id, domain_url, date);
