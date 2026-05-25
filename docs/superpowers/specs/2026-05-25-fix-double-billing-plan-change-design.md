# Fix double-billing em mudança de plano (Starter → Pro) — design

**Data:** 2026-05-25 · **Status:** pronto para CLI executar · **Tipo:** P0 billing correctness
**Origem:** Contador Review 2026-05-25, Critical #3 + #4

## 1. Objetivo

Owner de escritório com plano `starter` ativo (R$ 97/mês cobrado por Stripe) clica "Mudar para Pro". Hoje o fluxo cria **nova Stripe Checkout Session** que vira uma **segunda subscription ativa** no Stripe — a antiga não é cancelada. Resultado: customer é cobrado R$ 97 + R$ 247 = R$ 344/mês mensal recorrente, e isso só é descoberto na fatura.

Plus: o `checkout.ts` ainda **wipea `stripe_subscription_id` e `stripe_customer_id`** do office na hora do upsert pendente, quebrando webhook lookups.

## 2. Estado atual (verificado)

### `src/lib/accountant/checkout.ts:53-95`

```ts
export async function createAccountantCheckout(plan: AccountantPaidPlan) {
  // ... auth checks (OK)
  const session = await createBrandedCheckoutSession({
    product: plan === 'pro' ? 'accountant_pro' : 'accountant_starter',
    userId: user.id, userEmail: user.email,
    mode: 'subscription',  // ← cria SEMPRE nova subscription
    extraMetadata: { office_id: office.id, plan },
  })

  // BUG: upsert wipea fields ativos
  const { error: subscriptionError } = await subscriptions.upsert({
    office_id: office.id,
    status: 'pending',
    plan,
    stripe_checkout_session_id: session.id,
    // stripe_subscription_id e stripe_customer_id NÃO no payload
    // → onConflict office_id reescreve o row e esses campos viram null
  }, { onConflict: 'office_id' })
  ...
}
```

### Comportamento atual

1. Owner com `office_subscriptions { status: 'active', plan: 'starter', stripe_subscription_id: 'sub_OLD', stripe_customer_id: 'cus_X' }`
2. Owner clica "Mudar para Pro"
3. Stripe cria session NOVA (`sub_NEW` será criada quando session completar)
4. Upsert: row vira `{ status: 'pending', plan: 'pro', stripe_checkout_session_id: 'cs_X', stripe_subscription_id: NULL, stripe_customer_id: NULL }`
5. Owner completa checkout
6. Webhook `checkout.session.completed` chega com a NOVA session
7. Sistema cria registro de `sub_NEW` no Stripe — `sub_OLD` continua **ativa cobrando**

### Verificação Stripe

Stripe não auto-cancela subscriptions. Sub antiga continua até `cancel_at_period_end` ser setado ou cancelamento explícito via API.

## 3. Decisões (fechadas)

- **Detectar live subscription** antes de criar nova session.
- **Quando live sub existe** (starter active → quer Pro, OU pro active → quer starter):
  - Redirecionar para **Stripe Customer Portal** com `subscription_update` flow configurado
  - Stripe Portal mostra UI nativa de "mudar plano" e handle proration + cancelamento automaticamente
  - Webhook `customer.subscription.updated` chega e sincroniza state local
- **Quando NÃO há live sub** (free → starter/pro pela primeira vez): manter Checkout Session atual.
- **Upsert do checkout pendente:** trocar `upsert` por `update` que **só toca os campos da nova session** (`status`, `plan`, `stripe_checkout_session_id`), preservando `stripe_subscription_id` e `stripe_customer_id`. Insert apenas quando não há row (primeira compra).
- **Configurar Stripe Customer Portal** no Stripe Dashboard para habilitar plan switching:
  - Subscriptions → Update → Enabled
  - Listar Products: Starter + Pro
  - Proration: yes (Stripe calcula crédito)
  - Cancellation: enabled with feedback

## 4. Workstreams

