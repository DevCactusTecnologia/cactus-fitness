
CREATE POLICY "Aluno reads exercises from assigned workouts"
  ON public.exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_template_exercises wte
      JOIN public.student_workouts sw ON sw.template_id = wte.template_id
      JOIN public.alunos a ON a.id = sw.aluno_id
      WHERE wte.exercise_id = exercises.id
        AND a.aluno_user_id = auth.uid()
    )
  );
