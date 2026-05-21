# "Falar com comercial" → destino real — design

**Data:** 2026-05-21 · **Status:** design pronto para CLI executar · **Tipo:** P0 — receita Enterprise sem porta de entrada

## 1. Objetivo

Resolver o **buraco do funil Enterprise**: os 3 CTAs "Falar com comercial" do plano Enterprise apontam todos para `/para-contadores`, página que **não tem formulário de contato**, apesar de a copy afirmar que tem. Quem clica para falar com comercial entra em loop circular e não consegue contatar ninguém.

A infra completa para capturar leads já existe (componente, endpoint, tabela, admin, export) — falta apenas plugar a porta de entrada. **Spec cirúrgico, sem refactor**, coexiste com `2026-05-20-auth-deeplink-{simulator,relatorio}-design.md` em arquivos distintos.

## 2. Estado atual (verificado por leitura de código)

### Os 3 CTAs "Falar com comercial" — todos para `/para-contadores`

- `src/app/upgrade/contador/page.tsx:474` — card Enterprise no painel de planos. `Link href="/para-contadores"`.
- `src/app/contador/assinatura/page.tsx:520` — card Enterprise no dashboard do contador logado. `Link href="/para-contadores"`.
- `src/app/upgrade/page.tsx:108` — data: `cta: 'Falar com comercial', href: '/para-contadores'`.

### O CTA "Entrar na lista →" — link morto literal

- `src/app/para-contadores/page.tsx:188` — botão dentro do card "Prova operacional" (`:168`) com texto *"Entrar na lista →"* e `href="#contadores-form"`.
- **A âncora `#contadores-form` NÃO EXISTE em `/para-contadores`.** Existe em `src/components/layout/ContadoresSection.tsx:143`, mas esse componente é renderizado pela **homepage** (via `HomeClient.tsx:137`), não por `/para-contadores`.
- **Resultado:** clicar não faz nada. Browser não acha a âncora na rota atual, não navega, não rola. Botão silenciosamente quebrado.
- **Ironia tripla:** o comentário no `ContadoresSection.tsx:141` declara `"Right: CTA de trial direto (substituiu o lead form — onboarding já funciona)"`. Alguém removeu o lead form da homepage propositalmente, mas:
  1. Manteve o `id="contadores-form"` no novo bloco de trial.
  2. Não atualizou o `href` em `/para-contadores`.
  3. Não atualizou a copy: o botão promete *waitlist* ("Entrar na lista"), o destino real era *trial direto* — promessa quebrada mesmo se a âncora funcionasse.

### Página `/para-contadores` (`src/app/para-contadores/page.tsx`, 349 linhas)

**Não tem formulário de contato.** Verificado por leitura completa + grep:
- ❌ Sem `<form>` ou `<input>` (além dos checkboxes/selects de hero estático).
- ❌ Sem `<AccountantLeadForm />` importado nem renderizado.
- ❌ Sem `mailto:` para comercial.
- ❌ Sem link wa.me / WhatsApp / Calendly.
- ❌ Sem âncora `#contato` ou seção de contato.

**A copy mente** (`:246`):
> *"contato comercial também pode ser feito pelo formulário desta página."*

Os únicos CTAs visíveis na página:
- "Criar conta e começar grátis" → `/onboarding/contador` (self-service)
- "Comparativo Starter · Pro · Enterprise" → `/upgrade/contador` (loop circular)

### O componente órfão: `AccountantLeadForm`

`src/components/accountant/AccountantLeadForm.tsx` existe e está pronto. Único `grep -r "AccountantLeadForm"` retorna **só o próprio arquivo** — não é usado em nenhum lugar.

Pista de intenção abandonada: o componente declara `source = 'para-contadores'` como prop default (`:42`):
```ts
export function AccountantLeadForm({ source = 'para-contadores' }: { source?: string }) {
```

Alguém pretendia montá-lo em `/para-contadores` e nunca terminou.

### O componente: o que ele faz hoje

Verificado por leitura (`AccountantLeadForm.tsx`):
- Campos: nome do escritório, e-mail profissional, **WhatsApp** (label explícito), carteira (`21-50` default), ferramenta atual, consent LGPD.
- POST `/api/accountant-leads` → grava em `accountant_leads` (Supabase).
- Captura `accountant_signup_interest` no PostHog com `source`, `carteira_range`, `ferramenta_atual`, `plano_interesse`.
- Pré-seleciona plano via `sessionStorage.getItem('accountantPreselect')` — sinal de fluxo upstream que pode injetar contexto.
- Confirmação: *"Cadastro recebido! Contato em até 48h conforme a faixa de carteira."*
- CTA atual: **"Entrar na lista de acesso antecipado"** ← copy de **waitlist**, não de contato comercial. Precisa de variante.

