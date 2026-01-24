-- Migration 026: Performance Optimization Indexes
-- Adds indexes to high-volume tables to speed up common queries.

-- Index for Competitor Benchmarks time-series queries
-- Used in: getCompetitorHistory, getCompetitorBenchmarks (ordering)
CREATE INDEX IF NOT EXISTS idx_competitor_benchmarks_captured_at ON competitor_benchmarks(captured_at DESC);

-- Index for Audits by domain
-- Used in: handleAutoAudit (finding previous audit), specific domain history
CREATE INDEX IF NOT EXISTS idx_audits_domain_url ON audits(domain_url);

-- Index for Audit Pages by url
-- Used in: Page lookups
CREATE INDEX IF NOT EXISTS idx_audit_pages_url ON audit_pages(url);

-- Index for Content Embeddings by metadata type (if needed in future)
CREATE INDEX IF NOT EXISTS idx_content_embeddings_metadata_gin ON content_embeddings USING GIN (metadata);
