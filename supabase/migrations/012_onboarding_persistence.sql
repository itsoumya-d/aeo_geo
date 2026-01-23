-- Migration 012: Onboarding Persistence & Persona Tracking
-- This migration adds the necessary tables and columns to track user onboarding progress and personas.

-- 1. Create Onboarding State table
CREATE TABLE IF NOT EXISTS organization_onboarding (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    persona TEXT CHECK (persona IN ('agency', 'brand')),
    current_step INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT FALSE,
    onboarding_data JSONB DEFAULT '{}', -- To store flexible settings like team size, specific goals
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add verification token generation to domains if not present
-- (Already exists in 001_initial_schema.sql as verification_token)

-- 3. Enable RLS
ALTER TABLE organization_onboarding ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Users can read own org onboarding" ON organization_onboarding
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Owners and admins can manage onboarding" ON organization_onboarding
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 5. Trigger for updated_at
CREATE TRIGGER update_organization_onboarding_updated_at
    BEFORE UPDATE ON organization_onboarding
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Helper to check if onboarding is needed
CREATE OR REPLACE VIEW user_onboarding_status AS
    SELECT 
        u.id as user_id,
        u.organization_id,
        o.is_completed,
        o.current_step,
        o.persona
    FROM users u
    LEFT JOIN organization_onboarding o ON u.organization_id = o.organization_id;
