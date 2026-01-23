-- Migration 011: API Key Usage Tracking
-- Adds usage metrics and rate limiting fields to api_keys table

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rate_limit INTEGER DEFAULT 1000; -- Daily limit
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day';

-- Create an API Usage Log table for historical analytics
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key_date ON api_usage_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_org ON api_usage_logs(organization_id);

-- RLS for usage logs
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view org api usage" ON api_usage_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
