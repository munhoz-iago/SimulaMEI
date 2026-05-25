# Correcoes da auditoria 2026-05-25

Data: 2026-05-25
Branch base: main
Escopo: specs P0 executaveis em codigo + checklist manual de secrets

## Resumo executivo

Foram aplicadas correcoes nos fluxos de maior risco operacional:

- Export de leads agora e admin-only, com leitura via RLS, rate limit e protecao contra formula injection em XLSX.
- Webhook Stripe so marca evento como processado apos handler bem-sucedido, permitindo retry real em falha.
- Checkout de plano contador evita double billing: mudanca de plano com assinatura ativa vai para Stripe Customer Portal em vez de criar nova subscription.
- Reads do painel contador deixam de usar service-role nos caminhos de leitura e passam a usar o server client com RLS.
- `createAdminClient()` recebeu `server-only` e comentario delimitando usos legitimos.

## Specs cobertos

### 1. `2026-05-25-leads-export-admin-only-csv-safe-design.md`

Status: implementado.

Mudancas:
- `GET /api/leads/export` usa `isAdminEmail(user.email)` como gate estrito.
- Export deixou de usar `createAdminClient()` para ler `accountant_leads`; agora usa `createClient()` server-side e RLS.
- Adicionado rate limit `leads_export`, 10 exportacoes por hora por usuario.
- Adicionado helper `sanitizeXlsxCell()` para prefixar entradas iniciadas por `=`, `+`, `-`, `@`, tab ou CR.
- Todas as celulas textuais exportadas passam por sanitizacao.

Arquivos:
- `src/app/api/leads/export/route.ts`
- `src/app/api/leads/export/route.test.ts`
- `src/lib/security/xlsx-injection.ts`
- `src/lib/security/xlsx-injection.test.ts`

### 2. `2026-05-25-fix-webhook-idempotency-design.md`

Status: implementado.

Mudancas:
- Adicionado `isStripeEventProcessed()` para checagem read-only de duplicidade.
- `POST /api/stripe/webhook` agora segue a ordem: verificar duplicidade, executar handler, marcar evento processado.
- Se handler falhar, o evento nao e marcado como processado e o Stripe pode reenviar.
- Falha ao gravar idempotencia depois do handler passa a ser logada sem reverter o sucesso do handler.
- Adicionado endpoint admin `/api/admin/stripe-drift` para auditar eventos processados nas ultimas 24h contra registros locais.

Arquivos:
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/stripe/webhook/route.test.ts`
- `src/app/api/admin/stripe-drift/route.ts`
- `src/lib/accountant/billing.ts`

### 3. `2026-05-25-fix-double-billing-plan-change-design.md`

Status: implementado.

Mudancas:
- `createAccountantCheckout()` consulta assinatura existente antes de criar checkout.
- Se existe assinatura ativa/trialing/past_due e o plano solicitado e diferente, retorna Stripe Customer Portal com `subscription_update`.
- Se o plano solicitado ja e o plano ativo, retorna para `/contador/assinatura?already=<plan>`.
- Primeira compra continua usando Stripe Checkout normal.
- Registro pendente deixou de usar `upsert` destrutivo; agora faz update/insert preservando `stripe_customer_id` e `stripe_subscription_id`.
- `/api/billing/portal` aceita `flowType: "subscription_update"`.

Arquivos:
- `src/lib/accountant/checkout.ts`
- `src/app/api/billing/portal/route.ts`
- `src/app/api/checkout/accountant-starter/route.test.ts`

### 4. `2026-05-25-accountant-rls-enforced-design.md`

Status: implementado parcialmente conforme escopo seguro de reads.

Mudancas:
- Reads de `office_clients`, `office_simulations`, `office_alerts` e labels de `user_profiles` em `src/lib/accountant/server.ts` passaram para `createClient()` server-side.
- `.eq('office_id', officeId)` foi mantido como defesa em profundidade.
- Service-role permanece no bootstrap/fallback admin de escritorio e em rotas que precisam de privilegio administrativo explicito.
- `src/lib/supabase/admin.ts` agora importa `server-only` e documenta usos permitidos.

Arquivos:
- `src/lib/accountant/server.ts`
- `src/lib/accountant/server-security.test.ts`
- `src/lib/supabase/admin.ts`
- `package.json`
- `package-lock.json`
- `vitest.config.ts`
- `src/test/server-only.ts`

Observacao: nao foi criado teste E2E com Supabase local porque a suite atual usa mocks unitarios. Foi criado teste unitario garantindo que `listOfficeClients()` usa server client e nao service-role.

## Spec manual pendente

### `2026-05-25-rotacao-secrets-fora-do-onedrive-design.md`

Status: pendente de acao manual.

Motivo:
- Rotacao de `SUPABASE_SERVICE_ROLE_KEY` exige Supabase Dashboard autenticado.
- Atualizacao no Vercel exige acesso ao projeto Vercel.
- Mover `.env`/`.env.local` e criar symlink pode quebrar ambiente local se feito antes da rotacao e validacao.

Checklist manual recomendado:
- Rotacionar `SUPABASE_SERVICE_ROLE_KEY` no Supabase Dashboard.
- Atualizar `SUPABASE_SERVICE_ROLE_KEY` no Vercel para Production, Preview e Development.
- Revogar token Vercel local antigo, se ainda existir.
- Mover `.env` e `.env.local` para `C:\Users\iagom\dev\envs\simulamei\`.
- Criar symlinks na raiz do repo apontando para os arquivos movidos.
- Remover copias antigas de `.env*` do OneDrive online e da lixeira.

## Validacao executada

Focada durante a correcao:

```powershell
npx tsc --noEmit
npm run test -- src/app/api/leads/export/route.test.ts src/lib/security/xlsx-injection.test.ts
npm run test -- src/app/api/stripe/webhook/route.test.ts src/lib/accountant/billing.test.ts
npm run test -- src/app/api/checkout/accountant-starter/route.test.ts
npm run test -- src/lib/accountant/server-security.test.ts
npm run test -- src/app/api/admin/stripe-drift/route.test.ts
```

Resultado focado:
- 7 arquivos de teste passaram.
- 25 testes passaram.

Validacao final:

```powershell
npx tsc --noEmit
npm run build
npm run test
```

Resultado final:
- Typecheck limpo.
- Build Next.js concluido com sucesso.
- 75 arquivos de teste passaram.
- 397 testes passaram.

## Pontos para auditoria manual

- Confirmar no Stripe Dashboard que Customer Portal permite `subscription_update` entre Starter e Pro.
- Simular mudanca Starter -> Pro em staging e verificar que nao surge segunda subscription ativa.
- Forcar erro no handler de webhook em staging e confirmar que o evento nao entra em `processed_stripe_events`.
- Abrir XLSX exportado com valor malicioso e confirmar que formula aparece como texto literal.
- Testar login como contador comum e confirmar `GET /api/leads/export` retorna 403.
- Testar contador A acessando dados do contador B e confirmar retorno vazio/404 por RLS.
