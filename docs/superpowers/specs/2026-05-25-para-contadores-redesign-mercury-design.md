# Redesign /para-contadores em Mercury aesthetic — design

**Data:** 2026-05-25 · **Status:** pronto para CLI executar · **Tipo:** P1 marketing / conversion B2B
**Origem:** brainstorm 2026-05-25 (Iago) + diagnóstico de 3 fricções na landing atual

## 1. Objetivo

`https://simulamei.com.br/para-contadores` hoje sofre de 3 fricções de conversão:

1. **Página em dois estados** — coexistem CTA de trial ("Comece grátis"), link pra `/upgrade/contador` (planos), e formulário de waitlist (`AccountantLeadForm` com intent `waitlist`/`enterprise`). Contador não sabe se compra, testa ou espera.
2. **Zero prova social específica de contador** — claim "18.300+ simulações" prova uso do simulador B2C, não que existe escritório pagando. Sem logos, sem depoimentos.
3. **Sem screenshot real do painel** — só `painel-contador-preview.svg` ilustrativo. Contador quer ver a tela antes de preencher formulário.

Objetivo do redesign: **uma landing B2B única, sem ambiguidade, com prova real do produto entregando.** Mata waitlist. CTA único: trial de 7 dias → onboarding → Stripe cobra no dia 8.

## 2. Estado atual (verificado)

### Página `src/app/para-contadores/page.tsx`

- 446 linhas, server component
- 2 estados via query param: `intent=waitlist` (default) e `intent=enterprise`
- Hero: "Monitore todos os seus MEIs antes do teto virar problema" + subhead jargonístico ("transforma o motor fiscal do SimulaMEI...")
- 4 value points genéricos em cards (Carteira em risco / Relatórios / Alertas / API)
- Preview do painel: `<Image src="/images/painel-contador-preview.svg" />` (SVG ilustrativo, não real)
- Tabela de planos (Starter R$97 / Pro R$247 / Enterprise sob consulta) em layout estreito
- Sidebar com "Trial 14 dias grátis" + CTA "Criar conta e começar grátis" → `/onboarding/contador`
- Link secundário "Comparativo Starter · Pro · Enterprise" → `/upgrade/contador`
- Seção "Contato" com `<AccountantLeadForm intent={intent} />` (waitlist OU enterprise)
- Footer minimal

### Componente `src/components/accountant/AccountantLeadForm.tsx`

Captura lead em `accountant_leads` table. Aparece SÓ em `/para-contadores`. Pós-redesign, **não é mais consumido em página alguma**.

### Trial atual

Atualmente texto da página fala "14 dias grátis". Backend (`AccountantShell.TrialBadge`) calcula `trial_ends_at` baseado no que foi setado em `office.trial_ends_at` no onboarding. Mudar pra 7 dias exige ajuste no backend (`/onboarding/contador` ou cálculo de `trial_ends_at`).

## 3. Decisões (fechadas)

### Posicionamento

- **URL mantida**: `/para-contadores`. Sem redirect, sem subdomínio, sem `/escritorios`.
- **Trial encurtado de 14 → 7 dias** (decisão estratégica do owner — mais agressivo no funil, alinhado com práticas atuais de SaaS B2B).
- **Mata o waitlist**. `AccountantLeadForm` removido da página (DELETE da component se nenhum outro consumer; senão deprecar marcadamente). Endpoint `/api/accountant-leads` mantido por enquanto (legado), mas spec separado avalia remoção.
- **Mata o intent dual** (`?intent=enterprise`). Plano Enterprise vira CTA "Falar com vendas" → `mailto:contato@simulamei.com.br` com subject pre-fillado.
- **CTA único primário** em todos os pontos: "Avaliar grátis" (ou "Comece grátis 7 dias" no hero). Endpoint: `/onboarding/contador`.
- **CTA secundário** apenas no hero: "Ver planos e preços" → âncora `#pricing` na mesma página (smooth scroll), NÃO link pra `/upgrade/contador`.

### Direção visual (Mercury / Ramp editorial)

Referências: mercury.com, ramp.com, brex.com.

