-- Migration 002: Content Storage & Usage Metering

-- ============================================
-- Page Contents Table (Stores the real crawled data)
-- ============================================
CREATE TABLE IF NOT EXISTS page_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_page_id UUID REFERENCES audit_pages(id) ON DELETE CASCADE,
    
    -- Content fields
    html_content TEXT,           -- Raw HTML (optional, maybe too heavy)
    markdown_content TEXT,       -- Cleaned Markdown for LLM (Critical)
    metadata JSONB,              -- Meta tags, headers, etc.
    
    -- Vector fields (using pgvector if available, otherwise just placeholder columns)
    -- We assume pgvector might not be enabled yet, so we store embedding as array first
    embedding_768 vector(768),   -- For Gemini/OpenAI embeddings
    
    crawled_at TIMESTAMPTZ DEFAULT NOW(),
    content_hash TEXT            -- For detecting changes
);

-- ============================================
-- Billing Usage Logs (For metering)
-- ============================================
CREATE TABLE IF NOT EXISTS billing_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
    
    activity_type TEXT NOT NULL CHECK (activity_type IN ('CRAWL', 'REWRITE', 'ANALYSIS')),
    credits_deducted INTEGER NOT NULL,
    provider_cost_est FLOAT,     -- Estimated cost in USD (e.g., 0.05)
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexing
-- ============================================
CREATE INDEX IF NOT EXISTS idx_page_contents_audit_page ON page_contents(audit_page_id);
CREATE INDEX IF NOT EXISTS idx_billing_org ON billing_usage(organization_id);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE page_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_usage ENABLE ROW LEVEL SECURITY;

-- Users can read content for their own pages
CREATE POLICY "Users can read own page content" ON page_contents
    FOR SELECT USING (
        audit_page_id IN (
            SELECT id FROM audit_pages WHERE audit_id IN (
                SELECT id FROM audits WHERE organization_id IN (
                    SELECT organization_id FROM users WHERE id = auth.uid()
                )
            )
        )
    );

-- Users can read their own billing usage
CREATE POLICY "Users can read own billing usage" ON billing_usage
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );
