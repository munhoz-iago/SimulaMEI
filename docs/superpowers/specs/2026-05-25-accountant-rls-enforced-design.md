# Accountant reads via server-SSR client (RLS-enforced) — design

**Data:** 2026-05-25 · **Status:** pronto para CLI executar · **Tipo:** P0 segurança — multi-tenancy isolation
**Origem:** Contador Review 2026-05-25, Critical #2

## 1. Objetivo

Trocar `createAdminClient()` (service-role, bypassa RLS) por `createClient()` (server SSR, RLS-enforced) em todos os read paths B2B. Hoje a isolação de tenant depende SÓ do `.eq('office_id', officeId)` manual em cada query. Um `.eq` esquecido = leak total entre escritórios contadores.

Migration 008 já desenhou policies RLS corretas usando helpers `is_office_member` / `is_office_admin`. Hoje essas policies são **documentação morta** — o código bypassa.

## 2. Estado atual (verificado)

### `src/lib/accountant/server.ts:316-503`

13 funções de leitura usam `createAdminClient()`:
- `getOfficeStats`, `listOfficeClients`, `getOfficeClient`
- `listOfficeSimulationsForClient`, `getLatestOfficeSimulation`
- `listOfficeAlerts`, `listOfficeAlertsForClient`
- `getOfficeMembers`, `listOfficeMembers`
- `getAccountantBillingState`
- `listOfficeApiKeys`, `getOfficeApiKey`
- outros getters

Todas seguem padrão:
```ts
const admin = createAdminClient()
const { data, error } = await admin
  .from('office_clients')
  .select('...')
  .eq('office_id', officeId)  // ← isolation depende DISSO sozinho
  .order(...)
```

### `src/lib/accountant/server.ts:285-314`

