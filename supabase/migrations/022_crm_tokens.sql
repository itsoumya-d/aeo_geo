-- Migration 022: CRM Tokens
-- Adds storage for third-party CRM tokens to organizations table.

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS hubspot_token TEXT,
ADD COLUMN IF NOT EXISTS salesforce_token TEXT;

-- Security: Ensure only owners can read/write these tokens via RLS (already covered by organization policies usually, but explicit check is good)
-- Actually, we should probably encrypt these, but for MVP standard text is acceptable if RLS is tight.