- **Background principal**: off-white `#f5f3ee`
- **Background alt** (seção screenshot): `#fff`
- **Background footer**: navy `#1a2434`
- **Texto primário**: `#1a2434`
- **Texto secundário**: `#56616f`
- **Texto on-dark primário**: `#f5f3ee`
- **Texto on-dark muted**: `#a8b3c0` / `#6c7a8d`
- **Border**: `#d8d3c8`
- **Accent (CTAs Pro, badges destaque)**: lime `#c8f135` (cor de marca do SimulaMEI, restrita)
- **Severidade (alertas no screenshot)**: red `#c92a2a` / orange `#e07c00` `#ff8a00` / yellow `#ffd54f` / blue `#489cff`
- **Typography**:
  - **Serif** Georgia (system font, zero load cost) → headlines + quotes (h1, h2, blockquote). NÃO importar Tiempos via `@next/font` — fonte do sistema basta pro tom Mercury, evita 30-50kb extra de payload
  - **System sans** (`-apple-system, BlinkMacSystemFont, ...`) → body
  - **JetBrains Mono** (já no `--mono` do design system) → números grandes, versões, URLs

### Slots, não fake

- **Depoimento**: render condicional. Componente `<AccountantTestimonial testimonials={Testimonial[]} />`. Se array vazio, seção INTEIRA não renderiza. Tarefa explícita: capturar 1-3 depoimentos reais antes do soft launch.
- **Logos de trust**: opcional. Se não houver, trust strip vira "frase + número" só. Sem placeholders "LOGO 1/LOGO 2/LOGO 3".
- **Screenshot real**: captura via Playwright contra Vercel preview com seed data (NÃO mockup). Tarefa de captura no W3 abaixo.

## 4. Workstreams

**P1 (esse spec):**

- **W1** — Hero + Trust strip (Mercury direction)
- **W2** — Problem → Solution (4 pares editorial)
- **W3** — Screenshot real do `/contador` com seed data + callouts
- **W4** — Depoimento + Pricing + FAQ + Footer
- **W5** — Cleanup: remover `AccountantLeadForm` da página, deprecar componente, atualizar `trial_ends_at` para 7 dias

**Não-objetivos** (excluídos deste spec, podem virar specs separados):

- Criar `/escritorios` ou subdomínio
- Rebuilds de `/onboarding/contador`, `/contador/*`, `/upgrade/contador`
- Refazer `AccountantLeadForm` para um novo propósito
- Tradução i18n
- A/B test entre variantes

## 5. Detalhes

### W1 — Hero + Trust strip

**Componente novo**: `src/components/landing/MercuryHero.tsx` (ou inline no `page.tsx` se simples — preferir inline pra evitar prop drilling de copy).

**Markup**:

```tsx
<section style={{ background: '#f5f3ee', color: '#1a2434', padding: '64px 32px 56px' }}>
  <div style={{ maxWidth: 1000, margin: '0 auto' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 32, alignItems: 'center' }}>
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(34px, 5vw, 52px)', lineHeight: 1.1, letterSpacing: '-0.5px', fontWeight: 600, margin: '0 0 18px' }}>
          A planilha de carteira MEI tem um custo.
        </h1>
        <p style={{ fontSize: 17, color: '#56616f', lineHeight: 1.55, margin: '0 0 28px', maxWidth: 540 }}>
          Cada cliente acima do teto = MEI desenquadrado, refaturamento, multa.
          SimulaMEI vigia tudo em painel. Teste 7 dias grátis — só cobramos se você ficar.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/onboarding/contador" className="mercury-cta-primary">Comece grátis 7 dias</Link>
          <a href="#pricing" className="mercury-cta-secondary">Ver planos e preços</a>
        </div>
        <p style={{ fontSize: 12, color: '#56616f', marginTop: 14 }}>
          Sem cartão de crédito · Cancele quando quiser · LGPD + consentimento explícito
        </p>
      </div>
      <PainelPreviewCard />  {/* mini-card mostrando 3 linhas do painel: João 93%, Maria 62%, Pedro ULTRAPASSOU */}
    </div>
  </div>
</section>
```

`PainelPreviewCard` é mockup compacto (3 linhas estáticas) — NÃO usa screenshot real (esse é da seção 3). Serve apenas como peek do hero.

**Trust strip** (faixa estreita logo abaixo do hero):

