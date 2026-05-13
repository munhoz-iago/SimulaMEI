# Personalização do Checkout Stripe

> Estado atual e roadmap das 3 camadas de personalização do checkout.

## Estado: Camada 1 — implantada ✅

Toda sessão de checkout passa pelo helper `createBrandedCheckoutSession()`
em `src/lib/stripe.ts`. Aplica automaticamente:

| Parâmetro Stripe | Valor | Por quê |
|---|---|---|
| `locale` | `pt-BR` | Botões, labels e erros em português |
| `custom_text.submit.message` | Microcopy por produto | Esclarece o que acontece após pagar |
| `custom_text.terms_of_service_acceptance.message` | Garantia CDC art. 49 | Reforço legal + confiança |
| `consent_collection.terms_of_service` | `required` | Força aceite explícito de termos |
| `tax_id_collection.enabled` | `true` | Coleta CNPJ/CPF (essencial pra NF) |
| `allow_promotion_codes` | `true` | Permite cupons sem mexer no código |
| `metadata` | `{ user_id, produto, site }` | Auditoria + webhook |
| `subscription_data.metadata` | mesmo + extras | Subscriptions herdam metadata |

Microcopy por produto está em `CHECKOUT_COPY` no mesmo arquivo. Pra alterar
o texto exibido, edite o objeto e o checkout reflete na próxima sessão.

## Pendente — Camada 1.5 (ação manual no Dashboard)

Visual do checkout (logo, cores, fontes) **não está no código** — vive no
[Dashboard Stripe → Settings → Branding](https://dashboard.stripe.com/settings/branding).

Checklist:

- [ ] Logo: upload PNG 192×192 (o `/public/icons/icon-192.png` serve)
- [ ] Icon: variação quadrada (mesmo arquivo geralmente OK)
- [ ] Accent color: `#C8F135` (lime do SimulaMEI, equivalente a `oklch(88% 0.19 126)`)
- [ ] Background color: `#080808` ou branco — testar qual fica melhor com a cor accent
- [ ] Display name: `SimulaMEI`
- [ ] Statement descriptor: `SIMULAMEI` (aparece na fatura do cartão)
- [ ] Terms of Service URL: `https://simulamei.com.br/termos`
- [ ] Privacy Policy URL: `https://simulamei.com.br/privacidade`
- [ ] Support email: o email de suporte configurado
- [ ] Brand colors → secondary: `#00DEFF` (cyan acentuado, opcional)

Onde configurar Stripe Customer Portal (cancelamento / atualização de dados):

- [ ] [Dashboard → Settings → Billing → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
  - Permitir cliente cancelar subscription
  - Permitir cliente atualizar payment method
  - Permitir cliente baixar invoices
  - Branding herda do checkout

## Camada 2 — Custom Fields (pendente)

Até 3 campos custom no checkout pra capturar dados extras.

Sugestões de uso pro SimulaMEI:

```ts
custom_fields: [
  {
    key: 'tipo_empresa',
    label: { type: 'custom', custom: 'Tipo de empresa' },
    type: 'dropdown',
    dropdown: {
      options: [
        { label: 'MEI', value: 'mei' },
        { label: 'ME (Microempresa)', value: 'me' },
        { label: 'Profissional liberal', value: 'profissional' },
        { label: 'Outro', value: 'outro' },
      ],
    },
  },
  {
    key: 'setor',
    label: { type: 'custom', custom: 'Setor de atuação' },
    type: 'dropdown',
    optional: true,
    dropdown: {
      options: [
        { label: 'TI / Software', value: 'ti' },
        { label: 'Saúde', value: 'saude' },
        { label: 'Comércio', value: 'comercio' },
        { label: 'Serviços', value: 'servicos' },
        { label: 'Outro', value: 'outro' },
      ],
    },
  },
  {
    key: 'como_conheceu',
    label: { type: 'custom', custom: 'Como conheceu o SimulaMEI?' },
    type: 'text',
    optional: true,
  },
]
```

Dado capturado vai pra `session.custom_fields` no webhook, depois sincroniza
em `user_profiles` ou `office_profiles`.

**Quando ativar:** quando quiser análise de funnel/cohort por tipo de negócio.

## Camada 3 — Stripe Elements Embedded (pendente)

Em vez de redirecionar pro `checkout.stripe.com`, o checkout roda **dentro**
do simulamei.com.br. Controle total de fontes/cores/layout via JS.

Custos:

- ~50kb adicional no bundle (`@stripe/stripe-js` + `@stripe/react-stripe-js`)
- Componente React próprio (`<CheckoutEmbed>`)
- `mode: 'embedded'` + `return_url` em vez de `success_url`/`cancel_url`
- Estilização via [Elements appearance API](https://docs.stripe.com/elements/appearance-api)

Vantagens:

- Usuário nunca sai do domínio
- Branding 100% controlado (não depende de Dashboard)
- Layout customizado por contexto (ex: passo 3 de 5 num wizard)

**Quando ativar:** quando o branding hosted (Camada 1.5) ainda parecer
"genérico Stripe" pra você OU quando quiser fluxo de checkout multi-step.

## Webhook → metadata

O webhook em `src/app/api/stripe/webhook/route.ts` lê `metadata.user_id`
e `metadata.produto` pra rotear cada evento (`checkout.session.completed`,
`invoice.paid`, etc) ao registro correto em `purchases` ou
`office_subscriptions`.

Toda metadata extra (`office_id`, `plan`, `tipo_empresa` da camada 2) é
acessível via `session.metadata` no webhook handler.

## Cupons / promoções

Como `allow_promotion_codes: true` está no helper, basta criar cupom no
[Dashboard → Products → Coupons](https://dashboard.stripe.com/coupons):

- Coupon: `LAUNCH50` — 50% off no primeiro mês
- Promotion code: `BLACKMEI` — código publicável
- Apply to: produtos específicos (ex: só `monitor_mensal`)

Sem mudança de código necessária. O input "Aplicar cupom" aparece no
checkout automaticamente.
