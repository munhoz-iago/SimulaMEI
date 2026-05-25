# Fix idempotência do webhook Stripe — design

**Data:** 2026-05-25 · **Status:** pronto para CLI executar · **Tipo:** P0 billing reliability
**Origem:** Contador Review 2026-05-25, Critical #7

## 1. Objetivo

`POST /api/stripe/webhook` marca o event ID na tabela `processed_stripe_events` **ANTES** de rodar o handler. Se o handler falha (throw 500), o event fica permanentemente marcado como processado, mas o state nunca foi atualizado. Stripe retries vêm com `duplicate: true` e silently no-op. **State drift permanente** que requer recovery manual via SQL.

## 2. Estado atual (verificado)

`src/app/api/stripe/webhook/route.ts:166-200` (estrutura simplificada):

```ts
export async function POST(req: Request) {
  // ... assinatura Stripe verificada
  const event = stripe.webhooks.constructEvent(...)

  // Check idempotency
  const isDuplicate = await isStripeEventProcessed(event.id)
  if (isDuplicate) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  // BUG: marca processado ANTES do handler
  await markStripeEventProcessed(event.id, event.type, event.created)

  // Handler pode throw aqui
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event)
        break
      // ... outros cases
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
    return NextResponse.json({ error: 'handler failed' }, { status: 500 })
    // ↑ Stripe retries vão chegar, isStripeEventProcessed() retorna TRUE,
    //   pulam handler. State permanentemente inconsistente.
  }

  return NextResponse.json({ received: true })
}
```

## 3. Decisões (fechadas)

- **Marcar processado SÓ APÓS handler success.** Throw do handler → event NÃO marcado → Stripe retry executa handler novamente.
- **Race condition de retry concorrente:** se Stripe envia mesmo event 2x em paralelo (rara mas possível), ambos passam o `isDuplicate` check, ambos rodam handler, segundo `INSERT` em `processed_stripe_events` falha por unique constraint. Mitigação: handler deve ser **idempotente** (já é por design: `upsert` em office_subscriptions com `onConflict`, etc.). Catch UNIQUE violation no INSERT e treat as success.
- **Manter check de duplicate ANTES** do handler para evitar dupla execução do trabalho. Só mover o INSERT pra DEPOIS.
- **Adicionar tempo limite ao handler** (ex: 25s) — Stripe retries acontecem em 1h+, então um handler que demora 30s pode ser executado duas vezes. Mitigação: handler rápido + idempotente.
- **Log claro** quando handler falha, com event.id e event.type, para enable recovery manual.

## 4. Workstreams

**P0:**
- W1: Reordenar webhook handler: idempotent check → handler → mark processed
- W2: Handler retry resiliente: catch unique-violation e tratar como success
- W3: Tests de regressão: handler throw → row NÃO em `processed_stripe_events`; retry chega → handler roda de novo
- W4: Health check: endpoint admin que lista `processed_stripe_events` recentes que NÃO têm correspondente em `office_subscriptions`/`purchases` (heurística de drift)

## 5. Detalhes

### W1 + W2 — Reordenar e proteger

```ts
export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'no signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  // 1. Check duplicate FIRST (read-only, fast)
  const isDuplicate = await isStripeEventProcessed(event.id)
  if (isDuplicate) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  // 2. Run handler (can throw)
  try {
    await dispatchStripeEvent(event)
  } catch (err) {
    console.error('[stripe/webhook] handler error', {
      eventId: event.id,
      eventType: event.type,
      error: err instanceof Error ? err.message : String(err),
    })
    // NÃO marca processado — Stripe vai retry
    return NextResponse.json({ error: 'handler failed' }, { status: 500 })
  }

  // 3. Mark processed AFTER success
  try {
    await markStripeEventProcessed(event.id, event.type, event.created)
  } catch (err) {
    // UNIQUE violation = race condition entre 2 retries paralelos rodando handler ao mesmo tempo
    // Handler é idempotente (upsert/onConflict), então segundo rodar é no-op
    // Aceitar e retornar success
    const isUniqueViolation = err instanceof Error && err.message.includes('duplicate key value')
    if (!isUniqueViolation) {
      // Erro inesperado salvando idempotency — log mas retornar success
      // (handler já rodou, retry vai ser no-op)
      console.warn('[stripe/webhook] mark processed failed (handler already ran)', {
        eventId: event.id, error: err,
      })
    }
  }

  return NextResponse.json({ received: true })
}
```

### W3 — Tests

`src/app/api/stripe/webhook/route.test.ts` — adicionar:

