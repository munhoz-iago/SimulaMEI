# Auth deep-link → checkout contador — design

**Data:** 2026-05-21 · **Status:** design pronto para CLI executar · **Tipo:** P0 — fricção fria na conversão B2B Starter/Pro

## 1. Objetivo

Resolver o **buraco na superfície de receita Starter/Pro**: visitante anônimo em `/upgrade/contador` clica "Assinar Starter" (R$ 97/mês) ou "Assinar Pro" (R$ 247/mês), recebe 401 silencioso da API e vê "Checkout indisponível neste ambiente." sem fork de auth nem deep-link.

Mudança cirúrgica em 3 superfícies (`CheckoutButton` cliente, `/upgrade/contador` server, `/onboarding/contador`). **Coexiste com os outros 3 specs irmãos** sem conflito: `auth-deeplink-{simulator,relatorio}` e `falar-com-comercial`.

## 2. Estado atual (verificado por leitura de código)

### Middleware **não** intercepta `/api/checkout/*`

`src/proxy.ts:6` declara:
```ts
const PROTECTED_PATHS = ['/dashboard', '/onboarding', '/contador', '/admin', '/relatorio', '/api/v1']
```

`/api/checkout/*` está **fora** da lista. Por design — o middleware redireciona páginas, não APIs. O resultado: o POST `/api/checkout/accountant-starter` passa pelo middleware sem redirect e cai na route handler.

### Route handler responde 401 com texto técnico

`src/lib/accountant/checkout.ts:13-20`:
```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json(
    { error: 'Autenticação obrigatória para assinar o plano contador.' },
    { status: 401 },
  )
}
```

Texto correto para uma API. **Errado para ser exibido em UI** sem tratamento.

### `CheckoutButton` ignora 401

`src/components/billing/CheckoutButton.tsx:34-43`:
```ts
if (response.status === 403 && officeRequired) {
  setState('office_missing')
  return
}

if (!response.ok || !payload?.url) {
  setState('idle')
  setError(payload?.error ?? 'Checkout indisponível neste ambiente.')
  return
}
```

O 403 (escritório ausente) tem CTA dedicado para `/onboarding/contador`. **401 cai no fallback genérico** e mostra a string vazada da API como erro vermelho, sem CTA.

### Página `/upgrade/contador` aceita visitante anônimo

`src/app/upgrade/contador/page.tsx:115-123`:
```ts
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
const officeResult = user
  ? await getCurrentAccountantOffice(supabase, user.id, user.email)
  : null
const hasOffice = officeResult ? Boolean(officeResult.office) : null
```

Boa decisão de produto: visitante vê os planos e a comparação antes de logar. O bug está no botão, não no acesso à página.

### Login já tem deep-link safe correto

`src/app/auth/login/page.tsx:20-21`:
```ts
const nextParam = searchParams.get('next') ?? '/dashboard'
const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'
```

`router.push(next)` em `:55`. Google OAuth propaga `next` em `:69`. **Funciona** — só precisamos passar o `next` certo.

### Onboarding `/onboarding/contador` ignora `?plan=`

`src/app/onboarding/contador/page.tsx` (1.9K, lido). Não há leitura de `searchParams.plan`. Se o visitante anônimo precisa criar conta + escritório antes de assinar, a escolha de plano se perde entre auth e onboarding.

## 3. Decisões (fechadas)

- **`CheckoutButton` detecta 401 e redireciona** para `/auth/login?next=<URL com plan+autocheckout>`. Sem CTA de "criar conta" inline — o login já tem o link "Criar conta grátis" (W1 do spec `auth-deeplink-simulator` propaga `next` lá).
- **`/upgrade/contador?autocheckout=<plan>&plan=<plan>`** é o `next` canônico. O server component detecta o `autocheckout`, valida plano contra allowlist, e renderiza um client component dedicado (`AutoCheckoutTrigger`) quando todas as pré-condições estão satisfeitas (user + office + owner).
- **`AutoCheckoutTrigger` é client-only, mount-once.** POSTa para o endpoint do plano selecionado, captura `checkout_resumed_after_login`, redireciona para `session.url` do Stripe.
- **`/onboarding/contador?plan=<plan>`**: server component lê e propaga o plano em todos os links de saída pós-onboarding (CTA "Ir para o painel" e/ou redirect automático). Quem entrou pelo deep-link continua o fluxo sem perder a escolha.
- **Plano é validado contra allowlist** (`starter | pro`) tanto no servidor quanto no cliente. URL com plano inválido cai no comportamento default (ver planos).
- **Open-redirect já está coberto** no login. Reutilizar `next` validado.
- **Sem rota nova**, sem componente de fork "tem conta?". O link "Criar conta grátis" no login (W1 do spec irmão) já cumpre esse papel — mantemos o padrão consistente.

