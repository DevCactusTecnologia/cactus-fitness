# Barra de metadados no editor de plano/modelo

## O que a imagem representa

Um "pill toolbar" logo abaixo do cabeçalho, mostrando, em chips clicáveis:

- **Duração** (`duration_weeks`) — ex.: *"2 semanas"* + lápis
- **Início** (`start_date`) — ex.: *"Início: 10/07/2026"* + calendário
- **Configurações** — abre o Sheet já existente
- **Aluno vinculado** (`@nome`) — só em plano de aluno, leva ao perfil
- **Status** — `ATIVO` (verde) / `ARQUIVADO` (cinza), derivado de `student_workouts.archived_at`

E um popover **"Volume do plano"** (o card que aparece à direita na imagem) somando séries e agrupamentos musculares de todas as sessões.

## Escopo desta iteração

Aplicar somente no editor (`WorkoutEditor.tsx`), tanto no fluxo `kind="plan"` (aluno) quanto no `kind="template"` (modelo global). No modelo, o chip de aluno e o de status ficam ocultos — só faz sentido em plano.

## Regras de negócio

1. **`duration_weeks`** — inteiro ≥ 1. Default: vazio (não obriga). Aceita edição inline via popover com input numérico + presets (2, 4, 6, 8, 12).
2. **`start_date`** — `date`. Default: vazio. Editor com calendário (`Popover` + `Calendar` shadcn). Pode ser limpo.
3. **Status** — apenas leitura no chip. `ATIVO` se existe `student_workouts` do plano sem `archived_at`; `ARQUIVADO` caso contrário. Fonte única = `student_workouts` (sem duplicar em `workout_templates`).
4. **Aluno** — leitura. Vem do `workout_templates.aluno_id` → `alunos.nome`. Chip vira link para o perfil.
5. **Volume** — calculado em memória a partir do `state.sessions` (mesma lógica já usada em `SessionCard`), agregando por sessão. Grupo muscular vem de `exercises.primary_muscle` (query lateral quando hidratar).

## Persistência

- Adicionar `duration_weeks` e `start_date` ao `State`, ao `SET_META`, ao `SELECT` de hidratação e ao `UPDATE/INSERT` de `handleSave` (as colunas já existem no schema, sem migração).
- `archived_at` continua sendo escrito pela ação de "Arquivar" no `TreinoPlanoPage` — nada muda no fluxo de arquivamento.
- Nenhuma mudança de RLS/GRANT: tudo já é coberto pelas policies existentes de `workout_templates`, `student_workouts` e `alunos`.

## UX / segurança

- Chips desabilitam quando `loadingEdit=true` para evitar edição em estado meio hidratado.
- Ao alterar `duration_weeks`/`start_date`, `dispatch(SET_META)` marca `touched=true` → o blocker "sair sem salvar" já cobre.
- Chip de status é somente leitura — arquivar/desarquivar continua acontecendo na página de detalhes do plano, evitando dois pontos de mutação para o mesmo estado.
- Chip de aluno usa `<Link>` tipado do TanStack Router (nada de `href` interpolado).

## Detalhes técnicos

- **Arquivo alterado**: `src/components/workout-editor/WorkoutEditor.tsx`.
- **Query lateral** (aluno + status) em `useQuery(["plan-header", editSlug])` só quando `isEdit && kind==="plan" && !!alunoId`; retorna `{ alunoNome, isActive }`. Faz `.select("nome").eq("id", alunoId)` em `alunos` e `.select("archived_at").eq("template_id", templateId)` em `student_workouts`. `isActive = rows.some(r => !r.archived_at)`.
- **Volume popover**: componente local que recebe `state.sessions` + mapa `exerciseId → primary_muscle` (buscado em batch quando a lista de exercícios muda). Mostra total de séries, nº de grupamentos e barra por grupo — mesma estética dos cards atuais.
- **Chips**: reutilizam `Button variant="outline" size="sm"` + `rounded-full`; ícones do `lucide-react` (`CalendarDays`, `Clock`, `Settings`, `AtSign`, `CheckCircle2`).

## Fora de escopo

- Alterar o comportamento de arquivar/desarquivar.
- Migrar campos para outra tabela.
- Redesenhar cards de sessão / volume por sessão (já existem).
- Aplicar a barra no `TreinoPlanoPage` (visualização) — pode ser uma iteração seguinte se você quiser paridade lá também.
