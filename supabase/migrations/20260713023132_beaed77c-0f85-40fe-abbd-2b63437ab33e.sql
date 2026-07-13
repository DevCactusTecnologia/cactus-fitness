ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS exercises_category_idx ON public.exercises (category);