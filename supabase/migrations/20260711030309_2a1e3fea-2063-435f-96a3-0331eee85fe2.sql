
ALTER TABLE public.set_logs
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS is_extra boolean NOT NULL DEFAULT false;
