
-- ============================================================
-- FASE A: RPC para aceitar convite de organização
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_org_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.organization_invites%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_invite FROM public.organization_invites WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite_not_found'; END IF;
  IF v_invite.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invite_already_used'; END IF;
  IF v_invite.expires_at < now() THEN RAISE EXCEPTION 'invite_expired'; END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_invite.organization_id, v_uid, v_invite.role)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE public.organization_invites SET accepted_at = now() WHERE id = v_invite.id;
  RETURN v_invite.organization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_org_invite(text) TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_members_org_user_unique') THEN
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_org_user_unique UNIQUE (organization_id, user_id);
  END IF;
END $$;

-- ============================================================
-- FASE 2: Persistência da execução do treino
-- ============================================================
CREATE TABLE public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT public.current_user_org_id(),
  student_workout_id uuid NOT NULL REFERENCES public.student_workouts(id) ON DELETE CASCADE,
  aluno_user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'em_andamento',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia suas sessões" ON public.workout_sessions
  FOR ALL TO authenticated
  USING (aluno_user_id = auth.uid()) WITH CHECK (aluno_user_id = auth.uid());

CREATE POLICY "Membros da org leem sessões" ON public.workout_sessions
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));

CREATE TRIGGER trg_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_workout_sessions_student_workout ON public.workout_sessions(student_workout_id);
CREATE INDEX idx_workout_sessions_aluno ON public.workout_sessions(aluno_user_id, started_at DESC);
CREATE INDEX idx_workout_sessions_org ON public.workout_sessions(organization_id, started_at DESC);

-- exercises.id é INTEGER; set_logs referencia como integer
CREATE TABLE public.set_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  template_exercise_id uuid REFERENCES public.workout_template_exercises(id) ON DELETE SET NULL,
  exercise_id integer REFERENCES public.exercises(id) ON DELETE SET NULL,
  set_index integer NOT NULL,
  reps integer,
  load numeric(6,2),
  rpe numeric(3,1),
  rest_seconds integer,
  notes text,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, template_exercise_id, set_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.set_logs TO authenticated;
GRANT ALL ON public.set_logs TO service_role;

ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia logs" ON public.set_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_sessions s
                 WHERE s.id = set_logs.session_id AND s.aluno_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions s
                      WHERE s.id = set_logs.session_id AND s.aluno_user_id = auth.uid()));

CREATE POLICY "Membros da org leem logs" ON public.set_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_sessions s
                 WHERE s.id = set_logs.session_id
                   AND public.is_org_member(s.organization_id, auth.uid())));

CREATE INDEX idx_set_logs_session ON public.set_logs(session_id);
CREATE INDEX idx_set_logs_exercise ON public.set_logs(exercise_id, completed_at DESC);