**P0:**
- W1: `createAccountantCheckout` detecta live sub e bifurca: portal vs checkout
- W2: Upsert vira insert-or-update-only-pending-fields
- W3: Endpoint `/api/billing/portal/route.ts` aceita flow type (`subscription_update` vs `payment_method`)
- W4: UI do `/upgrade/contador` mostra CTA diferente quando user já tem plano (`"Mudar para Pro pelo portal"` em vez de `"Assinar Pro"`)
- W5: Documentar config necessária no Stripe Dashboard

**Fora deste spec:**
- W6 (futuro): Webhook handler `customer.subscription.updated` precisa ler novo `price_id` e mapear pra plano via `resolveAccountantPlanFromPriceId` (já existe). Verificar se já está fazendo. Se não, fixar.

## 5. Detalhes

### W1 — `createAccountantCheckout` bifurca

```ts
export async function createAccountantCheckout(
  requestedPlan: AccountantPaidPlan,
) {
  const { user, office } = await getOwnerWithOffice()  // existing auth check

  // NEW: detect live subscription
  const liveSub = await getLiveStripeSubscription(office.id)
  if (liveSub && liveSub.plan !== requestedPlan) {
    // Mudança de plano — vai por Customer Portal
    return NextResponse.json({
      url: await createStripeCustomerPortalSession(office.stripe_customer_id, {
        flow_data: {
          type: 'subscription_update',
          subscription_update: {
            subscription: liveSub.stripe_subscription_id,
          },
        },
        return_url: `${getSiteUrl()}/contador/assinatura?changed=${requestedPlan}`,
      }).then(s => s.url),
    })
  }

  if (liveSub && liveSub.plan === requestedPlan) {
    // Já tem o plano desejado — redireciona pra dashboard
    return NextResponse.json({
      url: `${getSiteUrl()}/contador/assinatura?already=${requestedPlan}`,
    })
  }

  // Primeira compra — Stripe Checkout normal
  const session = await createBrandedCheckoutSession({ ... })
  await markPendingSubscription(office.id, requestedPlan, session.id)
  return NextResponse.json({ url: session.url })
}
```

### W2 — `markPendingSubscription` preserva live fields

```ts
async function markPendingSubscription(
  officeId: string,
  plan: AccountantPaidPlan,
  sessionId: string,
) {
  const admin = createAdminClient()

  // Update-or-insert that ONLY touches pending-flow fields
  const { data: existing } = await admin
    .from('office_subscriptions')
    .select('id')
    .eq('office_id', officeId)
    .maybeSingle()

  if (existing) {
    // Update SOMENTE os campos novos. NÃO toca stripe_subscription_id/customer_id.
    await admin
      .from('office_subscriptions')
      .update({
        status: 'pending',
        plan,
        stripe_checkout_session_id: sessionId,
      })
      .eq('office_id', officeId)
  } else {
    await admin.from('office_subscriptions').insert({
      office_id: officeId,
      status: 'pending',
      plan,
      stripe_checkout_session_id: sessionId,
    })
  }
}
```

### W3 — `/api/billing/portal/route.ts` aceita flow type

Atualmente: cria portal session sem `flow_data`. Aceitar query param ou body opcional pra especificar flow:

```ts
const body = await request.json().catch(() => null) as { flowType?: 'subscription_update'; targetPlan?: AccountantPaidPlan } | null

const portalSession = await stripe.billingPortal.sessions.create({
  customer: office.stripe_customer_id,
  return_url: `${getSiteUrl()}/contador/assinatura`,
  flow_data: body?.flowType === 'subscription_update' && body.targetPlan
    ? {
      type: 'subscription_update',
      subscription_update: { subscription: existingSubId },
    }
    : undefined,
})
```

### W4 — UI `/upgrade/contador`

Adicionar lógica que detecta plano atual (já vem de `getCurrentAccountantOffice` no server):