### Infra existente (não tocar)

- `src/app/api/accountant-leads/route.ts` — endpoint com rate limit próprio (namespace `'accountant_leads'`), Zod validation, INSERT em `accountant_leads`.
- `src/app/admin/leads/page.tsx` + `src/app/admin/leads/actions.ts` — admin para ver leads.
- `src/app/api/leads/export/route.ts` — export CSV.
- Tabela `accountant_leads` no Supabase.

## 3. Decisões (fechadas)

- **Renderizar `<AccountantLeadForm />` em `/para-contadores`** dentro de uma seção com âncora `#contato`. Aside já existe na página — o form vira a terceira coluna ou um bloco aside abaixo do "Já quer ver os planos?".
- **Variante de copy no componente** via prop `intent: 'waitlist' | 'enterprise'` (default `'waitlist'`). Quando `enterprise`:
  - CTA: *"Falar com nosso comercial"* (em vez de *"Entrar na lista de acesso antecipado"*).
  - Confirmação: *"Recebemos seu contato. Nosso comercial responde em até 1 dia útil (carteiras 150+ entram em fila prioritária)."*
  - Pré-define `carteiraRange = '150+'` (faixa Enterprise).
- **Os 3 CTAs "Falar com comercial" passam a apontar para `/para-contadores#contato`** com `?intent=enterprise` para o form saber que veio do Enterprise. Implementação: server component lê `searchParams.intent`, passa `intent="enterprise"` ao componente.
- **O CTA "Entrar na lista →" passa a apontar para `#contato` (sem intent)** — mesma âncora interna, mas mantém o `intent` default `'waitlist'`. Cumpre a promessa literal da copy ("Entrar na lista") porque agora o form **é** o destino real.
- **Fallback mailto explícito** ao lado do form: link visível para `contato@simulamei.com.br` com assunto pré-preenchido (`?subject=Plano Enterprise — Contato comercial`). Para quem não quer formulário.
- **Remover a copy mentirosa** (`:246`) ou — preferível — **realinhá-la** ao formulário recém-plugado, mantendo a promessa cumprida.
- **NÃO** criar `/contato` separado, **NÃO** criar Calendly link (não está no stack), **NÃO** introduzir WhatsApp clickable (o telefone do form já cobre).

## 4. Workstreams

**P0 — destrava receita:**
- W1: Adicionar prop `intent` em `AccountantLeadForm` com variantes de copy + pré-seleção da carteira.
- W2: Renderizar `<AccountantLeadForm intent={intent} />` em `/para-contadores` numa seção `id="contato"`.
- W3: Apontar os 3 CTAs Enterprise para `/para-contadores?intent=enterprise#contato`.
- W4: Adicionar mailto fallback visível ao lado do form.
- W5: Realinhar a copy mentirosa (`:246`) à realidade.
- W9: **Corrigir `href` do "Entrar na lista →" (`/para-contadores/page.tsx:188`)** de `"#contadores-form"` para `"#contato"`. Botão deixa de estar morto e passa a cumprir a promessa de waitlist.

**P1 — medição (aditivo, sem renomes):**
- W6: Evento `enterprise_lead_form_viewed` ao renderizar com `intent=enterprise` (server-side ou intersection observer).
- W7: Propriedade extra `intent` em `accountant_signup_interest` (já existe no evento, só preencher quando `intent=enterprise`).
- W8: Evento `enterprise_mailto_clicked` no link fallback.

**P2 — fora deste spec:**
- Auto-responder via Resend (já está no stack) confirmando recebimento — vira spec separado de operações.
- Integração com Slack/Discord do dono para notificação imediata de lead Enterprise — operação, não produto.
- "Falar com comercial" no contexto de outros planos (Pro upgrade etc.) — não há sinal de necessidade hoje.

## 5. Detalhes por workstream

### W1 — Prop `intent` no `AccountantLeadForm`

**Arquivo:** `src/components/accountant/AccountantLeadForm.tsx`

```ts
export function AccountantLeadForm({
  source = 'para-contadores',
  intent = 'waitlist',
}: {
  source?: string
  intent?: 'waitlist' | 'enterprise'
}) {
```

Mudanças:
- Quando `intent === 'enterprise'`:
  - `useState` inicial do `carteiraRange` = `'150+'` (validar que existe em `ACCOUNTANT_CLIENT_RANGES`; se não, criar PR separado adicionando essa faixa antes — verificar `lib/accountant/leads.ts`).
  - CTA do botão: *"Falar com nosso comercial"*.
  - Variante de confirmação: *"Recebemos seu contato. Nosso comercial responde em até 1 dia útil."*