```ts
describe('webhook idempotency', () => {
  it('handler throw → event NÃO marcado processed', async () => {
    const event = mockCheckoutCompletedEvent({ make_handler_throw: true })
    const response = await POST(request(event))

    expect(response.status).toBe(500)

    const wasMarked = await isStripeEventProcessed(event.id)
    expect(wasMarked).toBe(false)  // crítico: pode retry
  })

  it('retry após handler throw → handler roda de novo', async () => {
    const event = mockCheckoutCompletedEvent()
    // First call: handler throws (mock falha do Supabase)
    mockSupabaseFailure()
    await POST(request(event))

    // Second call: handler success
    unmockSupabaseFailure()
    const response = await POST(request(event))

    expect(response.status).toBe(200)
    expect(await isStripeEventProcessed(event.id)).toBe(true)
  })

  it('handler success → event marcado e retry vira no-op', async () => {
    const event = mockCheckoutCompletedEvent()
    await POST(request(event))
    expect(await isStripeEventProcessed(event.id)).toBe(true)

    const retryResponse = await POST(request(event))
    const data = await retryResponse.json()
    expect(data.duplicate).toBe(true)
  })

  it('race entre 2 retries paralelos → handler roda 2x, mark fica idempotente', async () => {
    const event = mockCheckoutCompletedEvent()
    const [r1, r2] = await Promise.all([
      POST(request(event)),
      POST(request(event)),
    ])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    // Handler é idempotente, então rodar 2x é OK
    // Mark processed pode ter falhado pra um, mas ambos retornam success
  })
})
```

### W4 — Health check admin

`src/app/api/admin/stripe-drift/route.ts` (novo, admin-only):

```ts
export async function GET(request: Request) {
  await requireAdminSession()
  const supabase = await createClient()

  // Buscar events processados nas últimas 24h
  const { data: events } = await supabase
    .from('processed_stripe_events')
    .select('event_id, event_type, processed_at')
    .gte('processed_at', new Date(Date.now() - 24*60*60*1000).toISOString())

  // Para cada checkout.session.completed, verificar se existe purchase ou office_subscription matching
  const drifts: { event_id: string; suspected_reason: string }[] = []
  for (const evt of events ?? []) {
    if (evt.event_type === 'checkout.session.completed') {
      const { count } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true })
        .eq('stripe_session_id', evt.event_id)
      if ((count ?? 0) === 0) {
        const { count: subCount } = await supabase
          .from('office_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('stripe_checkout_session_id', evt.event_id)
        if ((subCount ?? 0) === 0) {
          drifts.push({
            event_id: evt.event_id,
            suspected_reason: 'checkout.session.completed sem purchase ou office_subscription correspondente',
          })
        }
      }
    }
  }

  return NextResponse.json({ events_24h: events?.length ?? 0, drifts })
}
```

## 6. Sucesso

- [ ] Webhook handler reordenado: duplicate check → handler → mark processed
- [ ] UNIQUE violation no mark é catch'ed como sucesso (handler já rodou)
- [ ] 4 testes de regressão verde
- [ ] Endpoint `/api/admin/stripe-drift` retorna lista de events possíveis com drift
- [ ] `npx tsc --noEmit` limpo
- [ ] Suite verde
- [ ] Manual: forçar handler error em staging, verificar que Stripe Dashboard mostra retry status e segundo retry sucede

## 7. Não-objetivos

- ❌ Refazer dispatch dos handlers (`subscription.deleted hardcodes plan='starter'`) — Critical #11, spec separado
- ❌ Routing via Price ID em vez de metadata — Critical #12, spec separado
- ❌ Refactor billing state — spec separado
- ❌ Migration retroativa de drifts existentes — endpoint admin permite detecção; fix manual ou spec posterior

## 8. Riscos

- **Handler que sempre falha permanentemente** → Stripe vai dar up depois de N retries (3 dias por default). Sem o fix, event marcado e estado broken; com fix, event NÃO marcado e Stripe eventualmente abandona. Em ambos casos requer recovery manual, mas com fix temos mais oportunidades de fix antes de abandono.
- **Long-running handler:** se handler demora 25s+, Stripe pode considerar timeout e enviar retry concorrente. Idempotência protege, mas vale instrumentar tempo de handler em Vercel logs.
- **Test setup:** mockar Supabase failure exige fixture específico. Pode usar dependency injection no handler ou mock módulo inteiro.

## 9. Estimativa

- W1+W2 reordenação: 30min
- W3 testes: 1.5h (setup mock)
- W4 endpoint health: 1h
- Total: ~3h de subagent + review

---

*Arquivos tocados:*
- `src/app/api/stripe/webhook/route.ts` (reordenar)
- `src/app/api/stripe/webhook/route.test.ts` (4 testes novos)
- `src/app/api/admin/stripe-drift/route.ts` (novo)
- `src/app/api/admin/stripe-drift/route.test.ts` (novo)
