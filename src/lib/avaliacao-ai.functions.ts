import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateAvaliacaoAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { avaliacaoId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: av, error } = await supabase
      .from("avaliacoes")
      .select("*, aluno:alunos!inner(full_name, birth_date, gender)")
      .eq("id", data.avaliacaoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!av) throw new Error("Avaliação não encontrada");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const prompt = `Você é um profissional de educação física. Analise de forma breve (3 parágrafos curtos, em português) a avaliação física a seguir e ofereça observações e recomendações de treino. Use tom profissional e acolhedor. Não use markdown.\n\nDados do aluno: ${JSON.stringify(av.aluno)}\nComposição corporal: ${JSON.stringify(av.composicao_corporal)}\nPerímetros: ${JSON.stringify(av.perimetros)}\nVO2: ${JSON.stringify(av.vo2max)}\nNeuromotora: ${JSON.stringify(av.neuromotora)}\nWells: ${JSON.stringify(av.banco_wells)}\nDinamometria: ${JSON.stringify(av.dinamometria)}\nTeste RM: ${JSON.stringify(av.teste_rm)}\nPostural: ${JSON.stringify(av.postural)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um profissional de educação física experiente." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gateway erro ${res.status}: ${t.slice(0, 200)}`);
    }
    const j = await res.json();
    const analysis: string = j?.choices?.[0]?.message?.content ?? "";
    if (!analysis) throw new Error("Resposta vazia da IA");

    const { error: upErr } = await supabase
      .from("avaliacoes")
      .update({ ia_analysis: analysis })
      .eq("id", data.avaliacaoId);
    if (upErr) throw new Error(upErr.message);

    return { analysis };
  });
