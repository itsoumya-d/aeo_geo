-- Migration 008: SaaS Foundation Layers
-- Enhancing the schema to support detailed tracking, competitors, and keyword history.

-- 1. Upgrade 'domains' to act as full 'Projects'
ALTER TABLE domains ADD COLUMN IF NOT EXISTS competitors TEXT[] DEFAULT '{}';
ALTER TABLE domains ADD COLUMN IF NOT EXISTS target_keywords TEXT[] DEFAULT '{}';
ALTER TABLE domains ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- 2. Create Keyword Rankings table for historical tracking
CREATE TABLE IF NOT EXISTS keyword_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    
    keyword TEXT NOT NULL,
    
    -- Platform metrics
    platform TEXT NOT NULL, -- 'ChatGPT', 'Gemini', 'Perplexity', 'Claude'
    rank INTEGER,           -- e.g., 1 (top rec), 5 (in list), 0 (not found)
    citation_found BOOLEAN DEFAULT FALSE,
    sentiment_score FLOAT,  -- -1 to 1 descrbing how the brand was mentioned
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_audit ON keyword_rankings(audit_id);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_keyword ON keyword_rankings(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_platform ON keyword_rankings(platform);

-- RLS
ALTER TABLE keyword_rankings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read rankings if they own the parent audit
CREATE POLICY "Users can read own keyword rankings" ON keyword_rankings
    FOR SELECT USING (
        audit_id IN (
            SELECT id FROM audits WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );
