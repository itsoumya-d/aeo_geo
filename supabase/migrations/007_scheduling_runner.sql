-- Enable the pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a schema for our scheduling logs/logic if it doesn't exist
CREATE SCHEMA IF NOT EXISTS scheduling;

-- Function to trigger the background audit runner
-- Needs to be called with: SELECT scheduling.trigger_scheduled_audits();
CREATE OR REPLACE FUNCTION scheduling.trigger_scheduled_audits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url text;
  anon_key text;
BEGIN
  -- We'll assume these are set in the database or passed from Vault 
  -- For local development/simplicity, we pull from a hypothetical config table or use placeholders
  -- In production, use your actual Supabase URL and Anon Key
  edge_function_url := (SELECT value FROM secrets.vault WHERE name = 'SUPABASE_URL') || '/functions/v1/process-scheduled-audits';
  anon_key := (SELECT value FROM secrets.vault WHERE name = 'SUPABASE_ANON_KEY');

  IF edge_function_url IS NOT NULL AND anon_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := '{}'
    );
  END IF;
END;
$$;

-- Schedule the runner to check every hour
-- We check for "due" audits and process them in the Edge Function
SELECT cron.schedule(
  'process-scheduled-audits-job', -- unique job name
  '0 * * * *',                   -- every hour at minute 0
  'SELECT scheduling.trigger_scheduled_audits();'
);

-- Documentation for the user:
-- You MUST set the SUPABASE_URL and SUPABASE_ANON_KEY in your Supabase Vault or as DB settings
-- for the above function to work correctly.