## 4. Workstreams

**P0 — fricção fria no funil B2B (Starter R$ 97 e Pro R$ 247):**
- W1: `CheckoutButton` aceita prop `planForAuth?: 'starter' | 'pro' | 'monitor'` (opcional, só os contador-paid usam) e trata 401 redirecionando para login com `next` carregando `autocheckout` e `plan`.
- W2: `/upgrade/contador` lê `?autocheckout=` + `?plan=` do searchParams, valida contra allowlist, e renderiza `<AutoCheckoutTrigger plan={plan} />` quando user+office+owner.
- W3: Componente novo `AutoCheckoutTrigger` em `src/components/billing/AutoCheckoutTrigger.tsx`. Client-only, useEffect mount-once, POSTa, redireciona.
- W4: `/onboarding/contador` lê `?plan=` e propaga em todos os pontos de redirect/CTA pós-conclusão.
- W5: Confirmar (e corrigir se preciso) que o link "Criar conta grátis" no login propaga o `next` completo (incluindo `?autocheckout=` e `?plan=`). Já é objetivo do W1 do spec `auth-deeplink-simulator`, mas verificar.

**P1 — clareza e telemetria (aditivo):**
- W6: Copy do login context-aware quando `next` aponta para `/upgrade/contador?autocheckout=<plan>`. Lookup table semelhante à do spec irmão simulator — algo como *"Entre para concluir a assinatura do plano <Plano>"*.
- W7: 3 eventos PostHog **novos** (não renomear nenhum existente):
  - `checkout_auth_required` — disparado no `CheckoutButton` ao receber 401, antes do redirect. Props: `plan`, `endpoint`.
  - `checkout_resumed_after_login` — disparado pelo `AutoCheckoutTrigger` quando o POST foi bem sucedido. Props: `plan`.
  - `checkout_abandoned_at_office_setup` — disparado quando o usuário completa o login mas o `getCurrentAccountantOffice` retorna `null` e ele chega na tela de "Crie o escritório antes de assinar" sem completar. (Pode entrar via beacon no `onbeforeunload` ou simplesmente medir taxa de chegada vs criação no onboarding.)

**P2 — fora deste spec:**
- Auto-fill do email do usuário no `AccountantLeadForm` se ele já estiver autenticado mas ainda sem escritório (situação rara, mas existe). Vira refinamento separado.
- Webhook do Stripe que persiste `intent=enterprise` direto na tabela `accountant_leads` — operação, não produto.

## 5. Detalhes por workstream

### W1 — `CheckoutButton` trata 401 e redireciona

**Arquivo:** `src/components/billing/CheckoutButton.tsx`

Adicionar prop opcional:
```ts
planForAuth?: 'starter' | 'pro' | 'monitor'
```

Mudanças no `handleClick`:
```ts
if (response.status === 401 && planForAuth) {
  captureProductEvent('checkout_auth_required', { plan: planForAuth, endpoint })
  const next = `/upgrade/contador?autocheckout=${planForAuth}&plan=${planForAuth}`
  window.location.href = `/auth/login?next=${encodeURIComponent(next)}`
  return
}
```

Para `monitor` (PDF MEI), o `next` aponta para outra rota; manter o switch correto:
```ts
const NEXT_BY_PLAN: Record<NonNullable<typeof planForAuth>, string> = {
  starter: '/upgrade/contador?autocheckout=starter&plan=starter',
  pro: '/upgrade/contador?autocheckout=pro&plan=pro',
  monitor: '/upgrade?autocheckout=monitor',  // se aplicável
}
```

Sem `planForAuth`, comportamento atual intacto.

