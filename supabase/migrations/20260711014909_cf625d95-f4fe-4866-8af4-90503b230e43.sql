ALTER TABLE public.workout_template_exercises
  ADD COLUMN IF NOT EXISTS per_set jsonb;

COMMENT ON COLUMN public.workout_template_exercises.per_set IS
  'Per-series overrides: { types: string[], reps: string[], rest: number[], load: string[] }';