```tsx
// Constantes no topo do page.tsx
const LOGGED_CITIES = ['SP', 'RJ', 'MG', 'RS'] as const  // SLOT: ajustar quando soft-launch
const TRUST_LOGOS: { src: string; alt: string; width: number; height: number }[] = []  // SLOT: vazio até ter logos REAIS de escritórios. NUNCA inventar.

// Render
<section style={{ background: '#fff', borderBottom: '1px solid #e0ddd5', padding: '24px 32px' }}>
  <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
    <p style={{ fontSize: 13, color: '#56616f', maxWidth: 320, margin: 0 }}>
      {LOGGED_CITIES.length > 0
        ? <>Usado por escritórios em <strong>{LOGGED_CITIES.join(', ')}</strong> para gerir carteiras MEI sem planilha.</>
        : 'Para escritórios contábeis no Brasil que querem gerir carteiras MEI sem planilha.'}
    </p>
    {TRUST_LOGOS.length > 0 ? (
      <div style={{ display: 'flex', gap: 28, alignItems: 'center', opacity: 0.6 }}>
        {TRUST_LOGOS.map(logo => <Image key={logo.alt} {...logo} />)}
      </div>
    ) : null}
  </div>
</section>
```

Quando `TRUST_LOGOS` vazio, só renderiza a frase (centro). Quando cidades vazias, frase fallback genérica.

### W2 — Problem → Solution

Componente inline:

```tsx
<section style={{ background: '#f5f3ee', padding: '56px 32px' }}>
  <div style={{ maxWidth: 920, margin: '0 auto' }}>
    <div className="mercury-eyebrow">QUATRO COISAS QUE O PAINEL RESOLVE</div>
    <h2 className="mercury-h2">Cada bloco abaixo é um problema que você já viveu — e como o painel responde.</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '56px 48px', marginTop: 48 }}>
      {PROBLEMS.map(({ id, problem, response }) => (
        <article key={id}>
          <div className="mercury-label-red">{id} · O PROBLEMA</div>
          <p className="mercury-problem-quote">"{problem}"</p>
          <div style={{ borderTop: '1px solid #d8d3c8', paddingTop: 16, marginTop: 18 }}>
            <div className="mercury-label-muted">→ A RESPOSTA</div>
            <p className="mercury-response">{response}</p>
          </div>
        </article>
      ))}
    </div>
  </div>
</section>
```

`PROBLEMS` array:

```ts
const PROBLEMS = [
  {
    id: '01',
    problem: 'Descobri que o Pedro passou do teto quando ele me ligou em pânico em dezembro.',
    response: <>Painel mostra todo mês quem está perto do limite. <strong>Alerta automático antes do 5º dia útil</strong>, com semáforo (verde &lt;80% · amarelo 80-95% · vermelho ≥95%) e projeção do mês corrente.</>,
  },
  {
    id: '02',
    problem: "Toda conversa de 'precisamos mudar o regime' começa do zero — abro Excel, calculo, mando PDF improvisado.",
    response: <>Um clique gera relatório com <strong>regime atual vs. Simples (LP/LR), pró-labore mínimo, anexo III/V por Fator R</strong>. PDF assinado pelo seu escritório (no Pro), pronto pra mandar pro cliente.</>,
  },
  {
    id: '03',
    problem: 'Quem na minha carteira é Anexo III? Quem é V? Quem está prestes a virar por Fator R?',
    response: <>Coluna no painel calcula <strong>Fator R rolling-12</strong>, sinaliza anexo provável e aciona alerta quando algum cliente cruza a fronteira 0.28. Histórico mensal pra você comparar.</>,
  },
  {
    id: '04',
    problem: 'Quando a carteira passou de 50 MEIs, parei de acompanhar cliente a cliente. A planilha não escala.',
    response: <>Plano Pro: <strong>API REST + CSV mensal + webhook de alertas</strong>. Integra com sua ferramenta interna, cron de NFe ou agente que já roda. 150 clientes inclusos, Enterprise pra mais.</>,
  },
] as const
```

CSS:

```css
.mercury-eyebrow { font-size: 11px; color: #56616f; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; margin-bottom: 12px; }
.mercury-h2 { font-family: Georgia, serif; font-size: clamp(24px, 3vw, 32px); line-height: 1.15; letter-spacing: -0.5px; color: #1a2434; max-width: 640px; }
.mercury-label-red { font-family: Georgia, serif; font-size: 14px; color: #c92a2a; font-weight: 700; margin-bottom: 8px; }
.mercury-problem-quote { font-family: Georgia, serif; font-size: 20px; line-height: 1.35; color: #1a2434; font-style: italic; font-weight: 500; }
.mercury-label-muted { font-size: 11px; color: #56616f; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 8px; }
.mercury-response { font-size: 14px; line-height: 1.55; color: #1a2434; }
```