- Quando `intent === 'waitlist'`: comportamento atual intacto.

**Verificação ANTES de codar:**
- Conferir em `src/lib/accountant/leads.ts` se `'150+'` está em `ACCOUNTANT_CLIENT_RANGES`. Se não, decidir: adicionar lá (preferível) ou usar a faixa máxima existente.

### W2 — Renderizar form em `/para-contadores`

**Arquivo:** `src/app/para-contadores/page.tsx`

- Adicionar `import { AccountantLeadForm } from '@/components/accountant/AccountantLeadForm'`.
- Página vira async server component que aceita `searchParams: Promise<{ intent?: string }>`.
- Resolver `intent` com validação estrita: `intent === 'enterprise' ? 'enterprise' : 'waitlist'`.
- Inserir uma `<section id="contato" aria-labelledby="contato-title">` antes do `<footer>` (linha 344), com:
  - Título contextual: *"Falar com comercial"* (Enterprise) ou *"Entre na lista de acesso antecipado"* (default).
  - `<AccountantLeadForm intent={intent} source={intent === 'enterprise' ? 'enterprise-cta' : 'para-contadores'} />`.
- Manter responsividade da aside já existente; o form é grande, então a seção `#contato` deve ser `grid-template-columns: 1fr` em mobile, `1fr 320px` em desktop (form + mailto card).

### W3 — Atualizar os 3 CTAs para `/para-contadores#contato?intent=enterprise`

Arquivos (verificar linhas atuais antes de editar):
- `src/app/upgrade/contador/page.tsx` — card Enterprise (próximo a `:460`): `href="/para-contadores?intent=enterprise#contato"`.
- `src/app/contador/assinatura/page.tsx` — card Enterprise (`:506`): mesma URL.
- `src/app/upgrade/page.tsx` — objeto Enterprise (`:107`): `href: '/para-contadores?intent=enterprise#contato'`.

A ordem `?query#hash` é correta para o browser preservar o scroll-into-view após o navegar (verificar comportamento em Next App Router; se o scroll não funcionar com query string, usar `scroll-margin-top` na section).

### W4 — Mailto fallback

Dentro da `section#contato`, ao lado/abaixo do form (depende do breakpoint), adicionar bloco simples:

```tsx
<div className="contato-fallback">
  <div>Prefere e-mail?</div>
  <a href="mailto:contato@simulamei.com.br?subject=Plano%20Enterprise%20%E2%80%94%20Contato%20comercial">
    contato@simulamei.com.br
  </a>
  <span>Respondemos em até 1 dia útil.</span>
</div>
```

**Verificação:** confirmar se `contato@simulamei.com.br` existe e está roteado. Se não, usar `comercial@simulamei.com.br` ou o e-mail já documentado em outras superfícies. Verificar `/privacidade`, `/termos`, `/api-docs` — todos têm mailto, definir qual usar.

### W5 — Realinhar a copy mentirosa

**Arquivo:** `src/app/para-contadores/page.tsx:246`

Antes:
> "contato comercial também pode ser feito pelo formulário desta página."

Depois (com o form agora real):
> "contato comercial pode ser feito pelo [formulário abaixo](#contato) ou direto por e-mail."

Ou — alternativa mais limpa — substituir o parágrafo inteiro pelo block de TRUST_POINTS já enriquecido, deixando o convite ao form na seção `#contato` em si.

### W9 — Corrigir "Entrar na lista →" (`/para-contadores:188`)

**Arquivo:** `src/app/para-contadores/page.tsx:188`

Antes:
```tsx
<Link href="#contadores-form" ...>
  Entrar na lista →
</Link>
```

Depois:
```tsx
<Link href="#contato" ...>
  Entrar na lista →
</Link>
```

**Justificativa:**
1. `#contadores-form` é âncora morta nesta rota (vive em `ContadoresSection`, renderizado só na homepage).
2. Como W2 cria `<section id="contato">` na mesma rota, a navegação passa a ser **interna** (não tira o usuário de `/para-contadores`).
3. Sem `?intent=` na URL, o form usa `intent='waitlist'` default, com CTA *"Entrar na lista de acesso antecipado"* — alinha com a promessa do botão upstream.

**Não confundir:** o card "Prova operacional" (`:168-191`) onde está esse botão é argumento de prova social (18.300+ simulações). O usuário que clica daí está pedindo waitlist, não Enterprise. **Manter `intent=waitlist` é correto** — não inserir `?intent=enterprise` aqui.

