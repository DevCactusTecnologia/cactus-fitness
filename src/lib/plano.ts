export type TemplateExerciseRow = {
  id: string;
  position: number;
  session_position: number | null;
  sets: number | null;
  reps: string | null;
  load: string | null;
  rest_seconds: number | null;
  notes: string | null;
  exercises: { id: number; name: string; image_path: string | null } | null;
};

export type StudentWorkoutRow = {
  id: string;
  name: string;
  status: string;
  scheduled_for: string | null;
  created_at: string;
  archived_at: string | null;
  template_id: string | null;
  workout_templates: {
    name?: string | null;
    slug?: string | null;
    category: string | null;
    duration_min: number | null;
    duration_weeks: number | null;
    start_date: string | null;
    level: string | null;
    goal: string | null;
    workout_template_exercises: TemplateExerciseRow[];
  } | null;
};

export const PLANO_SELECT =
  "id, name, status, scheduled_for, created_at, archived_at, template_id, workout_templates ( name, slug, category, duration_min, duration_weeks, start_date, level, goal, workout_template_exercises ( id, position, session_position, sets, reps, load, rest_seconds, notes, exercises ( id, name, image_path ) ) )";



export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type Plano = {
  id: string;
  name: string;
  firstName: string;
  sessions: StudentWorkoutRow[];
  sessionsCount: number;
  perWeek: number;
  weeks: number;
  startDate: string | null;
  startShort: string | null;
  startNumeric: string | null;
  goal: string | null;
  isActive: boolean;
  isSimple: boolean;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function formatStartShort(date: string | null): string | null {
  if (!date) return null;
  const [, m, d] = date.split("-").map(Number);
  if (!m || !d) return null;
  return `${String(d).padStart(2, "0")} de ${MESES[m - 1]}.`;
}

export function formatStartNumeric(date: string | null): string | null {
  if (!date) return null;
  const [, m, d] = date.split("-").map(Number);
  if (!m || !d) return null;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

export function formatScheduled(
  date: string | null,
): { weekday: string; formatted: string } | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return {
    weekday: WEEKDAYS[dt.getDay()],
    formatted: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
  };
}

export function formatRest(seconds: number | null): string | null {
  if (!seconds) return null;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}min`;
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m${s}s`;
  }
  return `${seconds}s`;
}

export function buildPlano(
  aluno: { id: string; full_name: string },
  sessions: StudentWorkoutRow[],
): Plano | null {
  if (sessions.length === 0) return null;
  const firstName = aluno.full_name.split(" ")[0] ?? aluno.full_name;
  const sorted = [...sessions].sort((a, b) =>
    (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? ""),
  );
  const dates = sorted
    .map((s) => s.scheduled_for)
    .filter((d): d is string => !!d);
  const start = dates[0] ?? null;
  const end = dates[dates.length - 1] ?? null;
  let weeks = 1;
  if (start && end) {
    const [sy, sm, sd] = start.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);
    const diffDays = Math.round(
      (new Date(ey, em - 1, ed).getTime() -
        new Date(sy, sm - 1, sd).getTime()) /
        86400000,
    );
    weeks = Math.max(1, Math.ceil((diffDays + 1) / 7));
  }
  const weekdaySet = new Set(
    dates.map((d) => {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, m - 1, day).getDay();
    }),
  );
  // Prefer template-configured metadata when present
  const tplWithMeta = sorted.find(
    (s) => s.workout_templates?.duration_weeks || s.workout_templates?.start_date,
  )?.workout_templates;
  const tplWeeks = tplWithMeta?.duration_weeks ?? null;
  const tplStart = tplWithMeta?.start_date ?? null;

  // sessionsCount: distinct session_position across all template exercises
  const sessionPositions = new Set<number>();
  for (const s of sorted) {
    for (const ex of s.workout_templates?.workout_template_exercises ?? []) {
      if (ex.session_position != null) sessionPositions.add(ex.session_position);
    }
  }
  const templateSessionsCount = sessionPositions.size;
  const sessionsCount = templateSessionsCount > 0 ? templateSessionsCount : sorted.length;

  const finalWeeks = tplWeeks ?? weeks;
  const finalStart = tplStart ?? start;
  // If we know sessions per plan and total weeks, perWeek = sessions / weeks
  const derivedPerWeek = finalWeeks > 0 ? Math.max(1, Math.round(sessionsCount / finalWeeks)) : sessionsCount;
  const finalPerWeek = tplWeeks ? derivedPerWeek : Math.max(perWeek, derivedPerWeek);

  const goal =
    sorted.find((s) => s.workout_templates?.goal)?.workout_templates?.goal ??
    sorted.find((s) => s.workout_templates?.category)?.workout_templates
      ?.category ??
    null;
  const isActive = sorted.some((s) => !s.archived_at);
  return {
    id: aluno.id,
    name: `Plano de ${firstName}`,
    firstName,
    sessions: sorted,
    sessionsCount,
    perWeek: finalPerWeek,
    weeks: finalWeeks,
    startDate: finalStart,
    startShort: formatStartShort(finalStart),
    startNumeric: formatStartNumeric(finalStart),
    goal,
    isActive,
    isSimple: true,
  };
}


export function buildPlanos(
  aluno: { id: string; full_name: string },
  sessions: StudentWorkoutRow[],
): Plano[] {
  if (sessions.length === 0) return [];
  // Group by template_id. All sessions without a template_id are merged
  // into a single "solo" group representing the aluno's base plan.
  const groups = new Map<string, StudentWorkoutRow[]>();
  const SOLO_KEY = "__solo__";
  for (const s of sessions) {
    const key = s.template_id ?? SOLO_KEY;
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }
  const planos: Plano[] = [];
  for (const [key, group] of groups.entries()) {
    const base = buildPlano(aluno, group);
    if (!base) continue;
    if (key === SOLO_KEY) {
      // Keep aluno.id so the existing plano detail route continues to work
      planos.push(base);
    } else {
      const displayName =
        group[0]?.workout_templates?.name ?? group[0]?.name ?? base.name;
      const slug = group[0]?.workout_templates?.slug ?? null;
      planos.push({
        ...base,
        id: slug ?? `solo-${aluno.id}-${key}`,
        name: displayName,
        isSimple: false,
      });
    }

  }
  planos.sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
  return planos;
}
