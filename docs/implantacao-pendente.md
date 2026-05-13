# Implantação — checklist de ações pendentes

> Ações que precisam ser feitas **manualmente fora do código** pra completar
> a implantação atual. Atualizado em 2026-05-13.

## 🚨 Bloqueante — sem isso o produto não funciona

### ENV vars no Vercel
- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `APP_HASH_SECRET` (corrigido durante o desenvolvimento — `openssl rand -hex 32`)
- [x] `NEXT_PUBLIC_APP_URL` = `https://simulamei.com.br` (corrigido durante o desenvolvimento)

### Stripe price IDs
- [ ] `STRIPE_SECRET_KEY` (secret key prod)
- [ ] `STRIPE_WEBHOOK_SECRET` (whsec_... do endpoint configurado)
- [ ] `STRIPE_PRICE_REPORT_ID` (R$ 29 one-shot)
- [ ] `STRIPE_PRICE_MONITOR_ID` (R$ 19/mês subscription)
- [ ] `STRIPE_PRICE_ACCOUNTANT_STARTER_ID` (R$ 97/mês subscription)
- [ ] `STRIPE_PRICE_ACCOUNTANT_PRO_ID` (R$ 247/mês subscription)

### Admin
- [x] `ADMIN_EMAIL` = `admin@simulamei.com.br` ou `iagomunhoz48@gmail.com`

### Resend (email transacional)
- [ ] `RESEND_API_KEY` (re_...)

## 🟡 Importante — UX completa

### Stripe Branding (Dashboard)
Acesse [dashboard.stripe.com/settings/branding](https://dashboard.stripe.com/settings/branding):

- [ ] Logo: upload `/public/icons/icon-192.png` (PNG 192×192)
- [ ] Icon (variação quadrada — mesmo arquivo OK)
- [ ] Accent color: `#C8F135` (lime do SimulaMEI)
- [ ] Background color: `#080808` (combina com lime) **ou** `#FFFFFF` (testar)
- [ ] Brand name: `SimulaMEI`
- [ ] Statement descriptor: `SIMULAMEI` (aparece na fatura do cartão)
- [ ] Terms of Service URL: `https://simulamei.com.br/termos`
- [ ] Privacy Policy URL: `https://simulamei.com.br/privacidade`
- [ ] Support email do escritório/CNPJ

### Stripe Customer Portal
Acesse [dashboard.stripe.com/settings/billing/portal](https://dashboard.stripe.com/settings/billing/portal):

- [ ] Permitir cancelar subscription (com ou sem confirmação)
- [ ] Permitir atualizar payment method
- [ ] Permitir baixar invoices PDF
- [ ] Permitir atualizar billing email
- [ ] Branding herda do checkout

### Stripe Webhook endpoint
Acesse [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks):

- [ ] Endpoint URL: `https://simulamei.com.br/api/stripe/webhook`
- [ ] Eventos a escutar (mínimos):
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- [ ] Copiar **Signing secret** → setar `STRIPE_WEBHOOK_SECRET` no Vercel

### Cupons (opcional pra lançamento)
[Dashboard → Coupons](https://dashboard.stripe.com/coupons):

- [ ] Cupom `LANCAMENTO50` — 50% off primeiro mês de `monitor_mensal`
- [ ] Cupom `CONTADORLANCA` — 30 dias adicionais de trial no `accountant_starter`

(Cupons aparecem automaticamente no checkout porque `allow_promotion_codes:
true` já está setado no código.)

## 🟢 SEO / Marketing

### Google Search Console
- [ ] Verificar propriedade `simulamei.com.br`
- [ ] Submeter sitemap: `https://simulamei.com.br/sitemap.xml`
- [ ] Solicitar indexação das páginas-chave:
  - `/`
  - `/para-contadores`
  - `/aprenda/fator-r`
  - `/aprenda/quando-sair-do-mei`
  - `/aprenda/diferenca-anexo-iii-e-v`

### Analytics
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` configurado no Vercel?
- [ ] PostHog: setar dashboard com funnel `simulação → email_captured → pdf_cta_clicked → report_purchased`

### Open Graph
- [x] `metadataBase` no `layout.tsx` aponta pra produção
- [x] OG image em `/opengraph-image` renderiza
- [ ] Validar via [opengraph.xyz/url/https%3A%2F%2Fsimulamei.com.br](https://www.opengraph.xyz/url/https%3A%2F%2Fsimulamei.com.br)

## 🔮 Próximas camadas (planejado, não bloqueante)

Documentadas em `docs/stripe-checkout.md`:

- [ ] Camada 2 — Custom fields no checkout (tipo de empresa, setor, origem)
- [ ] Camada 3 — Stripe Elements embedded (checkout dentro do simulamei.com.br)

---

## Como atualizar este checklist

- Marcar `[x]` quando completar um item
- Adicionar bloco novo se aparecer nova dependência manual
- Manter datado no topo
