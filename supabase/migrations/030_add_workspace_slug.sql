ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.workspaces
SET slug = lower(trim(both '-' from regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL;

ALTER TABLE public.workspaces
ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_organization_id_slug_key
ON public.workspaces (organization_id, slug);
