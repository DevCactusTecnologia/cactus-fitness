import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const duplicateInput = z.object({
  sourceSlug: z.string().min(1),
  alunoId: z.string().uuid(),
  name: z.string().trim().min(1).max(160).optional(),
});

const saveAsTemplateInput = z.object({
  sourceSlug: z.string().min(1),
  name: z.string().trim().min(1).max(160).optional(),
});

const duplicatePlanInput = z.object({
  sourceSlug: z.string().min(1),
  name: z.string().trim().min(1).max(160).optional(),
});


const TEMPLATE_COLUMNS =
  "id, name, description, kind, category, duration_min, level, goal, periodize, allow_rpe, allow_add_sets, track_set_time, allow_pdf, start_date, duration_weeks, organization_id";

const EXERCISE_COLUMNS =
  "exercise_id, sets, reps, load, rest_seconds, notes, position, block_position, session_position, block_label, session_label, per_set";

async function copyExercises(
  supabase: any,
  fromTemplateId: string,
  toTemplateId: string,
) {
  const { data: rows, error } = await supabase
    .from("workout_template_exercises")
    .select(EXERCISE_COLUMNS)
    .eq("template_id", fromTemplateId);
  if (error) throw error;
  if (!rows || rows.length === 0) return;
  const { error: insErr } = await supabase
    .from("workout_template_exercises")
    .insert(rows.map((r: any) => ({ ...r, template_id: toTemplateId })));
  if (insErr) throw insErr;
}

/**
 * Copia um modelo pronto (kind='template') como plano do aluno (kind='plan',
 * aluno_id=<uuid>). Cópia limpa — o novo plano é totalmente independente do
 * modelo de origem. Também cria o student_workouts vinculando o plano ao aluno.
 */
export const duplicateTemplateAsPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => duplicateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Valida modelo origem — precisa ser template e da mesma org (RLS já cobre).
    const { data: src, error: srcErr } = await supabase
      .from("workout_templates")
      .select(TEMPLATE_COLUMNS)
      .eq("slug", data.sourceSlug)
      .maybeSingle();
    if (srcErr) throw srcErr;
    if (!src) throw new Error("Modelo não encontrado");
    if (src.kind !== "template") {
      throw new Error("Só é possível copiar a partir de um modelo pronto");
    }

    // Valida aluno pertence à mesma organização.
    const { data: aluno, error: aErr } = await supabase
      .from("alunos")
      .select("id, organization_id")
      .eq("id", data.alunoId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!aluno) throw new Error("Aluno não encontrado");
    if (aluno.organization_id !== src.organization_id) {
      throw new Error("Aluno não pertence à mesma organização do modelo");
    }

    const { data: created, error: insErr } = await supabase
      .from("workout_templates")
      .insert({
        personal_id: userId,
        aluno_id: data.alunoId,
        name: (data.name?.trim() || src.name) as string,
        description: src.description,
        kind: "plan",
        category: src.category,
        duration_min: src.duration_min,
        level: src.level,
        goal: src.goal,
        periodize: src.periodize,
        allow_rpe: src.allow_rpe,
        allow_add_sets: src.allow_add_sets,
        track_set_time: src.track_set_time,
        allow_pdf: src.allow_pdf,
        start_date: src.start_date,
        duration_weeks: src.duration_weeks,
      })
      .select("id, slug")
      .single();
    if (insErr || !created) throw insErr ?? new Error("Falha ao criar plano");

    await copyExercises(supabase, src.id, created.id);

    // Cria o vínculo com o aluno (student_workouts) — assim o plano aparece
    // na lista do aluno imediatamente.
    const { error: swErr } = await supabase.from("student_workouts").insert({
      personal_id: userId,
      aluno_id: data.alunoId,
      template_id: created.id,
      name: (data.name?.trim() || src.name) as string,
    });
    if (swErr) throw swErr;

    return { id: created.id, slug: created.slug as string };
  });

