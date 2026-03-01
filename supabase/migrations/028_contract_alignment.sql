-- Migration 028: Contract Alignment & Reliability Hardening
-- Aligns schema expectations used by edge functions and frontend workflows.

-- ============================================================================
-- 1) scheduled_audits alignment
-- ============================================================================
ALTER TABLE IF EXISTS scheduled_audits
    ADD COLUMN IF NOT EXISTS preferred_time TIME DEFAULT '09:00',
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'scheduled_audits'
          AND column_name = 'enabled'
    ) THEN
        UPDATE scheduled_audits
        SET enabled = TRUE
        WHERE enabled IS NULL;

        ALTER TABLE scheduled_audits
            ALTER COLUMN enabled SET DEFAULT TRUE,
            ALTER COLUMN enabled SET NOT NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_scheduled_audits_next_enabled
    ON scheduled_audits(next_run_at)
    WHERE enabled = TRUE;

-- ============================================================================
-- 2) organization_onboarding persona alignment
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'organization_onboarding'
    ) THEN
        ALTER TABLE organization_onboarding
            DROP CONSTRAINT IF EXISTS organization_onboarding_persona_check;

        ALTER TABLE organization_onboarding
            ADD CONSTRAINT organization_onboarding_persona_check
            CHECK (persona IN ('agency', 'brand', 'developer', 'member'));
    END IF;
END
$$;

-- ============================================================================
-- 3) audit_notifications table shape reconciliation
--    Supports both legacy notification schema and current in-app notifications.
-- ============================================================================
ALTER TABLE IF EXISTS audit_notifications
    ADD COLUMN IF NOT EXISTS audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS recipient TEXT,
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'audit_notifications'
          AND column_name = 'audit_id'
    ) THEN
        ALTER TABLE audit_notifications
            ALTER COLUMN audit_id DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'audit_notifications'
          AND column_name = 'recipient'
    ) THEN
        UPDATE audit_notifications
        SET recipient = 'in_app'
        WHERE recipient IS NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'audit_notifications'
          AND column_name = 'status'
    ) THEN
        UPDATE audit_notifications
        SET status = 'pending'
        WHERE status IS NULL;
    END IF;
END
$$;

ALTER TABLE IF EXISTS audit_notifications
    ALTER COLUMN recipient SET DEFAULT 'in_app',
    ALTER COLUMN status SET DEFAULT 'pending',
    ALTER COLUMN read SET DEFAULT FALSE;

ALTER TABLE IF EXISTS audit_notifications
    DROP CONSTRAINT IF EXISTS audit_notifications_type_check;

ALTER TABLE IF EXISTS audit_notifications
    ADD CONSTRAINT audit_notifications_type_check
    CHECK (
        type IN (
            'success',
            'error',
            'info',
            'warning',
            'email',
            'webhook',
            'slack',
            'audit_complete',
            'score_drop',
            'credit_warning',
            'team_invite',
            'competitor_change',
            'general'
        )
    );

ALTER TABLE IF EXISTS audit_notifications
    DROP CONSTRAINT IF EXISTS audit_notifications_status_check;

ALTER TABLE IF EXISTS audit_notifications
    ADD CONSTRAINT audit_notifications_status_check
    CHECK (status IN ('pending', 'sent', 'failed', 'read'));

CREATE INDEX IF NOT EXISTS idx_audit_notifications_org_created
    ON audit_notifications(organization_id, created_at DESC);

-- ============================================================================
-- 4) Trigger function compatibility for background jobs migration
-- ============================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

