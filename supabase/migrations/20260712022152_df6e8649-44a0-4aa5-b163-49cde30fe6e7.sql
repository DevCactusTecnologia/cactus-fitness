CREATE TABLE public.session_exercise_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  template_exercise_id uuid NOT NULL REFERENCES public.workout_template_exercises(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, template_exercise_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_exercise_notes TO authenticated;
GRANT ALL ON public.session_exercise_notes TO service_role;

ALTER TABLE public.session_exercise_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno gerencia suas observações de sessão"
  ON public.session_exercise_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_exercise_notes.session_id
        AND s.aluno_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_exercise_notes.session_id
        AND s.aluno_user_id = auth.uid()
    )
  );

CREATE POLICY "Membros da organização podem ler observações"
  ON public.session_exercise_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_exercise_notes.session_id
        AND public.is_org_member(s.organization_id, auth.uid())
    )
  );

CREATE TRIGGER trg_session_exercise_notes_updated_at
  BEFORE UPDATE ON public.session_exercise_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();