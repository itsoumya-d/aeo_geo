ALTER TABLE public.audits
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audits_user_id
ON public.audits(user_id);
