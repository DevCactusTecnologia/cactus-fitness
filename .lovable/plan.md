# Modelos Prontos ↔ Plano do Aluno

Regra confirmada:
- **Modelo Pronto** (`workout_templates.kind='template'`, `aluno_id=NULL`): biblioteca global da academia, reutilizável.
- **Plano do Aluno** (`workout_templates.kind='plan'`, `aluno_id=<uuid>`): exclusivo do aluno. Cópia limpa — sem vínculo com o modelo original. Editar o modelo NÃO afeta planos já criados, e vice-versa.

## 1. Server functions novas (`src/lib/workout-templates.functions.ts`)

Todas com `requireSupabaseAuth` + validação Zod.

### `duplicateTemplateAsPlan({ sourceSlug, alunoId, name? })`
- Lê modelo origem (kind=template) + todos os `workout_template_exercises`.
- Cria novo `workout_templates` com `kind='plan'`, `aluno_id=alunoId`, `personal_id=auth.uid()`, `organization_id=current_user_org_id()`, `name=name ?? "<nome do modelo>"`, copia demais campos (level, goal, category, duration_weeks, allow_rpe, allow_add_sets, track_set_time, allow_pdf, periodize).
- Copia todos os exercícios (preservando session_position/block_position/position/labels/per_set/…).
- Retorna `{ slug, id }` do novo plano.

### `saveAsTemplate({ sourceSlug })`
- Lê plano origem (kind=plan, do aluno).
- Cria `workout_templates` novo com `kind='template'`, `aluno_id=NULL`, mesmo `organization_id`/`personal_id`, `name="<nome> (modelo)"` (usuário edita depois).
- Copia exercícios idem.
- Retorna `{ slug }` do modelo.

Sem vínculo persistido (rastreabilidade = "cópia limpa").

## 2. Fluxo A — a partir do editor "Criar plano"

Rota `/dashboard/{scope}/treinos/novo-plano?alunoId=...`.

No `WorkoutEditor` (kind=plan, sem `editSlug`, com estado vazio), adicionar acima do input de nome um bloco:

```
┌───────────────────────────────────────────────┐
│  Como você quer começar?                       │
│  [ Começar do zero ] [ Partir de um modelo ▾ ] │
└───────────────────────────────────────────────┘
```

Clicando "Partir de um modelo" abre um `Dialog` com lista de modelos (query `workout_templates where kind='template' and organization_id = ...`). Ao selecionar:
1. Chama `duplicateTemplateAsPlan({ sourceSlug, alunoId })`.
2. `navigate` para `/dashboard/{scope}/treinos/editar/<novo-slug>` — o editor recarrega já com tudo preenchido, o personal ajusta e salva normal.

O bloco some quando o editor já tem conteúdo (evita confusão).

## 3. Fluxo B — a partir da página do modelo

`TreinoModeloPage` ganha botão **"Usar este modelo"** no header.
Abre `Dialog` com:
- Combo/busca de alunos da organização.
- Campo opcional "Nome do plano" (default = nome do modelo).
- Botão "Criar plano".

Ao confirmar: chama `duplicateTemplateAsPlan`, `navigate` para o editor do novo plano.

## 4. Fluxo inverso — "Salvar como modelo"

No `WorkoutEditor` quando `kind='plan'` e o plano já foi salvo (tem slug), adicionar item no menu de ações (`…`) do header:
**"Salvar como modelo"** → chama `saveAsTemplate`, mostra toast "Modelo criado" com link "Ver modelo" que navega para `/dashboard/{scope}/treinos/modelo/<slug>`.

Bloqueado (com tooltip explicativo) se o plano ainda não foi salvo/tem alterações pendentes.

## 5. Ajustes de UI menores

- Em `TreinosPage`, a aba "Modelos" ganha subtítulo curto: "Receitas reutilizáveis. Copie um modelo ao criar o plano de um aluno."
- Em `AlunoDetailPage`, o botão existente "Novo plano" continua igual (leva ao editor, e lá dentro o personal escolhe modelo ou zero).

## 6. Segurança

- Cópia sempre respeita `organization_id` do usuário logado (via RLS + `current_user_org_id()`).
- `duplicateTemplateAsPlan` valida que o `alunoId` pertence à mesma org (`alunos.organization_id = current_user_org_id()`).
- `saveAsTemplate` só permitido quando o plano origem pertence à org do usuário (RLS já cobre, mas validamos explicitamente).
- Nenhuma nova coluna, nenhuma migration — a estrutura atual já modela tudo (`kind` + `aluno_id` nullable).

## 7. Fora de escopo (fica pra próxima iteração)

- Modelos privados por personal (hoje = globais da academia, mantido).
- Rastrear "baseado em" (cópia limpa por decisão do usuário).
- Sincronizar mudanças do modelo com planos derivados (proposital: são independentes).

## Ordem de execução

1. `src/lib/workout-templates.functions.ts` com as duas server fns.
2. `WorkoutEditor`: bloco "Começar do zero / Partir de um modelo" no topo quando plano vazio; item "Salvar como modelo" no menu quando plano salvo.
3. `TreinoModeloPage`: botão "Usar este modelo" + dialog de escolha de aluno.
4. Copy pequeno na `TreinosPage`.
5. Verificar build + smoke test via Playwright dos dois caminhos.