### W3 — Screenshot real do `/contador` com seed data

**Subtarefas:**

1. **Seed data script** (`scripts/seed-painel-screenshot.ts`):
   - Cria 1 office "Munhoz & Associados", plan='pro', trial_ends_at=now+5d
   - 28 office_clients: 23 ativos (5 cadastrados nas últimas 24h pra "Clientes recentes"), 2 pausados manual, 3 pausados-plan
   - 4 alertas abertos: 1 danger (Pedro 103% teto), 2 warn (João 93% teto, Carlos Fator R), 1 info (DAS vence 5d)
   - 3 alertas resolvidos recentemente (pra mostrar collapsible)
   - CNPJs com checksum mod-11 válido (helper já existe em `src/lib/validators/cnpj.ts`?)

2. **Capture script** (`scripts/capture-painel-screenshot.ts`):
   - Roda Playwright em headless mode
   - Visita `localhost:3000/contador` autenticado
   - Set viewport 1280x1024
   - `page.screenshot({ path: 'public/images/painel-contador-real-2026-05.png', fullPage: true })`
   - Otimiza PNG com `sharp` (max 200kb)

3. **Componente** `src/components/landing/PainelScreenshot.tsx`:

```tsx
import Image from 'next/image'

export function PainelScreenshot() {
  return (
    <section style={{ background: '#fff', padding: '64px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="mercury-eyebrow">O PAINEL EM 30 SEGUNDOS</div>
          <h2 className="mercury-h2" style={{ margin: '0 auto 14px', maxWidth: 720 }}>Uma tela. Toda a sua carteira MEI.</h2>
          <p style={{ fontSize: 15, color: '#56616f', maxWidth: 540, margin: '0 auto' }}>
            Captura real do painel com dados de teste (23 MEIs). Não é mockup.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 32, alignItems: 'start' }}>
          {/* Screenshot card com browser chrome */}
          <figure style={{ background: '#f5f3ee', borderRadius: 6, padding: 10, boxShadow: '0 8px 28px rgba(26,36,52,0.10)', margin: 0 }}>
            <BrowserChrome url="simulamei.com.br/contador" />
            <Image
              src="/images/painel-contador-real-2026-05.png"
              alt="Painel contador com 23 clientes MEI, 4 alertas abertos (1 crítico, 2 atenção, 1 info), stats de carteira ativa, total cadastrados, pausados manual e pausados por plano"
              width={1200}
              height={780}
              style={{ width: '100%', height: 'auto', borderRadius: 3 }}
            />
          </figure>

          {/* Callouts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {CALLOUTS.map(({ n, title, body }) => (
              <div key={n} style={{ borderLeft: '3px solid #ff8a00', paddingLeft: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className="mercury-callout-marker">{n}</span>
                  <strong style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#1a2434' }}>{title}</strong>
                </div>
                <p style={{ fontSize: 12, color: '#56616f', lineHeight: 1.5, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const CALLOUTS = [
  { n: 1, title: 'Barra de carteira', body: <><strong>23 / 30</strong> com barra colorida adaptativa (lime &lt;80%, amarelo 80-95%, vermelho ≥95%). Calcula sozinho. Você sabe na primeira olhada se cabe mais cliente.</> },
  { n: 2, title: 'Alertas com severidade', body: <>Sistema dispara alertas quando simulação passa de <strong>70/80/95/100%</strong> do teto, vira anexo por Fator R ou DAS está pra vencer. Cores: azul info, amarelo atenção, vermelho crítico. Resolver inline.</> },
  { n: 3, title: 'Pausados por plano', body: <>Quando carteira cresce além do limite, sistema pausa o último cadastrado e mostra quantos ficaram de fora. Link direto pra upgrade. Sem perder o cliente, só pausa.</> },
  { n: 4, title: 'Trial badge persistente', body: <>Pill com "X dias de trial · Escolher plano →" presente em todas as abas. Cor pulsa de lime &gt;14d para vermelho ≤3d. Conversão sem ser invasiva.</> },
]
```

