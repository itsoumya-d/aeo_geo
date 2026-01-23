-- Migration 003: Stripe Additions

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' 
CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing'));

-- Add an index for faster lookups by stripe customer id
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_customer ON organizations(stripe_customer_id);
