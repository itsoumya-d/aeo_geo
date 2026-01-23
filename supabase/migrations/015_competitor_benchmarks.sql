-- Cognition AI Visibility Engine - Competitor Benchmarks Schema
-- Migration 015: Competitor tracking and benchmarking

-- ============================================
-- Competitor Benchmarks Table
-- Stores visibility snapshots for competitor domains
-- ============================================
CREATE TABLE IF NOT EXISTS competitor_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    competitor_domain TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ChatGPT', 'Gemini', 'Claude', 'Perplexity', 'Overall')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    keywords_tracked INTEGER DEFAULT 0,
    citations_found INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Competitor Domains Table
-- Tracks which competitors to monitor per organization
-- ============================================
CREATE TABLE IF NOT EXISTS competitor_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    domain TEXT NOT NULL,
    name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_audited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, domain)
);

-- ============================================
-- Usage Analytics Table
-- Tracks feature usage for insights and billing
-- ============================================
CREATE TABLE IF NOT EXISTS usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations ON DELETE CASCADE,
    user_id UUID REFERENCES users ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_category TEXT DEFAULT 'general',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_competitor_benchmarks_org ON competitor_benchmarks(organization_id);
CREATE INDEX IF NOT EXISTS idx_competitor_benchmarks_domain ON competitor_benchmarks(competitor_domain);
CREATE INDEX IF NOT EXISTS idx_competitor_benchmarks_captured ON competitor_benchmarks(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_domains_org ON competitor_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_org ON usage_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_type ON usage_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_created ON usage_analytics(created_at DESC);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE competitor_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- Competitor benchmarks - org members can read, admins can manage
CREATE POLICY "Users can read org benchmarks" ON competitor_benchmarks
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage benchmarks" ON competitor_benchmarks
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Competitor domains - org members can read, admins can manage
CREATE POLICY "Users can read org competitors" ON competitor_domains
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage competitors" ON competitor_domains
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Usage analytics - org members can read, system can insert (via service role)
CREATE POLICY "Users can read org analytics" ON usage_analytics
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert own analytics" ON usage_analytics
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- ============================================
-- Helper Functions
-- ============================================

-- Function to get competitor comparison summary
CREATE OR REPLACE FUNCTION get_competitor_summary(p_org_id UUID)
RETURNS TABLE(
    domain TEXT,
    latest_score INTEGER,
    score_change INTEGER,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_scores AS (
        SELECT DISTINCT ON (competitor_domain)
            competitor_domain,
            score,
            captured_at
        FROM competitor_benchmarks
        WHERE organization_id = p_org_id
          AND platform = 'Overall'
        ORDER BY competitor_domain, captured_at DESC
    ),
    previous_scores AS (
        SELECT DISTINCT ON (competitor_domain)
            competitor_domain,
            score
        FROM competitor_benchmarks
        WHERE organization_id = p_org_id
          AND platform = 'Overall'
          AND captured_at < (SELECT MAX(captured_at) FROM competitor_benchmarks WHERE organization_id = p_org_id)
        ORDER BY competitor_domain, captured_at DESC
    )
    SELECT 
        ls.competitor_domain,
        ls.score,
        COALESCE(ls.score - ps.score, 0),
        ls.captured_at
    FROM latest_scores ls
    LEFT JOIN previous_scores ps ON ls.competitor_domain = ps.competitor_domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track usage event
CREATE OR REPLACE FUNCTION track_usage(
    p_org_id UUID,
    p_user_id UUID,
    p_event_type TEXT,
    p_category TEXT DEFAULT 'general',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO usage_analytics (organization_id, user_id, event_type, event_category, metadata)
    VALUES (p_org_id, p_user_id, p_event_type, p_category, p_metadata)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