**Trade-off**: screenshot pode envelhecer quando UI do `/contador` mudar. Documentar no spec que recaptura é trigger explícito quando algum dos 4 componentes (`AccountantShell`, `OfficeStatsCards`, `OfficeAlertsPanel`, `OfficeClientTable`) muda visualmente. Adicionar `// SCREENSHOT-AFFECT: re-capture painel-contador` comentário nos arquivos relevantes.

### W4 — Depoimento + Pricing + FAQ + Footer

#### Depoimento

```tsx
// src/components/landing/AccountantTestimonial.tsx
interface Testimonial {
  quote: string
  author: { name: string; office: string; city: string; clientCount: number; photo?: string }
}

export function AccountantTestimonial({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null  // sem fake

  const [primary] = testimonials  // por enquanto mostra só 1; futuro: carousel

  return (
    <section style={{ background: '#f5f3ee', padding: '48px 32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <div className="mercury-eyebrow" style={{ marginBottom: 24 }}>O QUE DIZEM OS ESCRITÓRIOS</div>
        <blockquote style={{ margin: 0 }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 24, lineHeight: 1.4, color: '#1a2434', fontStyle: 'italic', fontWeight: 500, margin: '0 0 24px' }}>
            "{primary.quote}"
          </p>
          <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            {primary.author.photo ? (
              <Image src={primary.author.photo} alt={primary.author.name} width={48} height={48} style={{ borderRadius: '50%' }} />
            ) : (
              <AvatarFallback name={primary.author.name} />
            )}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: '#1a2434', fontSize: 14 }}>{primary.author.name}</div>
              <div style={{ color: '#56616f', fontSize: 12 }}>
                {primary.author.office} · {primary.author.city} · {primary.author.clientCount} clientes MEI
              </div>
            </div>
          </footer>
        </blockquote>
      </div>
    </section>
  )
}
```

**`testimonials` é constante no `page.tsx`**: array vazio até soft launch ter dados reais. Documentar no comentário do array: `// SLOT: preencher com depoimentos REAIS (mesmo de amigo contador). NUNCA inventar.`

#### Pricing

```tsx
// src/components/landing/PricingTable.tsx
const PLANS = [
  { key: 'starter', name: 'Starter', price: 'R$ 97', priceSuffix: '/mês', desc: 'Para escritórios começando carteira MEI.', features: ['Até 30 clientes MEI ativos', 'Painel com alertas + Fator R + anexo', 'Relatório PDF por cliente', '1 owner + 1 colaborador'], excluded: ['Sem API, sem CSV exportação'], cta: 'Avaliar Starter grátis', highlight: false },
  { key: 'pro', name: 'Pro', price: 'R$ 247', priceSuffix: '/mês', desc: 'Para carteiras crescendo + integração técnica.', features: ['Até 150 clientes MEI ativos', 'Tudo do Starter +', 'API REST + webhook de alertas', 'CSV mensal exportação', 'PDF com marca do escritório', 'Histórico mensal (rolling-12)'], cta: 'Avaliar Pro grátis', highlight: true, badge: 'Mais escolhido' },
  { key: 'enterprise', name: 'Enterprise', price: 'Sob consulta', priceSuffix: '', desc: 'Para escritórios > 150 clientes ou exigências de contrato.', features: ['Carteira sem limite', 'Tudo do Pro +', 'Multi-seat (vários colaboradores)', 'White-label completo', 'SLA + integrações sob contrato', 'Suporte prioritário'], cta: 'Falar com vendas', highlight: false, ctaHref: 'mailto:contato@simulamei.com.br?subject=Plano%20Enterprise' },
]
```

Renderiza grid 3 colunas (`repeat(auto-fit, minmax(min(100%, 280px), 1fr))` no mobile vira coluna). Pro com border navy 2px + badge "Mais escolhido" + CTA lime.

CTAs Starter/Pro vão pra `/onboarding/contador?plan={key}` (mantém context do plano escolhido pra UI de billing pós-trial sugerir o certo). Enterprise vai pra mailto.

#### FAQ

`<details>`/`<summary>` HTML nativo (sem JS, sem accordion lib). Primeira pergunta `open` por default.

