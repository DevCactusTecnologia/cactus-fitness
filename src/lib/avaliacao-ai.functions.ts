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

    const prompt = `Escreva uma análise curta (exatamente 3 parágrafos, em português, sem markdown) da avaliação física a seguir, falando diretamente com o avaliado na 2ª pessoa ("sua avaliação", "seu IMC"). NUNCA cite o nome do aluno, não use saudações ("Olá", "Prezado"), nem despedidas. Tom leve, direto e motivador — sem formalidade.

Parágrafo 1: interpretação geral dos dados disponíveis (peso, altura, IMC se dá pra calcular, perímetros, etc.).
Parágrafo 2: pontos de atenção e o que sugerem sobre composição corporal / saúde.
Parágrafo 3: recomendação prática de treino para os próximos meses e uma frase final de incentivo.

Ignore campos vazios. Se faltarem dados, faça o que der com o que há.

Composição corporal: ${JSON.stringify(av.composicao_corporal)}
Perímetros: ${JSON.stringify(av.perimetros)}
VO2: ${JSON.stringify(av.vo2max)}
Neuromotora: ${JSON.stringify(av.neuromotora)}
Wells: ${JSON.stringify(av.banco_wells)}
Dinamometria: ${JSON.stringify(av.dinamometria)}
Teste RM: ${JSON.stringify(av.teste_rm)}
Postural: ${JSON.stringify(av.postural)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um personal trainer escrevendo análises curtas e diretas de avaliação física. Nunca cite o nome do avaliado, nunca use saudações ou despedidas, nunca use markdown." },
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
