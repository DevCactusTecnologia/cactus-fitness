
CREATE POLICY "Aluno reads own personal profile"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.alunos a
      WHERE a.personal_id = profiles.id
        AND a.aluno_user_id = auth.uid()
    )
  );
