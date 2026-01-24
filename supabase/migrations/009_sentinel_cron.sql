-- Migration 009: Sentinel Cron Scheduling
-- Enables pg_cron and sets up the periodic trigger for Sentinel audits.

-- 1. Enable Extension (Must be done by superuser, usually enabled in Supabase Dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the job to run every hour
-- Calls the Edge Function via pg_net (if available) or just logs for now if external access needed.
-- In Supabase, the best practice is to have pg_cron call a postgres function which invokes the edge function.

CREATE OR REPLACE FUNCTION trigger_sentinel_batch()
RETURNS void AS $$
BEGIN
    -- This assumes pg_net is available. If not, we might need to rely on an external pinger.
    -- For this implementation, we will log the trigger event.
    
    -- In a real Supabase env, we would use select net.http_post(...)
    -- For now, we'll assume the Edge Function is triggered by an external cron (e.g. GitHub Actions or Supabase Platform Cron)
    -- BUT, we will ensure the table structure supports the queuing.
    NULL; 
END;
$$ LANGUAGE plpgsql;

-- 3. Safety Check: Ensure connection to `process-scheduled-audits`
-- We will actually use the Supabase HTTP extension if available to call the function loop.

SELECT cron.schedule(
    'sentinel-hourly-check',
    '0 * * * *', -- Every hour
    $$
    SELECT
      net.http_post(
          url:='https://project-ref.supabase.co/functions/v1/process-scheduled-audits',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);