```tsx
const FAQS = [
  { q: 'Como funciona o trial de 7 dias?', a: 'Você cria a conta sem cartão, cadastra até 30 MEIs, usa todas as features do Pro durante 7 dias. No dia 8, escolhe um plano e paga via Stripe. Se não escolher, a conta entra em modo leitura — você não perde dados, mas não cadastra novos clientes nem dispara alertas.', open: true },
  { q: 'O cliente MEI final vê o painel?', a: 'Não. O painel é só do escritório. O cliente MEI recebe apenas o que você manda (PDF de relatório, alerta por e-mail se você ativar). Os dados ficam isolados por escritório via RLS no Supabase — outros contadores não veem sua carteira.' },
  { q: 'Posso importar minha lista atual de MEIs?', a: 'Plano Starter: cadastro um a um (formulário rápido com CNPJ → preenche CNAE, nome, UF automaticamente). Plano Pro: importação CSV em lote + API REST se você quiser sincronizar com outro sistema (ex: planilha do Google Sheets que já mantém).' },
  { q: 'Como funcionam os alertas?', a: 'Quando uma simulação registra que o cliente passou de 70%, 80%, 95% ou 100% do teto MEI, ou cruzou a fronteira de Fator R (0.28), ou está perto do vencimento do DAS, o sistema cria um alerta no painel (badge vermelho/amarelo/azul por severidade). Você pode resolver inline. No plano Pro, alertas também viram webhook pra integração externa.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim, sem fidelidade. Cancelamento na própria aba "Assinatura" → Stripe Customer Portal → cancelar. Mantém acesso até o fim do ciclo cobrado. Dados ficam disponíveis pra exportação por 30 dias após cancelar.' },
  { q: 'E sobre LGPD e os dados dos meus clientes?', a: 'Coleta consentida (você confirma ao cadastrar cada cliente que tem autorização). Multi-tenancy por RLS (escritório A não acessa cliente do escritório B). Logs com IP pseudonimizado por HMAC-SHA256. Dados em Supabase com criptografia at-rest. Solicitações LGPD (consulta, exclusão, portabilidade) atendidas em até 15 dias pelo escritório owner.' },
]
```

#### Footer

```tsx
<footer style={{ background: '#1a2434', color: '#f5f3ee' }}>
  <div style={{ padding: '48px 32px', textAlign: 'center', borderBottom: '1px solid #2d4263' }}>
    <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, lineHeight: 1.15, margin: '0 0 12px' }}>7 dias grátis. Sem cartão.</h2>
    <p style={{ fontSize: 13, color: '#a8b3c0', maxWidth: 460, margin: '0 auto 20px' }}>Cadastra até 30 MEIs no trial. Decide no dia 8.</p>
    <Link href="/onboarding/contador" className="mercury-cta-primary-lime">Avaliar grátis</Link>
  </div>
  <div style={{ padding: '36px 32px 24px' }}>
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr repeat(3, 1fr)', gap: 32 }}>
      <BrandColumn />
      <LinkColumn title="Produto" links={[['/para-contadores', 'Para contadores'], ['/', 'Simulador (B2C)'], ['/api-docs', 'API e integrações'], ['/metodologia', 'Metodologia fiscal']]} />
      <LinkColumn title="Recursos" links={[['/aprenda', 'Aprenda'], ['/cnae', 'CNAEs MEI'], ['mailto:contato@simulamei.com.br', 'Suporte']]} />
      <LinkColumn title="Legal" links={[['/termos', 'Termos'], ['/privacidade', 'Privacidade & LGPD'], ['mailto:contato@simulamei.com.br', 'Contato comercial']]} />
    </div>
    <div style={{ maxWidth: 1000, margin: '24px auto 0', paddingTop: 18, borderTop: '1px solid #2d4263', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#6c7a8d', flexWrap: 'wrap', gap: 12 }}>
      <div>© 2026 SimulaMEI · Operado por SimulaMEI</div>
      <div style={{ fontFamily: 'var(--mono)' }}>motor fiscal {TAX_RULE_VERSION} · {SIMULATION_COUNT_DISPLAY}</div>
    </div>
  </div>
</footer>
```

- **CNPJ**: NÃO mostra. Texto "Operado por SimulaMEI" cobre. Quando tiver CNPJ real, atualizar (decisão expressa pelo owner anteriormente: NUNCA inventar CNPJ).
- **SIMULATION_COUNT_DISPLAY**: por enquanto string `"18.300+ simulações"` (hardcoded round number). TODO no spec: wire pra contagem real via PostHog ou DB. NÃO bloqueia launch.

### W5 — Cleanup

