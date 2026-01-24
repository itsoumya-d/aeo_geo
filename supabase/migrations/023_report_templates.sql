-- Migration 023: Report Templates
-- Stores custom report layouts for agencies (White-labeling)

CREATE TABLE IF NOT EXISTS public.report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    layout JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of section IDs/Config
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org templates" ON public.report_templates
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can manage own org templates" ON public.report_templates
    USING (
        organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    );

-- Index
CREATE INDEX idx_report_templates_org ON public.report_templates(organization_id);

-- Insert default template
-- We'll handle default population in frontend or via edge function trigger if needed, 
-- but for now, we leave it clean.
