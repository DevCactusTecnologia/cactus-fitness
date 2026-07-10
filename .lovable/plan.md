# Plano: rotas segmentadas por papel com gates de segurança

Objetivo: reorganizar as rotas do dashboard em três árvores (`academia`, `personal`, `aluno`) com controle de acesso em três camadas (gate de rota → server function → RLS), preservando compatibilidade com URLs atuais via redirects.

## 1. Backend — fundação de RBAC

### 1.1 Enum `app_role` (verificar/estender)
Garantir valores: `owner`, `personal`, `staff`, `aluno`. Se `aluno` não existir, adicionar via migration `ALTER TYPE`.

### 1.2 Popular `user_roles`
- Trigger que, ao inserir em `organization_members` com role `owner|personal|staff`, replica em `user_roles` para o mesmo `app_role`.
- Trigger que, ao inserir/aceitar convite de aluno (tabela `alunos.user_id`), insere `('aluno')` em `user_roles`.
- Backfill único no momento da migration para os registros existentes.

### 1.3 Função `current_user_primary_role()`
`SECURITY DEFINER`, retorna o papel principal do usuário logado com prioridade `owner > staff > personal > aluno`. Usada pelo `/dashboard` para decidir redirect inicial.

## 2. Nova estrutura de rotas

```
src/routes/_authenticated/
  route.tsx                                    (já existe — gate de sessão)
  index.tsx                                    → redireciona por papel

  _academia/route.tsx                          gate: has_role owner|staff
  _academia/dashboard.academia.index.tsx       → /dashboard/academia
  _academia/dashboard.academia.alunos.index.tsx
  _academia/dashboard.academia.alunos.$alunoId.tsx
  _academia/dashboard.academia.personais.index.tsx
  _academia/dashboard.academia.treinos.index.tsx
  _academia/dashboard.academia.treinos.plano.$planoId.tsx
  _academia/dashboard.academia.exercicios.tsx
  _academia/dashboard.academia.avaliacoes.index.tsx
  _academia/dashboard.academia.desafios.tsx
  _academia/dashboard.academia.financeiro.tsx
  _academia/dashboard.academia.configuracoes.tsx  (ex-"academia")

  _personal/route.tsx                          gate: has_role personal|owner
  _personal/dashboard.personal.index.tsx
  _personal/dashboard.personal.alunos.index.tsx
  _personal/dashboard.personal.alunos.$alunoId.tsx
  _personal/dashboard.personal.treinos.*        (portar arquivos atuais)
  _personal/dashboard.personal.exercicios.tsx
  _personal/dashboard.personal.avaliacoes.*
  _personal/dashboard.personal.desafios.tsx
  _personal/dashboard.personal.financeiro.tsx

  _aluno/route.tsx                             gate: has_role aluno
  _aluno/dashboard.aluno.index.tsx
  _aluno/dashboard.aluno.meu-plano.tsx
  _aluno/dashboard.aluno.treinos.index.tsx
  _aluno/dashboard.aluno.treinos.$planoId.tsx
  _aluno/dashboard.aluno.avaliacoes.tsx
  _aluno/dashboard.aluno.desafios.tsx

  dashboard.perfil.tsx                         compartilhado
```

Convenção: sem acento, kebab-case. Todo `$param` (IDs) é validado no `beforeLoad` via server fn que checa se pertence ao escopo do usuário — devolve `notFound()` senão.

## 3. Gates por camada (defense in depth)

**Camada 1 — rota (`_academia/route.tsx` etc.):**
```tsx
beforeLoad: async ({ context, location }) => {
  const roles = await getMyRoles(); // server fn com requireSupabaseAuth
  if (!roles.some(r => ['owner','staff'].includes(r)))
    throw redirect({ to: '/dashboard', search: { forbidden: 1 }});
  return { activeRole: 'academia' };
}
```

**Camada 2 — server functions:** toda mutation/query sensível chama `has_role(auth.uid(), 'x')` antes de operar, mesmo estando atrás do gate.

**Camada 3 — RLS:** policies existentes continuam scoping por `organization_id` + `auth.uid()`. Nenhuma policy nova depende da rota.

## 4. Redirects de compatibilidade (1–2 releases)

Manter arquivos antigos (`dashboard.personal.alunos.index.tsx`, etc.) apenas com:
```tsx
beforeLoad: () => { throw redirect({ to: '/dashboard/personal/alunos', replace: true }); }
```
Após métricas confirmarem tráfego ≈0 nas rotas antigas (via analytics), remover.

## 5. Home `/dashboard` inteligente

`_authenticated/index.tsx` chama `current_user_primary_role()` no `beforeLoad` e redireciona:
- `owner|staff` → `/dashboard/academia`
- `personal` → `/dashboard/personal`
- `aluno` → `/dashboard/aluno`

## 6. UI shell por papel

- `IconRail` recebe prop `scope: 'academia'|'personal'|'aluno'` (lido via `Route.useRouteContext().activeRole` que o gate injetou) e renderiza só os itens do papel.
- `MobileBottomNav` idem.
- Componentes de lista (Alunos, Treinos, Financeiro) extraídos para `src/components/domain/` e reutilizados entre árvores com props de escopo — sem duplicação de lógica.

## 7. Segurança e escala — invariantes

- IDs em URL: migrar `alunos.id`, `workout_templates.id` para `uuid` (já são) ou slugs opacos onde faltar. Nunca sequenciais.
- Todo server fn de escrita: `requireSupabaseAuth` + `has_role` check + input validado com Zod.
- Todo `$param` validado (existe + pertence ao tenant) no `beforeLoad`.
- Log estruturado com `activeRole` + `organization_id` em cada server fn — pronto para agrupamento por papel em observabilidade.
- Rate-limit por papel nas rotas mais quentes (financeiro, avaliações) via middleware de server fn — a implementar quando escalar.

## 8. Ordem de execução

1. Migration: enum `aluno` em `app_role` + triggers `user_roles` + backfill + `current_user_primary_role()`.
2. Server fns compartilhadas: `getMyRoles`, `getPrimaryRole`, validators de escopo por `$param`.
3. Criar os três layouts gate (`_academia`, `_personal`, `_aluno`) — cada um só com `route.tsx` + um `index.tsx` mínimo.
4. Portar árvore `personal` primeiro (é a maior; já existe). Renomear arquivos, ajustar `createFileRoute` paths, mover para `_personal/`.
5. Portar árvore `academia` (novos arquivos, reusando componentes de `personal`).
6. Portar árvore `aluno` (a partir de `meu-treino.tsx` atual).
7. Redirects em cada arquivo antigo.
8. Atualizar `IconRail` e `MobileBottomNav` para escopo por papel.
9. Home `/dashboard` com redirect por papel.
10. Verificação end-to-end com Playwright em cada papel: login → home → todas as rotas do escopo respondem 200, rotas de outro escopo respondem redirect.

## Fora de escopo desta iteração

- Feature flags por tenant.
- Multi-organization switcher na topbar (usuário owner de várias academias).
- Rate limiting em produção.
- Auditoria/audit log em tabela dedicada.

Todos previstos para iterações subsequentes, sem impactar a estrutura de rotas acima.
