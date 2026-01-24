-- Migration 025: Security Hardening (Anti-Escalation)
-- Prevents users from upgrading their own role or switching organizations via the 'update own profile' policy.

-- ============================================
-- 1. Prevent Self-Escalation Trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.prevent_sensitive_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the operation is performed by the user on their own record
    -- AND the user is NOT a service_role (system admin)
    IF (auth.uid() = NEW.id) AND (CURRENT_USER != 'postgres') AND ((auth.jwt()->>'role') != 'service_role') THEN
        
        -- Prevent Role Change
        IF (NEW.role IS DISTINCT FROM OLD.role) THEN
            RAISE EXCEPTION 'Security Violation: Users cannot change their own role.';
        END IF;

        -- Prevent Organization Change (Lateral Movement)
        IF (NEW.organization_id IS DISTINCT FROM OLD.organization_id) THEN
            RAISE EXCEPTION 'Security Violation: Users cannot move organizations manually.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to users table
DROP TRIGGER IF EXISTS check_sensitive_updates ON users;
CREATE TRIGGER check_sensitive_updates
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_sensitive_updates();


-- ============================================
-- 2. Hardening RLS Policies
-- ============================================

-- Ensure Service Role always has access (Explicitly)
-- This avoids ambiguity if default deny policies are added later.

DO $$ 
BEGIN
    -- Add explicit service role policies if they don't exist
    -- We use DO block to avoid errors if policies already exist (creating distinct unique names)
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role has full access to users') THEN
        CREATE POLICY "Service role has full access to users" ON users FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role has full access to organizations') THEN
        CREATE POLICY "Service role has full access to organizations" ON organizations FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;

END $$;