**Verificação ANTES de codar:** confirmar todos os locais que usam `CheckoutButton`. `Grep "CheckoutButton" src/app src/components` deve retornar os 3 callsites contador-paid (cards Starter/Pro em `/upgrade/contador` e em `/contador/assinatura`) + potencialmente o card "Monitor". Editar cada callsite para passar a nova prop.

### W2 — `/upgrade/contador` consome `autocheckout`

**Arquivo:** `src/app/upgrade/contador/page.tsx`

Estender o tipo `SearchParams`:
```ts
interface SearchParams {
  checkout?: string
  plan?: string
  session_id?: string
  focus?: string
  autocheckout?: string  // NOVO
}
```

Validação:
```ts
const ALLOWED_PLANS = ['starter', 'pro'] as const
const autocheckoutPlan: 'starter' | 'pro' | null =
  params.autocheckout && ALLOWED_PLANS.includes(params.autocheckout as 'starter' | 'pro')
    ? (params.autocheckout as 'starter' | 'pro')
    : null
```

Renderização condicional (após os banners existentes):
```tsx
{autocheckoutPlan && user && hasOffice && isOwner && (
  <AutoCheckoutTrigger plan={autocheckoutPlan} />
)}
```

Se `autocheckoutPlan && user && !hasOffice`: banner já existente (`:203-252`) cobre o caso ("Crie o escritório antes de assinar"). Adicionar dispatch de `checkout_abandoned_at_office_setup` opcional aqui.

Se `autocheckoutPlan && !user`: cenário impossível (middleware/login deveria ter trazido `user`). Tratar como noop (não mostrar trigger, mostrar planos normalmente).

### W3 — `AutoCheckoutTrigger`

**Arquivo:** `src/components/billing/AutoCheckoutTrigger.tsx` (novo)

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { captureProductEvent } from '@/lib/analytics/events'

const ENDPOINT_BY_PLAN = {
  starter: '/api/checkout/accountant-starter',
  pro: '/api/checkout/accountant-pro',
} as const

export function AutoCheckoutTrigger({ plan }: { plan: 'starter' | 'pro' }) {
  const triggered = useRef(false)

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true

    ;(async () => {
      const endpoint = ENDPOINT_BY_PLAN[plan]
      const response = await fetch(endpoint, { method: 'POST' })
      const payload = await response.json().catch(() => null) as { url?: string; error?: string } | null

      if (!response.ok || !payload?.url) {
        // Cai no fluxo manual: usuário vê os cards e pode clicar no botão.
        return
      }

      captureProductEvent('checkout_resumed_after_login', { plan })
      window.location.href = payload.url
    })()
  }, [plan])

  return (
    <div role="status" aria-live="polite" style={{ /* banner discreto: "Redirecionando para o checkout..." */ }}>
      Redirecionando para o checkout do plano {plan === 'pro' ? 'Pro' : 'Starter'}...
    </div>
  )
}
```

Notas:
- `useRef` evita double-fire em React strict mode.
- Em caso de falha, deixar o usuário cair de volta na tela normal (botões manuais) — não mostrar erro modal.
- O banner discreto serve como feedback de loading e como fallback caso o redirect demore.

### W4 — `/onboarding/contador` propaga `?plan=`

**Arquivo:** `src/app/onboarding/contador/page.tsx` (1.9K)

Estender server component:
```ts
interface SearchParams { plan?: string }

