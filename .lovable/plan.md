## Objetivo
Ao clicar em "Modelo de Plano" ou "Template de Treino" no menu de /treinos, abrir um editor completo (nova página) para criação, replicando o layout do welltrainer original.

## Estrutura de rotas
Criar duas novas rotas:

- `src/routes/_authenticated/dashboard.personal.treinos.novo-plano.tsx` → `/dashboard/personal/treinos/novo-plano`
- `src/routes/_authenticated/dashboard.personal.treinos.novo-template.tsx` → `/dashboard/personal/treinos/novo-template`

Ligar os dois `DropdownMenuItem` do `NovoModeloMenu` (em `dashboard.personal.treinos.tsx`) a essas rotas via `<Link>`.

## Layout comum (as duas páginas)
Header fixo no topo (igual ao original):
- Botão "Voltar" (ícone chevron-left) → volta para `/dashboard/personal/treinos`
- Título: "Criar modelo de plano" ou "Criar modelo de treino"
- Botão "Salvar" à direita (verde primary, disabled se nome vazio)

Corpo principal em grid 2 colunas em desktop, stacked em mobile:

**Coluna esquerda — Estrutura do treino**
- Campo Nome ("Nome do plano" / "Nome do treino")
- Campo Descrição (textarea opcional)
- Lista de sessões/blocos com drag-and-drop (@dnd-kit/core + @dnd-kit/sortable, já em uso em outras partes ou instalar):
  - Modelo de Plano: várias **Sessões** (A, B, C…), cada uma contém **Blocos** que contêm **Exercícios**. Botão "Adicionar sessão".
  - Modelo de Treino: apenas **Blocos** com **Exercícios** (sem nível de sessão). Botão "Adicionar bloco".
- Dentro de cada bloco: linhas de exercício com nome, séries, reps, descanso, notas. Botões "Adicionar exercício" e "Adicionar bloco".
- Reordenação por drag handle em sessões, blocos e exercícios.

**Coluna direita — Painel de configurações / seleção**
- Aba "Selecionar exercícios": lista dos exercícios do usuário (query `exercises`), busca, filtro por grupo, clique adiciona ao bloco ativo.
- Aba "Configurações": switch "Periodizar" (só no plano), tags/categoria, nível, objetivo, duração estimada.
- Em mobile as abas viram um `Sheet` bottom-drawer com os mesmos conteúdos.

## Persistência (Supabase)
Usar tabelas existentes:
- `workout_templates` — grava o modelo raiz. Adicionar campo `kind` ('plan' | 'template') via migration se não existir; senão usar `category` como discriminador.
- `workout_template_exercises` — grava exercícios ordenados por `order_index`, com colunas `sets`, `reps`, `rest_seconds`, `notes`, `block_label`, `session_label` (verificar quais existem; migration se faltarem).

Ao clicar em "Salvar":
1. `createServerFn` `saveWorkoutTemplate` (com `requireSupabaseAuth`) que faz insert em `workout_templates` e bulk-insert em `workout_template_exercises`.
2. On success: `queryClient.invalidateQueries(["workout_templates"])` + `navigate({ to: "/dashboard/personal/treinos" })` + toast "Modelo salvo".

## Detalhes técnicos
- Estado local do editor em um único `useReducer` com ações `ADD_SESSION`, `ADD_BLOCK`, `ADD_EXERCISE`, `REORDER`, `UPDATE_EXERCISE`, `REMOVE_*`, `SET_NAME`, etc.
- Componentes reutilizáveis em `src/components/workout-editor/`:
  - `EditorHeader.tsx`
  - `SessionCard.tsx` (só plano)
  - `BlockCard.tsx`
  - `ExerciseRow.tsx`
  - `ExercisePickerPanel.tsx`
  - `SettingsPanel.tsx`
- Reaproveitar tokens de design existentes (bg-card, border-border, primary). Sem cores hardcoded.
- Manter `IconRail` + `MobileBottomNav` do dashboard.

## Escopo NÃO incluído nesta iteração
- Duplicar/exportar modelo
- Vídeos incorporados nos exercícios (só link se existir)
- Superséries com animação complexa
- Compartilhamento entre personais

## Ordem de implementação
1. Migration para colunas faltantes em `workout_templates` / `workout_template_exercises`.
2. `saveWorkoutTemplate.functions.ts` + tipos.
3. Componentes do editor.
4. Rotas `novo-plano` e `novo-template`.
5. Ligar `NovoModeloMenu` aos `<Link>`.
6. Verificação: build, navegação, criação de exemplo end-to-end via Playwright.