- **Deletar** `AccountantLeadForm` da page `/para-contadores`. Verificar se componente é consumido em outro lugar (`grep -r "AccountantLeadForm"`). Se não, deletar componente + test file. Se sim, deprecar (`@deprecated` JSDoc) + manter compilável.
- **Deletar** lógica de `intent={'waitlist'|'enterprise'}` na page.
- **Atualizar** trial padrão de 14 → 7 dias. Localizar via `grep -rn "14" src/lib/accountant/ src/app/onboarding/contador/ src/app/api/onboarding/` por constantes/literais. Suspeitos prováveis: constante `TRIAL_DAYS` ou `TRIAL_DURATION_DAYS` em `src/lib/accountant/billing.ts`, ou cálculo inline em `/api/onboarding/contador/route.ts`. Mudança aplica SÓ a novos onboardings — trials em andamento mantêm prazo original (não tocar em rows existentes de `accountant_offices.trial_ends_at`).
- **Adicionar comentário** `// SCREENSHOT-AFFECT: re-capture painel-contador` em:
  - `src/components/accountant/AccountantShell.tsx`
  - `src/components/accountant/OfficeStatsCards.tsx`
  - `src/components/accountant/OfficeAlertsPanel.tsx`
  - `src/components/accountant/OfficeClientTable.tsx`
- **Metadata** da page atualizada (já existente mas revisar): title, description, OG image (gerar OG novo se viável).

## 6. Sucesso

- [ ] `/para-contadores` redesignada em Mercury aesthetic (off-white, navy, serif Georgia)
- [ ] `AccountantLeadForm` removido da page; `intent={waitlist|enterprise}` deletado
- [ ] Trial em 7 dias (não mais 14) — backend + copy alinhados
- [ ] Hero com CTA único primário "Comece grátis 7 dias" + secundário "#pricing"
- [ ] 4 pares Problem → Solution exatos (lista em PROBLEMS array)
- [ ] Screenshot real de `/contador` capturado via Playwright com seed (23 MEIs, 4 alertas) → `/public/images/painel-contador-real-2026-05.png` ≤200kb
- [ ] 4 callouts numerados ao lado do screenshot (laranja border-left)
- [ ] Seção depoimento renderiza condicionalmente (vazio = não aparece)
- [ ] Pricing 3 colunas (Pro destacado com badge "Mais escolhido" + border 2px navy + CTA lime)
- [ ] FAQ 6 perguntas com `<details>` nativo, primeira aberta
- [ ] Footer navy com link map 4 colunas + CTA final + meta com `TAX_RULE_VERSION` e `SIMULATION_COUNT_DISPLAY`
- [ ] CNPJ NÃO inventado (uso "Operado por SimulaMEI" até ter real)
- [ ] Comentários `SCREENSHOT-AFFECT` nos 4 componentes do painel
- [ ] Mobile responsivo (testar em 360px, 768px, 1024px, 1280px)
- [ ] A11y: headings hierárquicos, alt em images, color contrast AA, `<details>` keyboard-navegável
- [ ] `npx tsc --noEmit` limpo
- [ ] Suite verde (testes existentes não quebram)
- [ ] Lighthouse Mobile ≥ 90 em Performance / Accessibility / Best Practices
- [ ] Manual: contador em viewport 360px consegue ler hero, ver pricing, clicar CTA

## 7. Não-objetivos

- ❌ Criar `/escritorios` ou subdomínio separado
- ❌ Reescrever `/onboarding/contador`, `/upgrade/contador`, ou rotas `/contador/*`
- ❌ Mudanças no backend de `office_subscriptions`, `office_clients`, `office_alerts`
- ❌ Refazer `AccountantLeadForm` para novo propósito (deletar/depreciar simplesmente)
- ❌ A/B test entre Mercury e direção alternativa
- ❌ Tradução i18n
- ❌ Live data feed em SIMULATION_COUNT_DISPLAY (hardcode "18.300+" por enquanto)
- ❌ Tema light/dark toggle no /para-contadores (mantém Mercury fixo)

## 8. Riscos