```tsx
{office?.plan === 'starter' && plan.planKey === 'pro' && (
  <CheckoutButton planForAuth="pro" endpoint="/api/checkout/accountant-pro">
    Mudar para Pro pelo portal Stripe
  </CheckoutButton>
)}
{office?.plan === 'pro' && plan.planKey === 'starter' && (
  // Downgrade
  <CheckoutButton planForAuth="starter" endpoint="/api/checkout/accountant-starter">
    Migrar para Starter pelo portal
  </CheckoutButton>
)}
{!office?.plan && (
  // Primeira compra
  <CheckoutButton planForAuth={plan.planKey} endpoint={plan.endpoint}>
    Assinar {plan.name}
  </CheckoutButton>
)}
```

(Backend bifurca automaticamente baseado em `liveSub`, então UI pode até manter mesmo CTA — mas copy clara ajuda confiança.)

### W5 — Stripe Dashboard config

Documentar em comentário no `checkout.ts`:

```ts
// IMPORTANTE: Customer Portal precisa estar configurado no Stripe Dashboard
// (Settings → Billing → Customer portal):
//   - Subscriptions → "Update subscription" → ENABLED
//   - Products available: Starter + Pro (com Price IDs corretos)
//   - Proration: yes (Stripe calcula automaticamente)
//   - Cancellation: enabled with feedback collection
//   - Return URL: https://simulamei.com.br/contador/assinatura
//
// Sem essa config, flow_data: 'subscription_update' retorna erro.
```

## 6. Sucesso

- [ ] Owner com sub ativa clica "Mudar para Pro" → vai pro Stripe Portal (não cria nova session)
- [ ] Stripe Portal mostra opção de mudar pra Pro com proration calculada
- [ ] Após confirmar mudança no portal, webhook `customer.subscription.updated` chega e sincroniza
- [ ] `office_subscriptions` mantém `stripe_subscription_id` original (não fica null durante pending)
- [ ] Owner SEM sub ativa clica "Assinar Starter" → Stripe Checkout normal (sem regressão)
- [ ] Testes do endpoint cobrem 3 cenários:
  - Sem sub → cria session
  - Starter → Pro → retorna portal URL
  - Pro → Pro → retorna `?already=pro`
- [ ] `npx tsc --noEmit` limpo
- [ ] Suite verde
- [ ] Manual: Stripe Dashboard mostra que sub antiga foi `updated` (não 2 ativas)

## 7. Não-objetivos

- ❌ Refatorar todo billing state (`accountant_offices` + `office_subscriptions` consolidação) — escopo separado
- ❌ Webhook idempotency fix — Critical #4, [[2026-05-25-fix-webhook-idempotency-design]]
- ❌ Refazer fluxo de cancelamento — fica via portal mesmo
- ❌ Mudar lógica de `applyAccountantPlanLimit` (downgrade auto-pausa clients) — Critical #11, spec separado

## 8. Riscos

- **Customer Portal Update não habilitado no Stripe** → endpoint retorna 400. Mitigação: W5 documenta config necessária + smoke test em staging primeiro.
- **`flow_data` não disponível em versão antiga do Stripe SDK** — projeto usa stripe `22.1.0`. Verificar suporte (deveria ter desde Stripe API 2023-08-16).
- **Webhook race:** se user mudar plano no portal antes do webhook chegar, UI mostra plano antigo. Solução já existe (webhook eventualmente chega, `router.refresh()` atualiza). Aceitar.
- **Customers com sub criada pré-fix** podem ter row em `office_subscriptions` com `stripe_subscription_id: NULL` por causa do bug atual. Pós-deploy, escrever migration de data healing: para cada office com plan ativo mas `stripe_subscription_id` null, buscar no Stripe pelo customer e backfill. Fora deste spec, mas necessário.

## 9. Estimativa

- W1+W2 (backend): 2h
- W3 (portal endpoint): 30min
- W4 (UI): 30min
- W5 (doc) + testes: 1h
- Total: ~4h de subagent + review

---

*Arquivos tocados:*
- `src/lib/accountant/checkout.ts` (bifurca + preserva fields)
- `src/app/api/billing/portal/route.ts` (aceita flow_data)
- `src/app/upgrade/contador/page.tsx` (copy contextual)
- `src/app/contador/assinatura/page.tsx` (copy contextual)
- Testes em `src/lib/accountant/checkout.test.ts` (provavelmente novo)
