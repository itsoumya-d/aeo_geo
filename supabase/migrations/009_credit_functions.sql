-- Migration 009: Secure Credit Management
-- Implements the backend logic for deducting credits and logging usage.

-- 1. Helper Function: Decrement Credits
-- This ensures atomicity and prevents negative balances.
CREATE OR REPLACE FUNCTION decrement_credits(
    p_org_id UUID,
    p_audit_amount INTEGER DEFAULT 0,
    p_rewrite_amount INTEGER DEFAULT 0,
    p_activity_type TEXT DEFAULT 'ANALYSIS',
    p_audit_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_audit_left INTEGER;
    v_rewrite_left INTEGER;
    v_result JSONB;
BEGIN
    -- Get current credits
    SELECT audit_credits_remaining, rewrite_credits_remaining 
    INTO v_audit_left, v_rewrite_left
    FROM organizations WHERE id = p_org_id
    FOR UPDATE;

    -- Check if enough credits
    IF (v_audit_left < p_audit_amount) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient audit credits');
    END IF;

    IF (v_rewrite_left < p_rewrite_amount) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient rewrite credits');
    END IF;

    -- Update credits
    UPDATE organizations 
    SET 
        audit_credits_remaining = audit_credits_remaining - p_audit_amount,
        rewrite_credits_remaining = rewrite_credits_remaining - p_rewrite_amount,
        updated_at = NOW()
    WHERE id = p_org_id;

    -- Log Usage
    INSERT INTO billing_usage (
        organization_id, 
        audit_id, 
        activity_type, 
        credits_deducted,
        provider_cost_est
    ) VALUES (
        p_org_id, 
        p_audit_id, 
        p_activity_type, 
        p_audit_amount + p_rewrite_amount,
        (p_audit_amount * 0.5) + (p_rewrite_amount * 0.01) -- Rough estimate for Gemini/Perplexity costs
    );

    RETURN jsonb_build_object(
        'success', true, 
        'audit_left', v_audit_left - p_audit_amount,
        'rewrite_left', v_rewrite_left - p_rewrite_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger: Auto-log organization events (Signups, Plan Changes)
CREATE TABLE IF NOT EXISTS audit_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'success', 'error', 'info', 'warning'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_notifications_org ON audit_notifications(organization_id);
ALTER TABLE audit_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON audit_notifications
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );
