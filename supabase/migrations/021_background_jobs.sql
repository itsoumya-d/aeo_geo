-- Migration 021: Background Job Queue
-- Enables asynchronous processing for long-running tasks like large crawls.

CREATE TYPE job_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL, -- 'CRAWL', 'ANALYZE_BATCH', 'REPORT_GEN'
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status job_status DEFAULT 'PENDING',
    result JSONB,
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Index for worker polling
CREATE INDEX idx_jobs_status ON background_jobs(status, created_at) WHERE status = 'PENDING';
CREATE INDEX idx_jobs_org ON background_jobs(organization_id);

-- RLS
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON background_jobs
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Service role manages jobs" ON background_jobs
    USING (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE TRIGGER update_background_jobs_modtime
    BEFORE UPDATE ON background_jobs
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- RPC to pick a job (atomic lock)
CREATE OR REPLACE FUNCTION pick_next_job(p_worker_id TEXT DEFAULT 'worker-1')
RETURNS TABLE (
    id UUID,
    job_type TEXT,
    payload JSONB,
    organization_id UUID
) AS $$
DECLARE
    v_job_id UUID;
BEGIN
    -- Select actionable job with Row Lock (SKIP LOCKED) for concurrency safety
    SELECT id INTO v_job_id
    FROM background_jobs
    WHERE status = 'PENDING'
      AND attempts < max_attempts
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_job_id IS NOT NULL THEN
        UPDATE background_jobs
        SET status = 'PROCESSING',
            updated_at = NOW(),
            attempts = attempts + 1
        WHERE background_jobs.id = v_job_id
        RETURNING background_jobs.id, background_jobs.job_type, background_jobs.payload, background_jobs.organization_id
        INTO id, job_type, payload, organization_id;
        
        RETURN NEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
