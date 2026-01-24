-- Create Webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL, -- e.g., ['audit.completed', 'competitor.visibility_change']
    secret TEXT NOT NULL, -- Used for signing payloads
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_organization_id ON public.webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON public.webhooks(is_active);

-- RLS Policies
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization webhooks"
    ON public.webhooks FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create webhooks for their organization"
    ON public.webhooks FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their organization webhooks"
    ON public.webhooks FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their organization webhooks"
    ON public.webhooks FOR DELETE
    USING (organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    ));

-- Add webhooks to audit logs
INSERT INTO public.permissions (id, name, description)
VALUES 
    ('webhooks.view', 'View Webhooks', 'Ability to view outgoing webhooks and Zapier integrations'),
    ('webhooks.manage', 'Manage Webhooks', 'Ability to create, update, and delete webhooks');


-- Map permissions to roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT id, 'webhooks.view' FROM public.roles WHERE name IN ('Owner', 'Admin', 'Editor');

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT id, 'webhooks.manage' FROM public.roles WHERE name IN ('Owner', 'Admin');

-- Reliability helper
CREATE OR REPLACE FUNCTION increment_webhook_failure(p_webhook_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE webhooks
    SET failure_count = failure_count + 1,
        is_active = CASE WHEN failure_count + 1 >= 5 THEN FALSE ELSE is_active END
    WHERE id = p_webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
