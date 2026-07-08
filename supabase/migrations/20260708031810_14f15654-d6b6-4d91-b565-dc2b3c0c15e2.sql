
CREATE POLICY "Aluno reads assigned templates"
  ON public.workout_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.student_workouts sw
      JOIN public.alunos a ON a.id = sw.aluno_id
      WHERE sw.template_id = workout_templates.id
        AND a.aluno_user_id = auth.uid()
    )
  );

CREATE POLICY "Aluno reads assigned template exercises"
  ON public.workout_template_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.student_workouts sw
      JOIN public.alunos a ON a.id = sw.aluno_id
      WHERE sw.template_id = workout_template_exercises.template_id
        AND a.aluno_user_id = auth.uid()
    )
  );
