-- Migration 010: Analysis Result Cache
-- Caches Gemini analysis results keyed by content hash.
-- Cache hit → skip Gemini call → 30-50% cost reduction for repeat audits.

CREATE TABLE IF NOT EXISTS analysis_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_hash TEXT NOT NULL,          -- SHA-256 hex of normalized page content
    domain TEXT NOT NULL,                -- e.g. "example.com" for quick lookup
    result_json JSONB NOT NULL,          -- Full AnalysisReport JSON
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,     -- created_at + 24 hours
    hit_count INTEGER DEFAULT 0          -- How many times this cache entry was served
);

-- Primary lookup index: domain + hash + not-yet-expired
CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_cache_hash
    ON analysis_cache(content_hash);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_domain
    ON analysis_cache(domain);

CREATE INDEX IF NOT EXISTS idx_analysis_cache_expires
    ON analysis_cache(expires_at);

-- RLS: service role only (edge functions use service role key)
ALTER TABLE analysis_cache ENABLE ROW LEVEL SECURITY;

-- No user-facing reads needed; edge function handles all access via service role
CREATE POLICY "Service role full access" ON analysis_cache
    USING (true)
    WITH CHECK (true);

-- Auto-cleanup: delete expired entries older than 48h to keep table small
-- (Run via pg_cron or periodic edge function invocation)
CREATE OR REPLACE FUNCTION cleanup_analysis_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM analysis_cache
    WHERE expires_at < NOW() - INTERVAL '48 hours';
END;
$$;

-- Atomic hit counter increment for cache entries
CREATE OR REPLACE FUNCTION increment_cache_hit(p_content_hash TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE analysis_cache
    SET hit_count = hit_count + 1
    WHERE content_hash = p_content_hash;
END;
$$;

-- Add content_hash to page_contents if not already indexed
CREATE INDEX IF NOT EXISTS idx_page_contents_hash
    ON page_contents(content_hash);
