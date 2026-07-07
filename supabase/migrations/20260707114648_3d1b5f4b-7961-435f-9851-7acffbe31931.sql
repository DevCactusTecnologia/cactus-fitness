ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'template',
  ADD COLUMN IF NOT EXISTS periodize boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS goal text;

ALTER TABLE public.workout_templates
  DROP CONSTRAINT IF EXISTS workout_templates_kind_check;
ALTER TABLE public.workout_templates
  ADD CONSTRAINT workout_templates_kind_check CHECK (kind IN ('plan','template'));

ALTER TABLE public.workout_template_exercises
  ADD COLUMN IF NOT EXISTS session_label text,
  ADD COLUMN IF NOT EXISTS block_label text,
  ADD COLUMN IF NOT EXISTS block_position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_position integer NOT NULL DEFAULT 0;