- **Depoimento vazio no launch** — seção INTEIRA não renderiza, página fica mais curta. Owner precisa entregar 1-3 depoimentos REAIS antes do soft launch (ex: pedir pra colega contador). Bloqueia "completude visual" mas não a página em si.
- **Screenshot envelhece** — quando UI de `/contador` mudar visualmente, screenshot vira mentira. Mitigação: comentários `SCREENSHOT-AFFECT` nos 4 componentes + checklist no PR template "re-capture screenshot se mexeu em [componentes]".
- **Trial 7 dias quebra accounts em trial atual** — se há contadores ativos com `trial_ends_at` setado pra +14 dias, mudar lógica afeta retroativamente? Verificar: a mudança deve ser SÓ pra novos onboardings (`now + 7 days` em vez de `now + 14 days`), trials em andamento mantêm prazo original. Backend check obrigatório.
- **`AccountantLeadForm` deletado mas test file fica órfão** — execução deve incluir delete de `AccountantLeadForm.test.ts` e remover dependências do `vitest.config.ts` se houver.
- **PostHog events do form de lead deixam de disparar** — pode quebrar dashboards/funis. Verificar `grep -r "accountant_lead"` em código + PostHog. Se houver dashboard de leads, depreciar com comunicação.
- **SEO impact** — URL não muda, mas conteúdo sim. Google pode re-indexar e oscilar ranking temporariamente. Aceitável (página atual não rankeia bem mesmo).
- **CTA secundário do hero (`#pricing`) sem smooth scroll** — JS de smooth scroll deve estar no `globals.css` (`html { scroll-behavior: smooth }`). Verificar.

## 9. Estimativa

- W1 Hero + Trust strip: 1h
- W2 Problem → Solution: 30min
- W3 Screenshot (seed + capture + componente): 2h (1h seed script + 30min Playwright + 30min componente)
- W4 Depoimento + Pricing + FAQ + Footer: 1.5h
- W5 Cleanup (AccountantLeadForm delete, trial 14→7d, comments): 1h
- Responsive + a11y polish: 1h
- **Total**: ~7h de subagent + review

## 10. Dependências

- **Bloqueia**: nada — pode rodar em paralelo com qualquer outro spec
- **Bloqueado por**: nada — UI source (`/contador`) já existe e foi auditada (commits da branch `fix/audit-2026-05-25-p0-security`)
- **Sinergias**:
  - Spec #1 (rotação secrets) deve ser executado antes de capturar screenshot em Vercel preview com dados reais
  - Specs #2/#3/#4/#5 (já implementados em `fix/audit-2026-05-25-p0-security`) viabilizam claims de segurança no FAQ

## 11. Decisões pendentes (owner)

- [ ] **Depoimentos**: quem você pode pedir 1-3 quotes reais antes do soft launch? Sem isso, seção fica vazia.
- [ ] **Lista de cidades** na trust strip: confirma SP/RJ/MG/RS ou ajusta?
- [ ] **CNPJ**: confirma manter "Operado por SimulaMEI" até ter real?
- [ ] **Logos de escritórios**: você tem alguma carteira piloto que aceitaria emprestar logo? Se não, trust strip fica só com frase.

Essas decisões NÃO bloqueiam execução do spec — são slots/fallbacks documentados. Mas se você responder antes da execução, implementer pode preencher direto.

---

*Arquivos tocados:*
- `src/app/para-contadores/page.tsx` (rewrite quase total)
- `src/components/accountant/AccountantLeadForm.tsx` (delete ou deprecate)
- `src/components/accountant/AccountantLeadForm.test.ts` (delete se componente for deletado)
- `src/components/landing/MercuryHero.tsx` (novo, opcional — pode ser inline)
- `src/components/landing/PainelScreenshot.tsx` (novo)
- `src/components/landing/AccountantTestimonial.tsx` (novo)
- `src/components/landing/PricingTable.tsx` (novo)
- `src/components/landing/FaqSection.tsx` (novo)
- `src/components/landing/MercuryFooter.tsx` (novo)
- `src/components/accountant/AccountantShell.tsx` (comment SCREENSHOT-AFFECT)
- `src/components/accountant/OfficeStatsCards.tsx` (comment SCREENSHOT-AFFECT)
- `src/components/accountant/OfficeAlertsPanel.tsx` (comment SCREENSHOT-AFFECT)
- `src/components/accountant/OfficeClientTable.tsx` (comment SCREENSHOT-AFFECT)
- `scripts/seed-painel-screenshot.ts` (novo)
- `scripts/capture-painel-screenshot.ts` (novo)
- `public/images/painel-contador-real-2026-05.png` (novo, capturado via script)
- `/api/accountant-leads/route.ts` ou `/onboarding/contador` — ajustar trial 14→7 dias
