
-- Slug generator: URL-safe base62-ish, 9 chars
CREATE OR REPLACE FUNCTION public.gen_workout_template_slug(_kind text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  prefix text := CASE WHEN _kind = 'plan' THEN 'plano_' ELSE 'tpl_' END;
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := prefix;
    FOR i IN 1..9 LOOP
      candidate := candidate || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.workout_templates WHERE slug = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Backfill
UPDATE public.workout_templates
SET slug = public.gen_workout_template_slug(kind)
WHERE slug IS NULL;

ALTER TABLE public.workout_templates
  ALTER COLUMN slug SET NOT NULL;

-- Trigger to auto-generate on insert
CREATE OR REPLACE FUNCTION public.set_workout_template_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.gen_workout_template_slug(NEW.kind);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_workout_template_slug ON public.workout_templates;
CREATE TRIGGER trg_set_workout_template_slug
  BEFORE INSERT ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_workout_template_slug();
