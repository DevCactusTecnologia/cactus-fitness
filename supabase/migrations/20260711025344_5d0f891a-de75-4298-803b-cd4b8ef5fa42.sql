
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS duration_weeks integer,
  ADD COLUMN IF NOT EXISTS allow_rpe boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_add_sets boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS track_set_time boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_pdf boolean NOT NULL DEFAULT true;
