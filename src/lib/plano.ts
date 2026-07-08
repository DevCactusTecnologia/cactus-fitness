export type TemplateExerciseRow = {
  id: string;
  position: number;
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
  template_id: string | null;
  workout_templates: {
    name?: string | null;
    category: string | null;
    duration_min: number | null;
    level: string | null;
    goal: string | null;
    workout_template_exercises: TemplateExerciseRow[];
  } | null;
};

export const PLANO_SELECT =
  "id, name, status, scheduled_for, created_at, template_id, workout_templates ( name, category, duration_min, level, goal, workout_template_exercises ( id, position, sets, reps, load, rest_seconds, notes, exercises ( id, name, image_path ) ) )";

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
  const perWeek = Math.max(1, weekdaySet.size);
  const goal =
    sorted.find((s) => s.workout_templates?.goal)?.workout_templates?.goal ??
    sorted.find((s) => s.workout_templates?.category)?.workout_templates
      ?.category ??
    null;
  return {
    id: aluno.id,
    name: `Plano de ${firstName}`,
    firstName,
    sessions: sorted,
    sessionsCount: sorted.length,
    perWeek,
    weeks,
    startDate: start,
    startShort: formatStartShort(start),
    startNumeric: formatStartNumeric(start),
    goal,
    isActive: true,
    isSimple: true,
  };
}
