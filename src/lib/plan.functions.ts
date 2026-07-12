import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlanPayment = {
  id: string;
  descricao: string | null;
  valor: number;
  competencia: string; // ISO date
  pago_em: string | null;
  status: "pago" | "pendente" | "atrasado";
  daysUntilDue: number; // negativo = atrasado
  method: string;
};

export type MyPlanResult = {
  hasPlan: boolean;
  planName: string;
  personalName: string | null;
  orgName: string | null;
  active: boolean;
  valorMensal: number;
  diaCobranca: number | null;
  method: string;
  pending: PlanPayment[];
  history: PlanPayment[];
};

function daysBetween(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyPlanResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const empty: MyPlanResult = {
      hasPlan: false,
      planName: "Sem plano",
      personalName: null,
      orgName: null,
      active: false,
      valorMensal: 0,
      diaCobranca: null,
      method: "Pix",
      pending: [],
      history: [],
    };

    const { data: aluno } = await supabaseAdmin
      .from("alunos")
      .select("id, personal_id, organization_id, is_active")
      .eq("aluno_user_id", userId)
      .maybeSingle();

    if (!aluno?.id) return empty;

    const [{ data: personal }, { data: org }, { data: lancs }] = await Promise.all([
      aluno.personal_id
        ? supabaseAdmin.from("profiles").select("full_name").eq("id", aluno.personal_id).maybeSingle()
        : Promise.resolve({ data: null as any }),
      aluno.organization_id
        ? supabaseAdmin.from("organizations").select("name").eq("id", aluno.organization_id).maybeSingle()
        : Promise.resolve({ data: null as any }),
      supabaseAdmin
        .from("lancamentos")
        .select("id, descricao, valor, competencia, pago_em, categoria, tipo")
        .eq("aluno_id", aluno.id)
        .eq("tipo", "receita")
        .eq("categoria", "mensalidade")
        .order("competencia", { ascending: false }),
    ]);

    const rows = (lancs ?? []) as any[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: PlanPayment[] = rows.map((r) => {
      const due = new Date(r.competencia);
      const days = daysBetween(due, today);
      let status: PlanPayment["status"] = "pendente";
      if (r.pago_em) status = "pago";
      else if (days < 0) status = "atrasado";
      return {
        id: r.id,
        descricao: r.descricao,
        valor: Number(r.valor ?? 0),
        competencia: r.competencia,
        pago_em: r.pago_em,
        status,
        daysUntilDue: days,
        method: "Pix",
      };
    });

    const pending = items.filter((i) => i.status !== "pago");
    const history = items;

    const referencePayment = items[0];
    const valorMensal = referencePayment?.valor ?? 0;
    const diaCobranca = referencePayment ? new Date(referencePayment.competencia).getUTCDate() : null;
    const planName = referencePayment?.descricao || "Mensalidade";

    return {
      hasPlan: items.length > 0,
      planName,
      personalName: (personal as any)?.full_name ?? null,
      orgName: (org as any)?.name ?? null,
      active: aluno.is_active ?? true,
      valorMensal,
      diaCobranca,
      method: "Pix",
      pending,
      history,
    };
  });