### W6/W7/W8 — Telemetria (P1, aditivo)

Manter compatibilidade com `accountant_signup_interest` existente. Adicionar APENAS propriedades novas — nunca renomear o evento. Padrão idêntico ao TASK-3 do trabalho de auditoria anterior.

```ts
// no submit handler do AccountantLeadForm, dentro do captureProductEvent atual:
captureProductEvent('accountant_signup_interest', {
  source,
  intent,  // ← nova prop, 'waitlist' | 'enterprise'
  carteira_range: form.carteiraRange,
  // ... resto igual
})

// novo evento ao montar com intent=enterprise:
captureProductEvent('enterprise_lead_form_viewed', { source })

// novo evento no mailto:
captureProductEvent('enterprise_mailto_clicked', { source })
```

## 6. Sucesso

- [ ] Os 3 CTAs "Falar com comercial" levam a `/para-contadores?intent=enterprise#contato` e o scroll cai sobre o formulário.
- [ ] O CTA "Entrar na lista →" (`/para-contadores:188`) leva a `#contato` (sem intent) e cumpre a promessa de waitlist.
- [ ] Form renderizado com CTA "Falar com nosso comercial" e carteira pré-selecionada em `150+`.
- [ ] POST `/api/accountant-leads` aceita o payload e retorna 200; lead aparece em `accountant_leads` com flag `intent=enterprise` (se a tabela já tem coluna `intent`; senão, propriedade vai no PostHog).
- [ ] Mailto `contato@simulamei.com.br` visível ao lado/abaixo do form.
- [ ] Copy `:246` realinhada à realidade.
- [ ] `npm test -- --run` continua verde.
- [ ] PostHog: `enterprise_lead_form_viewed` dispara ao chegar com `?intent=enterprise`.

## 7. Riscos e mitigações

- **Coluna `intent` na tabela `accountant_leads`**: pode não existir. Mitigação: lead passa **sem** `intent` no INSERT, mas o PostHog recebe `intent: 'enterprise'` em `accountant_signup_interest`. Se quisermos persistir, criar migration 013 separada.
- **Faixa `150+` em `ACCOUNTANT_CLIENT_RANGES`**: verificar antes de codar W1. Se não existe, decidir entre adicionar (1 linha, PR separado pequeno) ou usar a faixa máxima atual.
- **Scroll para âncora com query string**: comportamento do Next App Router às vezes ignora o hash quando há query. Mitigação: ScrollToFocusedPlan (já existente) demonstra o padrão; reutilizar lógica de useEffect que faz `document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })`.
- **Spam de leads enterprise sem validação**: rate limit do endpoint já está em pé (namespace `'accountant_leads'`). Confirmar limites antes do release.

## 8. Não-objetivos (explícitos)

- ❌ Não criar página `/contato` separada.
- ❌ Não trocar o stack de e-mail (Resend continua sendo o canal de auto-resposta futura).
- ❌ Não introduzir Calendly nem WhatsApp clickable.
- ❌ Não refatorar `AccountantLeadForm` — só adicionar a prop `intent`.
- ❌ Não tocar nas rotas de auth/checkout — esse spec é cirúrgico em `/para-contadores` + 3 hrefs.

## 9. Conexão com specs irmãos

- `2026-05-20-auth-deeplink-simulator-design.md` — cobre `/dashboard/simular`.
- `2026-05-20-auth-deeplink-relatorio-design.md` — cobre `/dashboard/relatorio`.
- **Este spec** — cobre `/para-contadores` como destino do Enterprise CTA.
- **Pendente (próximo spec)** — `auth-deeplink-checkout-contador-design.md` (preservar `?plan=` em login/registro para Starter/Pro do contador). Conversado mas não escrito.

## 10. Estimativa

- Implementação: 1-2h (subagent-driven ou inline).
- Testes: ~30min (form com nova prop, snapshot do CTA copy, integração com API mock).
- Total: meio dia de trabalho focado.

---

*Arquivos tocados:*
- `src/components/accountant/AccountantLeadForm.tsx` (prop `intent`, copy variants)
- `src/app/para-contadores/page.tsx` (renderiza form em `:344` antes do `<footer>`, copy mentirosa em `:246`, href do "Entrar na lista" em `:188`, section `#contato`)
- `src/app/upgrade/contador/page.tsx` (href Enterprise `:461` ou próximo)
- `src/app/contador/assinatura/page.tsx` (href Enterprise `:507` ou próximo)
- `src/app/upgrade/page.tsx` (data object `:107`)
- `src/lib/accountant/leads.ts` (talvez `'150+'` em `ACCOUNTANT_CLIENT_RANGES` — verificar antes)
