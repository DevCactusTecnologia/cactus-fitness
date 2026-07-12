ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS rpe smallint CHECK (rpe BETWEEN 1 AND 10);