export default async function OnboardingContadorPage({
  searchParams,
}: { searchParams?: Promise<SearchParams> }) {
  const params = searchParams ? await searchParams : {}
  const plan = params.plan === 'starter' || params.plan === 'pro' ? params.plan : null
  // ...
}
```

Após a criação do escritório (formulário concluído), o redirect/CTA deve apontar para:
- Sem `plan`: `/contador` (comportamento atual).
- Com `plan`: `/upgrade/contador?autocheckout=<plan>&plan=<plan>`.

Verificar onde está o `router.push` ou `redirect` no fluxo de onboarding e ajustar.

### W5 — Verificar propagação de `next` no link "Criar conta grátis" do login

**Arquivo:** `src/app/auth/login/page.tsx`

W1 do spec `auth-deeplink-simulator-design.md` declara que o link `<Link href="/auth/registro">Criar conta grátis</Link>` (linha :206 no spec) **não propaga `next`**. Se já foi corrigido em produção, esse W5 vira no-op. Se ainda não foi, **ESTE spec depende dele** porque o usuário sem conta clicando "Assinar Pro" → login → "Criar conta" precisa preservar o `next=` com `autocheckout`.

**Verificação ANTES de codar:** `grep -n 'href="/auth/registro"' src/app/auth/login/page.tsx`. Se o `href` não inclui `next`, é blocker do W5 e prioridade no plano.

### W6 — Copy do login context-aware

**Arquivo:** `src/lib/auth/messages.ts` ou novo `src/lib/auth/contextual-copy.ts`

Lookup table:
```ts
export function getLoginContextCopy(nextPath: string): { title: string; subtitle: string } | null {
  if (nextPath.startsWith('/upgrade/contador') && nextPath.includes('autocheckout=pro')) {
    return {
      title: 'Falta só entrar',
      subtitle: 'Você está a um clique do plano Pro (R$ 247/mês).',
    }
  }
  if (nextPath.startsWith('/upgrade/contador') && nextPath.includes('autocheckout=starter')) {
    return {
      title: 'Falta só entrar',
      subtitle: 'Você está a um clique do plano Starter (R$ 97/mês).',
    }
  }
  return null  // default: copy atual
}
```

Aplicar no `LoginForm` — substituir os textos quando o lookup retornar copy.

### W7 — Telemetria aditiva

3 novos eventos no `ProductEventName` type em `src/lib/analytics/events.ts`. Sem renames. Pattern idêntico ao TASK-3 do trabalho de auditoria conversion-trust:
```ts
export type ProductEventName =
  | // ... existentes ...
  | 'checkout_auth_required'
  | 'checkout_resumed_after_login'
  | 'checkout_abandoned_at_office_setup'
```

Dispatchers nos pontos já detalhados acima.

## 6. Sucesso

- [ ] Visitante anônimo clica "Assinar Starter" em `/upgrade/contador` → redirecionado para `/auth/login?next=...`. Mensagem do login menciona "Plano Starter" (W6).
- [ ] Visitante anônimo clica "Assinar Pro" → mesmo fluxo, copy "Plano Pro".
- [ ] Após login bem-sucedido: volta para `/upgrade/contador?autocheckout=pro&plan=pro`. Se já tem escritório + é owner, `AutoCheckoutTrigger` POSTa e redireciona para Stripe **sem clique adicional**.
- [ ] Se chegou no `/upgrade/contador?autocheckout=` mas não tem escritório: vê o banner "Crie o escritório antes de assinar" (`:203-252`, já existe). Botão "Criar escritório" leva para `/onboarding/contador?plan=<plan>` (W4).
- [ ] Após criar escritório com `?plan=` no onboarding: redirect direto para `/upgrade/contador?autocheckout=<plan>&plan=<plan>` (W4). Auto-fire do checkout.
- [ ] Usuário sem conta clica "Criar conta grátis" no login → registro preserva o `next=` (depende do W1/W2 do spec `auth-deeplink-simulator-design`). Após criar conta + onboarding, mesmo fluxo de auto-checkout.
- [ ] `npm test -- --run` continua verde.
- [ ] PostHog: `checkout_auth_required` dispara antes do redirect, `checkout_resumed_after_login` dispara quando o trigger POSTa com sucesso.
- [ ] Plano inválido em `?autocheckout=` ou `?plan=` cai no comportamento default sem erro visível ao usuário.

## 7. Riscos e mitigações

- **Risco:** double-fire do `AutoCheckoutTrigger` em React strict mode → duas chamadas POST → duas sessões Stripe → cobrança duplicada potencial.
  - **Mitigação:** `useRef` guard (W3). Adicionalmente, o `createAccountantCheckout` faz `upsert` em `office_subscriptions` com `onConflict: 'office_id'`, mas isso reescreve o `stripe_checkout_session_id` — segundo POST pode confundir webhook. Validar comportamento com teste de integração.

- **Risco:** open-redirect via `?next=` com `autocheckout` malicioso construído.
  - **Mitigação:** o `next` no login já valida `startsWith('/')` e bloqueia `//`. O servidor de `/upgrade/contador` valida `autocheckout` contra `['starter', 'pro']` allowlist — qualquer valor diferente é tratado como `null` (sem efeito).

