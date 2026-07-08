
-- Seed generic content for exercises that appear in the "Treino Semanal A" plan so the details modal has data to render.
WITH targets AS (
  SELECT DISTINCT e.id
  FROM public.workout_template_exercises wte
  JOIN public.exercises e ON e.id = wte.exercise_id
  JOIN public.workout_templates wt ON wt.id = wte.template_id
  WHERE wt.slug = 'plano_yviIxgmXy'
)
UPDATE public.exercises e
SET
  description = COALESCE(NULLIF(e.description, ''),
    'O ' || e.name || ' é um exercício voltado para o desenvolvimento de força e hipertrofia. Trabalha o grupo muscular alvo com foco em técnica, amplitude e controle da execução.'),
  instructions = COALESCE(NULLIF(e.instructions, ''),
    '1. Posicione-se corretamente no equipamento, mantendo a postura neutra da coluna.
2. Ajuste pegada, apoios e amplitude conforme sua biomecânica.
3. Execute a fase concêntrica com controle, respirando de forma coordenada.
4. Faça a fase excêntrica de forma lenta, mantendo tensão no músculo alvo.
5. Evite compensações com outros grupos musculares.
6. Realize o número de séries e repetições prescritas, respeitando o descanso.'),
  difficulty = COALESCE(NULLIF(e.difficulty, ''), 'Intermediário'),
  objective = COALESCE(NULLIF(e.objective, ''), 'Hipertrofia'),
  equipment = COALESCE(NULLIF(e.equipment, ''),
    CASE
      WHEN e.name ILIKE '%halter%' THEN 'Halteres, Banco'
      WHEN e.name ILIKE '%barra%' THEN 'Barra, Anilhas'
      WHEN e.name ILIKE '%polia%' OR e.name ILIKE '%pulldown%' OR e.name ILIKE '%cross%' THEN 'Polia, Cabo'
      WHEN e.name ILIKE '%máquina%' OR e.name ILIKE '%maquina%' OR e.name ILIKE '%peck deck%' OR e.name ILIKE '%cadeira%' OR e.name ILIKE '%mesa%' OR e.name ILIKE '%leg press%' OR e.name ILIKE '%hack%' OR e.name ILIKE '%scott%' THEN 'Máquina'
      WHEN e.name ILIKE '%smith%' THEN 'Smith Machine'
      WHEN e.name ILIKE '%prancha%' OR e.name ILIKE '%afundo%' THEN 'Peso corporal'
      ELSE 'Equipamento de academia'
    END),
  muscles_primary = CASE WHEN array_length(e.muscles_primary, 1) IS NULL OR array_length(e.muscles_primary, 1) = 0 THEN
    ARRAY[COALESCE(g.name, 'Geral')]
    ELSE e.muscles_primary END,
  muscles_secondary = CASE WHEN array_length(e.muscles_secondary, 1) IS NULL OR array_length(e.muscles_secondary, 1) = 0 THEN
    CASE g.name
      WHEN 'Peitoral' THEN ARRAY['Tríceps','Ombro']
      WHEN 'Dorsal' THEN ARRAY['Bíceps','Antebraço']
      WHEN 'Bíceps' THEN ARRAY['Antebraço']
      WHEN 'Tríceps' THEN ARRAY['Ombro']
      WHEN 'Inferiores' THEN ARRAY['Glúteo','Panturrilha']
      WHEN 'Ombro' THEN ARRAY['Trapézio','Tríceps']
      WHEN 'Abdômen' THEN ARRAY['Core','Lombar']
      ELSE ARRAY[]::text[]
    END
    ELSE e.muscles_secondary END
FROM public.exercise_groups g
WHERE e.group_id = g.id
  AND e.id IN (SELECT id FROM targets);