/**
 * Salva um plano de aluno como novo modelo pronto (kind='template',
 * aluno_id=NULL). Cópia limpa — o modelo não fica vinculado ao plano origem.
 */
export const saveAsTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveAsTemplateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: src, error: srcErr } = await supabase
      .from("workout_templates")
      .select(TEMPLATE_COLUMNS)
      .eq("slug", data.sourceSlug)
      .maybeSingle();
    if (srcErr) throw srcErr;
    if (!src) throw new Error("Plano não encontrado");
    if (src.kind !== "plan") {
      throw new Error("Só é possível salvar como modelo a partir de um plano");
    }

    const name = data.name?.trim() || `${src.name} (modelo)`;

    const { data: created, error: insErr } = await supabase
      .from("workout_templates")
      .insert({
        personal_id: userId,
        aluno_id: null,
        name,
        description: src.description,
        kind: "template",
        category: src.category,
        duration_min: src.duration_min,
        level: src.level,
        goal: src.goal,
        periodize: src.periodize,
        allow_rpe: src.allow_rpe,
        allow_add_sets: src.allow_add_sets,
        track_set_time: src.track_set_time,
        allow_pdf: src.allow_pdf,
      })
      .select("id, slug")
      .single();
    if (insErr || !created) throw insErr ?? new Error("Falha ao criar modelo");

    await copyExercises(supabase, src.id, created.id);

    return { id: created.id, slug: created.slug as string };
  });

/**
 * Duplica um plano de aluno como um novo plano do MESMO aluno (cópia limpa).
 * Copia exercícios e as sessões (student_workouts) preservando datas.
 */
export const duplicatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => duplicatePlanInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: src, error: srcErr } = await supabase
      .from("workout_templates")
      .select(TEMPLATE_COLUMNS + ", aluno_id")
      .eq("slug", data.sourceSlug)
      .maybeSingle();
    if (srcErr) throw srcErr;
    if (!src) throw new Error("Plano não encontrado");
    if (src.kind !== "plan" || !src.aluno_id) {
      throw new Error("Só é possível duplicar um plano de aluno");
    }

    const name = data.name?.trim() || `${src.name} (cópia)`;

    const { data: created, error: insErr } = await supabase
      .from("workout_templates")
      .insert({
        personal_id: userId,
        aluno_id: src.aluno_id,
        name,
        description: src.description,
        kind: "plan",
        category: src.category,
        duration_min: src.duration_min,
        level: src.level,
        goal: src.goal,
        periodize: src.periodize,
        allow_rpe: src.allow_rpe,
        allow_add_sets: src.allow_add_sets,
        track_set_time: src.track_set_time,
        allow_pdf: src.allow_pdf,
        start_date: src.start_date,
        duration_weeks: src.duration_weeks,
      })
      .select("id, slug")
      .single();
    if (insErr || !created) throw insErr ?? new Error("Falha ao duplicar plano");

    await copyExercises(supabase, src.id, created.id);

    // Copia as sessões (student_workouts) do plano origem preservando datas.
    const { data: sessions, error: sErr } = await supabase
      .from("student_workouts")
      .select("name, scheduled_for, status")
      .eq("aluno_id", src.aluno_id)
      .eq("template_id", src.id);
    if (sErr) throw sErr;
    if (sessions && sessions.length > 0) {
      const { error: insSwErr } = await supabase.from("student_workouts").insert(
        sessions.map((s: any) => ({
          personal_id: userId,
          aluno_id: src.aluno_id,
          template_id: created.id,
          name: s.name ?? name,
          scheduled_for: s.scheduled_for,
          status: s.status ?? "planned",
        })),
      );
      if (insSwErr) throw insSwErr;
    } else {
      // Fallback: pelo menos vincula uma sessão para o plano aparecer.
      const { error: insSwErr } = await supabase.from("student_workouts").insert({
        personal_id: userId,
        aluno_id: src.aluno_id,
        template_id: created.id,
        name,
      });
      if (insSwErr) throw insSwErr;
    }

    return { id: created.id, slug: created.slug as string };
  });