- **Risco:** usuário com escritório mas plano ativo (já paga Starter) clica "Assinar Pro" e cai no auto-checkout do Pro — upgrade involuntário?
  - **Mitigação:** verificar comportamento do `createAccountantCheckout` quando o office já tem `plan` ativo. Provavelmente cria uma nova sessão Stripe que substitui via webhook — comportamento esperado de upgrade. Mas vale **adicionar guard no `AutoCheckoutTrigger`**: se `currentPlan === plan`, mostrar aviso "Você já assina este plano" em vez de auto-disparar.

- **Risco:** Stripe demora a responder no auto-POST e o usuário fecha a aba antes do redirect.
  - **Mitigação:** UI do trigger mostra "Redirecionando..." claramente. Se cair, o usuário pode clicar manualmente nos cards (que continuam visíveis embaixo).

- **Risco:** o link "Criar conta grátis" do login pode estar ou não com `next` propagado em produção. Esse spec **depende** disso para o cenário "sem conta + quer Pro".
  - **Mitigação:** W5 verifica antes de codar. Se ainda não, codar primeiro a propagação (escopo do spec irmão simulator).

## 8. Não-objetivos (explícitos)

- ❌ Não criar página `/auth/escolher` (fork tem-conta/criar-conta) — o link "Criar conta grátis" do login cobre esse fork com 1 clique a mais.
- ❌ Não introduzir SSO/passwordless novo neste spec — só passar `next` corretamente nos fluxos existentes (email/senha + Google OAuth).
- ❌ Não refatorar `CheckoutButton` — só adicionar uma prop opcional e um branch no `handleClick`.
- ❌ Não tocar `createAccountantCheckout` — a API continua respondendo 401 corretamente. O fix é client-side.
- ❌ Não adicionar UX modal "Você precisa logar para continuar" — redirect direto para `/auth/login` com copy contextual (W6) é a fricção mínima.

## 9. Conexão com specs irmãos

- `2026-05-20-auth-deeplink-simulator-design.md` — `/dashboard/simular`.
- `2026-05-20-auth-deeplink-relatorio-design.md` — `/dashboard/relatorio`.
- `2026-05-21-falar-com-comercial-design.md` — `/para-contadores#contato` (waitlist + enterprise).
- **Este spec** — `/upgrade/contador?autocheckout=` (Starter + Pro).

Juntos, os 4 fecham a malha de auth deep-link em todas as superfícies de receita do produto. Cada um é cirúrgico no seu canto e não conflita com o outro.

**Ordem sugerida de execução pelo CLI:**

1. `auth-deeplink-simulator` (se ainda não terminou) — porque é dependência de propagação de `next` no link de registro.
2. `auth-deeplink-relatorio` (paralelo ao 1).
3. `falar-com-comercial` (independente).
4. **Este spec** (depende do W1 do 1).

## 10. Estimativa

- Implementação: 2-3h (4 arquivos editados + 1 novo + verificação de propagação de `next`).
- Testes: ~1h (CheckoutButton recebe 401 → asserta redirect URL; `/upgrade/contador` com `?autocheckout` aciona trigger).
- Total: meio dia de trabalho focado.

---

*Arquivos tocados:*
- `src/components/billing/CheckoutButton.tsx` (nova prop `planForAuth`, branch 401)
- `src/components/billing/AutoCheckoutTrigger.tsx` (novo)
- `src/app/upgrade/contador/page.tsx` (searchParams `autocheckout`, render condicional)
- `src/app/onboarding/contador/page.tsx` (propaga `?plan=`)
- `src/lib/auth/messages.ts` ou novo `src/lib/auth/contextual-copy.ts` (lookup table)
- `src/app/auth/login/page.tsx` (consome lookup, troca title/subtitle)
- `src/lib/analytics/events.ts` (3 eventos novos, aditivo)
- Callsites do `CheckoutButton` em `/upgrade/contador/page.tsx` e `/contador/assinatura/page.tsx` (passar nova prop)
