# Plano: substituir mocks por backend real (Lovable Cloud)

## Escopo confirmado
- Personal e Aluno com login próprio (e-mail + senha)
- Perfil completo do personal (nome, avatar, CREF, telefone, bio)
- Remover TODOS os dados mockados, sem deixar rastros

## O que vai ser feito

### 1. Autenticação real
- Ativar auth por e-mail/senha na Lovable Cloud
- Reescrever `/login` para usar login real (com validação zod)
- Criar `/signup` (cadastro separado para personal e aluno via convite)
- Criar `/reset-password` (recuperação de senha)
- Adicionar layout protegido `_authenticated/` — todas as telas do dashboard passam a exigir login
- Redirecionar sign-out para `/login` e limpar cache

### 2. Papéis (roles)
- Tabela `user_roles` com enum (`personal`, `aluno`) — separada do perfil, evita escalada de privilégio
- Função `has_role()` (security definer) para checagens em RLS
- Trigger que cria perfil + role automaticamente ao cadastrar

### 3. Banco de dados
Tabelas novas em `public` (todas com RLS, GRANTs corretos e timestamps):
- `profiles` — nome, avatar, telefone, CREF, bio, especialidades (1-para-1 com auth.users)
- `alunos` — vínculo personal↔aluno (personal_id, aluno_user_id, nome, telefone, objetivo, ativo)
- `workout_templates` — modelos de treino do personal
- `workout_template_exercises` — exercícios dentro de um modelo (séries, reps, carga, descanso)
- `student_workouts` — treinos atribuídos a um aluno
- `student_workout_sessions` — histórico de execução
- `events` — a tabela já existe, mas vou refazer as políticas (hoje estão públicas) para escopar por personal_id

Tabelas existentes (`exercises`, `exercise_groups`, `equipments`) — reescrever políticas: leitura pública das públicas, escrita apenas do dono (`owner_id = auth.uid()`).

### 4. Server functions
Tudo que hoje é mock vira `createServerFn` com `requireSupabaseAuth`:
- `alunos.functions.ts` — listar/criar/editar/deletar aluno
- `treinos.functions.ts` — modelos e atribuições
- `exercicios.functions.ts` — CRUD (já parcialmente existe)
- `agenda.functions.ts` — eventos escopados por usuário
- `profile.functions.ts` — ler/atualizar perfil do personal

### 5. Telas — remover todos os mocks
Cada tela vira read via `useSuspenseQuery` + mutations via `useServerFn`:
- `dashboard.personal.alunos.index.tsx` — hoje tem lista fake, passa a ler do banco (estado vazio quando não tem aluno)
- `dashboard.personal.alunos.$alunoId.tsx` — remove dados fake do aluno
- `dashboard.personal.treinos.tsx` — remove templates mockados
- `dashboard.personal.agenda.tsx` — remove eventos fake
- `dashboard.personal.exercicios.tsx` — já usa Supabase parcialmente; limpar `localStorage("personal_id")` e usar `auth.uid()`
- `index.tsx` (home) — se tiver mock, limpar
- `UserAvatarMenu.tsx` e `MobileBottomNav.tsx` — remover `localStorage.setItem/removeItem` de `personal_id`/`aluno_id`/`user_role`; usar sessão real

### 6. Limpeza (sem deixar rastros)
- Deletar todos os arrays constantes que servem como mock
- Remover qualquer uso de `localStorage` para dados de negócio (fica só o que o Supabase gerencia internamente)
- Remover comentários "// Mock", "// demo", "// fake"
- Estados vazios elegantes ("Nenhum aluno cadastrado ainda")

## Detalhes técnicos

### Ordem de execução
1. Migração 1: enum `app_role`, tabela `user_roles`, função `has_role`, trigger de signup
2. Migração 2: tabela `profiles` + RLS
3. Migração 3: tabelas de negócio (alunos, treinos, sessões) + RLS + GRANTs
4. Migração 4: refazer políticas de `events`, `exercises`, `exercise_groups`, `equipments`
5. Ativar auth email/senha
6. Criar layout `_authenticated/route.tsx` (gate managed)
7. Mover rotas do dashboard para `_authenticated/`
8. Criar server functions
9. Reescrever telas removendo mocks
10. Reescrever `/login`, `/signup`, `/reset-password`

### O que NÃO faz parte
- Google OAuth (você pediu só e-mail+senha)
- Migração de dados existentes no banco (as tabelas atuais têm políticas públicas, vou limpar; se tiver algum dado real que queira preservar, me avise agora)
- Convites por e-mail para aluno (será cadastro direto por enquanto — se quiser convite, é um passo extra)

## Aviso importante
As tabelas `events` e `exercises` hoje têm políticas totalmente públicas (`using: true`). Se houver dados nelas que você quer manter, me diga antes — vou reescrever as políticas para escopar por usuário e dados órfãos (sem dono) ficarão inacessíveis.

Aprovando, começo pelas migrações.