`getCurrentAccountantOffice` também usa admin client e retorna **first office** (Critical #7 separado, fora deste spec).

### Migration 008 (verificada)

Policies RLS para `office_clients`, `office_simulations`, `office_alerts`, `office_subscriptions`, `office_api_keys`:
- SELECT/INSERT/UPDATE/DELETE com `is_office_member(office_id)` ou `is_office_admin(office_id)`
- Helpers usam `auth.uid()` cross-checked contra `office_members`

Verificado: policies estão **corretas e estritas**. Apenas o código bypassa.

## 3. Decisões (fechadas)

- **Migrar 13 read functions** para usar `createClient()` (server SSR client, RLS-enforced).
- **Manter `createAdminClient()`** APENAS em:
  - Webhook handlers (`/api/stripe/webhook/route.ts`)
  - Cron jobs (`/api/cron/*`)
  - Account deletion cascade (`/api/account/delete/route.ts`)
  - Onboarding inicial (creating profile)
- **Manter `.eq('office_id', officeId)`** mesmo com RLS ativa — defense in depth, evita N+1 e clarifies intent.
- **NÃO mudar write paths** neste spec — write paths via RLS exigem revisão de cada policy INSERT/UPDATE para garantir que usuário autenticado tem permissão. Fica pra spec separado.
- **NÃO consolidar billing state** (`accountant_offices` + `office_subscriptions`) — escopo separado.

## 4. Workstreams

**P0:**
- W1: Mover 13 funções de read em `server.ts` de `createAdminClient()` para `createClient()`.
- W2: Adicionar testes E2E que validam isolação (user de office A não vê dados de B).
- W3: Documentar em comentário no `admin.ts` quais usos legítimos restam.

**Fora deste spec:**
- W4 (futuro): mover write paths (insert/update/delete) para RLS — exige revisão policy por policy.
- W5 (futuro): consolidar billing state em uma tabela só.

## 5. Detalhes

### W1 — Refactor `server.ts`

Padrão antes:
```ts
export async function listOfficeClients(officeId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('office_clients')
    .select('...')
    .eq('office_id', officeId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(...)
  return data
}
```

Padrão depois:
```ts
import { createClient } from '@/lib/supabase/server'

export async function listOfficeClients(officeId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('office_clients')
    .select('...')
    .eq('office_id', officeId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(...)
  return data ?? []  // RLS retorna [] se sem permissão (não erro)
}
```

**Mudanças:**
- `createAdminClient()` → `await createClient()`
- Error handling: RLS retorna `data: []` (não `error`) se usuário não tem permissão — não mais errors-por-bypass
- Manter o `.eq('office_id', officeId)` (defense in depth + perf)

### W2 — Testes E2E de isolação

Criar `src/lib/accountant/server.isolation.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { createTestUserWithOffice, signInAs } from '@/lib/test-helpers'
import { listOfficeClients, getOfficeStats } from './server'

describe('multi-tenant isolation', () => {
  let officeA: { id: string; ownerUser: User }
  let officeB: { id: string; ownerUser: User }

  beforeEach(async () => {
    officeA = await createTestUserWithOffice('a@test')
    officeB = await createTestUserWithOffice('b@test')
    await addClientToOffice(officeA.id, { nome: 'Client A1', cnpj: '...' })
    await addClientToOffice(officeB.id, { nome: 'Client B1', cnpj: '...' })
  })

  it('user from office A cannot list office B clients via listOfficeClients', async () => {
    await signInAs(officeA.ownerUser)
    const clients = await listOfficeClients(officeB.id)
    expect(clients).toEqual([])  // RLS retorna []
  })

  it('user from office A sees only own clients', async () => {
    await signInAs(officeA.ownerUser)
    const clients = await listOfficeClients(officeA.id)
    expect(clients).toHaveLength(1)
    expect(clients[0].nome).toBe('Client A1')
  })

  it('admin bypass: hasFullAdminAccess can see all offices', async () => {
    await signInAs({ email: 'admin@simulamei.com.br' })
    // admin lê via `/admin/*` que usa admin client, não esta function
    // este test confirma que `listOfficeClients` NÃO leaka pra admin via path normal
    const clients = await listOfficeClients(officeB.id)
    expect(clients).toEqual([])  // admin precisa usar admin client explicitly
  })
})
```

Provavelmente requer test setup com Supabase local (já existe via `supabase/migrations/`).

### W3 — Documentação em `admin.ts`

```ts
// src/lib/supabase/admin.ts
import 'server-only'  // ← também resolve um Important do admin review

/**
 * Service-role Supabase client. Bypassa RLS — use APENAS para:
 *
 * 1. Webhook handlers (Stripe, etc.) — não há user context
 * 2. Cron jobs — não há user context
 * 3. Account deletion cascade — precisa deletar do auth.users
 * 4. Onboarding inicial (criar profile antes de RLS poder validar)
 *
 * Para qualquer outra operação, use `createClient()` (server SSR client)
 * que respeita RLS automaticamente. Bypass de RLS é equivalente a "sudo
 * para o banco" — toda chamada precisa de justificativa documentada.
 *
 * Ver: docs/superpowers/specs/2026-05-25-accountant-rls-enforced-design.md
 */
export function createAdminClient() { ... }
```

## 6. Sucesso

- [ ] 13 read functions em `server.ts` migradas para `createClient()`
- [ ] `npx tsc --noEmit` limpo
- [ ] Suite existente continua verde (testes não deveriam quebrar — RLS retorna `[]` em vez de error, mas funções já retornam array)
- [ ] Testes E2E novos de isolação cobrem 3 cenários (user-A → B leaks empty, user-A → A vê próprios, admin path normal não leaka)
- [ ] `import 'server-only'` adicionado em `src/lib/supabase/admin.ts`
- [ ] Comentário no `admin.ts` documenta usos legítimos
- [ ] Manual smoke test em preview: login como contador A, tentar URL com officeId de B → vê empty/forbidden

## 7. Não-objetivos

- ❌ Migrar write paths — escopo separado, exige revisão policy por policy
- ❌ Consolidar `accountant_offices` + `office_subscriptions` — outro spec
- ❌ Fix do `getCurrentAccountantOffice` retornar first office — Critical #7, outro spec
- ❌ Adicionar role checks (member vs owner) — Critical #5/#9, outro spec
- ❌ Remover `createAdminClient` completamente — vai continuar em webhooks/cron/account-delete

## 8. Riscos

- **Testes existentes podem quebrar** se algum teste mockava admin client e esperava error em vez de empty array. Buscar mocks e ajustar.
- **Read perf:** RLS adiciona overhead (Postgres avalia policy por row). Para tabelas grandes (office_simulations com 10k+ rows), pode somar 10-50ms. Aceitável trade-off pelo ganho de isolação.
- **Helpers RLS `is_office_member` / `is_office_admin`** usam `auth.uid()` que requer JWT válido. Em código rodando sem session (cron), retornaria erro. Por isso webhook/cron mantêm admin client.
- **Defesa em camadas:** manter `.eq('office_id', officeId)` mesmo com RLS — Postgres pode usar index seek antes de avaliar policy.

## 9. Estimativa

- Migração mecânica W1: 30min (substituir 13 callsites)
- Testes E2E W2: 2h (setup Supabase local, 3 testes)
- Doc W3 + verification: 30min
- Total: ~3h de subagent + review

---

*Arquivos tocados:*
- `src/lib/accountant/server.ts` (13 funções)
- `src/lib/supabase/admin.ts` (comentário + `import 'server-only'`)
- `src/lib/accountant/server.isolation.test.ts` (novo)
