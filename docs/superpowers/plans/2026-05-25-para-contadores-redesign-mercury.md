# Para Contadores Mercury Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/para-contadores` as a focused B2B landing page for accountants, with trial copy aligned to 7 days, real dashboard proof, conservative compliance copy, and no automatic Stripe checkout after onboarding.

**Architecture:** Keep `/para-contadores` as a server page that composes small landing components. Put client-only tracking in a tiny CTA wrapper, keep fiscal/accountant constants centralized, and isolate screenshot seed/capture scripts under `scripts/` with explicit safety gates.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4/global CSS, Supabase SSR/admin, Vitest, Playwright, Sharp.

---

## File Structure

- Create `src/constants/accountant.ts`: shared accountant trial constants.
- Modify `src/app/api/accountant/onboarding/route.ts`: use `ACCOUNTANT_TRIAL_MS` instead of inline 14-day math.
- Modify `src/app/api/accountant/onboarding/route.test.ts`: assert new offices get `trial_ends_at = now + 7d`.
- Modify `src/app/onboarding/contador/redirect-urls.ts`: preserve selected plan as trial intent, never as `autocheckout`.
- Modify `src/app/onboarding/contador/redirect-urls.test.ts`: assert no success URL contains `autocheckout`.
- Modify `src/components/onboarding/AccountantOnboardingWizard.tsx`: continue using `buildOnboardingSuccessUrl(plan)`.
- Modify `src/app/contador/assinatura/page.tsx`: use 7-day trial constant in UI/progress.
- Modify `src/lib/analytics/events.ts`: add accountant landing CTA event names.
- Create `src/components/landing/AccountantLandingCta.tsx`: client CTA wrapper for analytics.
- Create `src/components/landing/AccountantTestimonial.tsx`: conditional testimonial section.
- Create `src/components/landing/PainelScreenshot.tsx`: real screenshot section and callouts.
- Create `src/components/landing/PricingTable.tsx`: Starter/Pro/Enterprise pricing.
- Create `src/components/landing/FaqSection.tsx`: native details/summary FAQ.
- Create `src/components/landing/MercuryFooter.tsx`: navy footer for landing.
- Rewrite `src/app/para-contadores/page.tsx`: compose landing sections and remove `intent`.
- Delete `src/components/accountant/AccountantLeadForm.tsx` and `src/components/accountant/AccountantLeadForm.test.ts` after verifying no consumer remains.
- Modify `src/components/layout/ContadoresSection.tsx` and `src/app/upgrade/contador/page.tsx`: update public copy from 14 to 7 days.
- Modify `src/components/accountant/AccountantShell.tsx`, `OfficeStatsCards.tsx`, `OfficeAlertsPanel.tsx`, `OfficeClientTable.tsx`: add `SCREENSHOT-AFFECT` comments.
- Modify `package.json`: add screenshot scripts and dev dependencies when installed.
- Create `scripts/seed-painel-screenshot.ts`: guarded Supabase seed for screenshot account.
- Create `scripts/capture-painel-screenshot.ts`: Playwright login/capture/optimize.
- Create `public/images/painel-contador-real-2026-05.png` or `.webp`: captured dashboard asset.

---

### Task 1: Preflight And Branch Hygiene

**Files:**
- Read: `AGENTS.md`
- Read: `docs/superpowers/specs/2026-05-25-para-contadores-redesign-mercury-design.md`
- No code changes

- [ ] **Step 1: Confirm branch and dirty files**

Run:

```powershell
git status --short --branch
node -v
npm -v
```

Expected:
- Current branch is the implementation branch, not `main`.
- Existing untracked files such as `output/`, `pnpm-lock.yaml`, or `pnpm-workspace.yaml` are not staged unless they are intentionally part of this task.

- [ ] **Step 2: Read the corrected spec**

Run:

```powershell
Get-Content -Path "docs\superpowers\specs\2026-05-25-para-contadores-redesign-mercury-design.md" -TotalCount 140
Select-String -Path "docs\superpowers\specs\2026-05-25-para-contadores-redesign-mercury-design.md" -Pattern "Sem auto-checkout|SCREENSHOT_SEED_ENABLED|FAQ promete|Trial atual"
```

Expected:
- Spec says trial is 7 days without card.
- Spec says checkout only opens after explicit click.
- Spec says seed is gated by `SCREENSHOT_SEED_ENABLED=1`.

---

### Task 2: Trial Constant And No Auto-Checkout Flow

**Files:**
- Create: `src/constants/accountant.ts`
- Modify: `src/app/api/accountant/onboarding/route.ts`
- Modify: `src/app/api/accountant/onboarding/route.test.ts`
- Modify: `src/app/onboarding/contador/redirect-urls.ts`
- Modify: `src/app/onboarding/contador/redirect-urls.test.ts`
- Inspect: `src/components/onboarding/AccountantOnboardingWizard.tsx`

- [ ] **Step 1: Create accountant constants**

Create `src/constants/accountant.ts`:

```ts
export const ACCOUNTANT_TRIAL_DAYS = 7
export const ACCOUNTANT_TRIAL_MS = ACCOUNTANT_TRIAL_DAYS * 24 * 60 * 60 * 1000
```

- [ ] **Step 2: Update onboarding API**

In `src/app/api/accountant/onboarding/route.ts`, add:

```ts
import { ACCOUNTANT_TRIAL_MS } from '@/constants/accountant'
```

Replace:

```ts
const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
```

With:

```ts
const trialEndsAt = new Date(Date.now() + ACCOUNTANT_TRIAL_MS).toISOString()
```

- [ ] **Step 3: Add deterministic 7-day test**

In `src/app/api/accountant/onboarding/route.test.ts`, add this import:

```ts
import { ACCOUNTANT_TRIAL_MS } from '@/constants/accountant'
```

Inside `beforeEach`, keep `vi.clearAllMocks()` and add:

```ts
vi.useRealTimers()
```

In the test `creates an office and owner membership for a valid payload`, set fixed time before calling `POST`:

```ts
const now = new Date('2026-05-25T12:00:00.000Z')
vi.useFakeTimers()
vi.setSystemTime(now)
```

Then after `expect(admin.insertMock).toHaveBeenCalledWith(...)`, add:

```ts
const insertedOffice = admin.insertMock.mock.calls[0][0]
expect(insertedOffice.trial_ends_at).toBe(
  new Date(now.getTime() + ACCOUNTANT_TRIAL_MS).toISOString(),
)
```

Add this at the end of that test:

```ts
vi.useRealTimers()
```

- [ ] **Step 4: Remove auto-checkout from success redirect**

In `src/app/onboarding/contador/redirect-urls.ts`, replace the contract comment for success URL with:

```ts
 * - `buildOnboardingSuccessUrl`: destino pós-criação do escritório.
 *   Se o usuário veio com plan, preserva a intenção para o painel sugerir
 *   plano depois do trial, sem abrir Stripe automaticamente.
```

Replace `buildOnboardingSuccessUrl` with:

```ts
export function buildOnboardingSuccessUrl(plan: AccountantPaidPlan | null): string {
  if (plan) {
    return `/contador?trial_started=1&intended_plan=${plan}`
  }
  return '/contador'
}
```

- [ ] **Step 5: Update redirect tests**

In `src/app/onboarding/contador/redirect-urls.test.ts`, replace the two success tests that expect `/upgrade/contador?autocheckout=...` with:

```ts
  it('forwards to contador with intended_plan=pro and no autocheckout when plan is pro', () => {
    const url = buildOnboardingSuccessUrl('pro')
    expect(url).toBe('/contador?trial_started=1&intended_plan=pro')
    expect(url).not.toContain('autocheckout')
  })

  it('forwards to contador with intended_plan=starter and no autocheckout when plan is starter', () => {
    const url = buildOnboardingSuccessUrl('starter')
    expect(url).toBe('/contador?trial_started=1&intended_plan=starter')
    expect(url).not.toContain('autocheckout')
  })
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
npm run test -- src/app/onboarding/contador/redirect-urls.test.ts src/app/api/accountant/onboarding/route.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/constants/accountant.ts src/app/api/accountant/onboarding/route.ts src/app/api/accountant/onboarding/route.test.ts src/app/onboarding/contador/redirect-urls.ts src/app/onboarding/contador/redirect-urls.test.ts
git commit -m "Corrige trial contador para 7 dias sem checkout automático"
```

---

### Task 3: Landing Analytics CTA Wrapper

**Files:**
- Modify: `src/lib/analytics/events.ts`
- Create: `src/components/landing/AccountantLandingCta.tsx`

- [ ] **Step 1: Add event names**

In `src/lib/analytics/events.ts`, add these values to `ProductEventName`:

```ts
  | 'accountant_landing_cta_clicked'
  | 'accountant_enterprise_mailto_clicked'
```

- [ ] **Step 2: Create CTA component**

Create `src/components/landing/AccountantLandingCta.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { captureProductEvent } from '@/lib/analytics/events'
import type { AccountantPaidPlan } from '@/lib/accountant/billing'

type CtaVariant = 'primary' | 'secondary' | 'lime' | 'dark'

interface AccountantLandingCtaProps {
  href: string
  children: React.ReactNode
  source: string
  plan?: AccountantPaidPlan | 'enterprise'
  variant?: CtaVariant
  className?: string
}

function getClassName(variant: CtaVariant, className?: string) {
  const base = variant === 'secondary'
    ? 'mercury-cta-secondary'
    : variant === 'lime'
      ? 'mercury-cta-primary-lime'
      : variant === 'dark'
        ? 'mercury-cta-dark'
        : 'mercury-cta-primary'

  return className ? `${base} ${className}` : base
}

export function AccountantLandingCta({
  href,
  children,
  source,
  plan,
  variant = 'primary',
  className,
}: AccountantLandingCtaProps) {
  const isMailto = href.startsWith('mailto:')
  const classNames = getClassName(variant, className)

  function handleClick() {
    captureProductEvent(
      isMailto ? 'accountant_enterprise_mailto_clicked' : 'accountant_landing_cta_clicked',
      { source, plan: plan ?? null, href },
    )
  }

  if (isMailto) {
    return (
      <a href={href} onClick={handleClick} className={classNames}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} onClick={handleClick} className={classNames}>
      {children}
    </Link>
  )
}
```

- [ ] **Step 3: Run type check**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```powershell
git add src/lib/analytics/events.ts src/components/landing/AccountantLandingCta.tsx
git commit -m "Adiciona tracking de CTAs da landing contador"
```

---

### Task 4: Landing Components

**Files:**
- Create: `src/components/landing/AccountantTestimonial.tsx`
- Create: `src/components/landing/FaqSection.tsx`
- Create: `src/components/landing/PricingTable.tsx`
- Create: `src/components/landing/PainelScreenshot.tsx`
- Create: `src/components/landing/MercuryFooter.tsx`

- [ ] **Step 1: Create conditional testimonial**

Create `src/components/landing/AccountantTestimonial.tsx`:

```tsx
import Image from 'next/image'

export interface AccountantTestimonialItem {
  quote: string
  author: {
    name: string
    office: string
    city: string
    clientCount: number
    photo?: string
  }
}

function AvatarFallback({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'SM'

  return (
    <span aria-hidden style={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: '#1a2434',
      color: '#f5f3ee',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 800,
      fontFamily: 'var(--mono)',
    }}>
      {initials}
    </span>
  )
}

export function AccountantTestimonial({ testimonials }: { testimonials: AccountantTestimonialItem[] }) {
  if (testimonials.length === 0) return null

  const [primary] = testimonials

  return (
    <section style={{ background: '#f5f3ee', padding: '48px 32px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <div className="mercury-eyebrow" style={{ marginBottom: 24 }}>O QUE DIZEM OS ESCRITORIOS</div>
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

- [ ] **Step 2: Create FAQ component**

Create `src/components/landing/FaqSection.tsx`:

```tsx
export interface FaqItem {
  q: string
  a: string
  open?: boolean
}

export function FaqSection({ faqs }: { faqs: FaqItem[] }) {
  return (
    <section style={{ background: '#f5f3ee', padding: '56px 32px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div className="mercury-eyebrow">PERGUNTAS FREQUENTES</div>
        <h2 className="mercury-h2" style={{ marginBottom: 28 }}>O que o escritorio precisa saber antes de testar.</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {faqs.map((faq, index) => (
            <details key={faq.q} open={faq.open} className="mercury-faq-item">
              <summary>
                <span>{faq.q}</span>
                <span aria-hidden>+</span>
              </summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create pricing component**

Create `src/components/landing/PricingTable.tsx` with `AccountantLandingCta`. Use this plan data exactly:

```tsx
import { AccountantLandingCta } from './AccountantLandingCta'

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 'R$ 97',
    priceSuffix: '/mes',
    desc: 'Para escritorios comecando carteira MEI.',
    features: ['Ate 30 clientes MEI ativos', 'Painel com alertas + Fator R + anexo', 'Relatorio PDF por cliente', '1 owner + 1 colaborador'],
    excluded: ['Sem API, sem CSV exportacao'],
    cta: 'Avaliar Starter gratis',
    href: '/onboarding/contador?plan=starter',
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 'R$ 247',
    priceSuffix: '/mes',
    desc: 'Para carteiras crescendo + integracao tecnica.',
    features: ['Ate 150 clientes MEI ativos', 'Tudo do Starter +', 'API REST + webhook de alertas se habilitados', 'CSV mensal se habilitado', 'PDF com marca do escritorio', 'Historico mensal rolling-12'],
    excluded: [],
    cta: 'Avaliar Pro gratis',
    href: '/onboarding/contador?plan=pro',
    highlight: true,
    badge: 'Mais escolhido',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Sob consulta',
    priceSuffix: '',
    desc: 'Para escritorios acima de 150 clientes ou exigencias de contrato.',
    features: ['Carteira sob contrato', 'Tudo do Pro +', 'Multi-seat', 'White-label completo', 'SLA e integracoes sob contrato', 'Suporte prioritario'],
    excluded: [],
    cta: 'Falar com vendas',
    href: 'mailto:contato@simulamei.com.br?subject=Plano%20Enterprise',
    highlight: false,
  },
] as const
```

Render a `<section id="pricing">` with a responsive grid:

```tsx
export function PricingTable() {
  return (
    <section id="pricing" style={{ background: '#fff', padding: '64px 32px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div className="mercury-eyebrow">PLANOS</div>
        <h2 className="mercury-h2" style={{ marginBottom: 28 }}>Comece pequeno. Cresca sem trocar de ferramenta.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
          {PLANS.map(plan => (
            <article key={plan.key} className={plan.highlight ? 'mercury-plan mercury-plan-highlight' : 'mercury-plan'}>
              {plan.badge ? <div className="mercury-plan-badge">{plan.badge}</div> : null}
              <h3>{plan.name}</h3>
              <p>{plan.desc}</p>
              <div className="mercury-price"><span>{plan.price}</span>{plan.priceSuffix}</div>
              <ul>{plan.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
              {plan.excluded.length > 0 ? <ul className="mercury-excluded">{plan.excluded.map(item => <li key={item}>{item}</li>)}</ul> : null}
              <AccountantLandingCta
                href={plan.href}
                source="pricing"
                plan={plan.key}
                variant={plan.highlight ? 'lime' : 'dark'}
              >
                {plan.cta}
              </AccountantLandingCta>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Create screenshot and footer components**

Create `src/components/landing/PainelScreenshot.tsx` with static image path `/images/painel-contador-real-2026-05.png`. The component must render a clear fallback message while the image file does not exist:

```tsx
import Image from 'next/image'

const CALLOUTS = [
  { n: 1, title: 'Barra de carteira', body: '23 / 30 clientes ativos com status visivel para o escritorio.' },
  { n: 2, title: 'Alertas com severidade', body: 'Alertas criticos, atencao e info aparecem na mesma visao.' },
  { n: 3, title: 'Pausados por plano', body: 'Clientes fora do limite ficam marcados sem sumir da carteira.' },
  { n: 4, title: 'Trial badge persistente', body: 'O owner sabe quando precisa escolher plano, sem auto-checkout.' },
] as const

export function PainelScreenshot() {
  return (
    <section style={{ background: '#fff', padding: '64px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="mercury-eyebrow">O PAINEL EM 30 SEGUNDOS</div>
          <h2 className="mercury-h2" style={{ margin: '0 auto 14px', maxWidth: 720 }}>Uma tela. Toda a sua carteira MEI.</h2>
          <p style={{ fontSize: 15, color: '#56616f', maxWidth: 540, margin: '0 auto' }}>
            Captura real do painel com dados de teste. Nao e mockup.
          </p>
        </div>
        <div className="mercury-screenshot-grid">
          <figure className="mercury-browser-frame">
            <div className="mercury-browser-bar">simulamei.com.br/contador</div>
            <Image
              src="/images/painel-contador-real-2026-05.png"
              alt="Painel contador com carteira MEI, cards de status, alertas e tabela de clientes"
              width={1200}
              height={780}
              style={{ width: '100%', height: 'auto', borderRadius: 3 }}
            />
          </figure>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {CALLOUTS.map(callout => (
              <div key={callout.n} className="mercury-callout">
                <strong>{callout.n}. {callout.title}</strong>
                <p>{callout.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
```

Create `src/components/landing/MercuryFooter.tsx` with:

```tsx
import { TAX_RULE_VERSION } from '@/lib/tributario/limitesMei'
import { AccountantLandingCta } from './AccountantLandingCta'

const SIMULATION_COUNT_DISPLAY = '18.300+ simulacoes'

export function MercuryFooter() {
  return (
    <footer style={{ background: '#1a2434', color: '#f5f3ee' }}>
      <div style={{ padding: '48px 32px', textAlign: 'center', borderBottom: '1px solid #2d4263' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, lineHeight: 1.15, margin: '0 0 12px' }}>
          7 dias gratis. Sem cartao.
        </h2>
        <p style={{ fontSize: 13, color: '#a8b3c0', maxWidth: 460, margin: '0 auto 20px' }}>
          Cadastra ate 30 MEIs no trial. Decide depois com clique explicito no Stripe.
        </p>
        <AccountantLandingCta href="/onboarding/contador" source="footer" variant="lime">
          Avaliar gratis
        </AccountantLandingCta>
      </div>
      <div style={{ padding: '36px 32px 24px' }}>
        <div className="mercury-footer-grid">
          <div>
            <strong>SimulaMEI</strong>
            <p>Motor fiscal e painel operacional para carteiras MEI.</p>
          </div>
          <a href="/para-contadores">Para contadores</a>
          <a href="/metodologia">Metodologia fiscal</a>
          <a href="/privacidade">Privacidade</a>
          <a href="mailto:contato@simulamei.com.br">Contato comercial</a>
        </div>
        <div className="mercury-footer-meta">
          <div>© 2026 SimulaMEI · Operado por SimulaMEI</div>
          <div style={{ fontFamily: 'var(--mono)' }}>motor fiscal {TAX_RULE_VERSION} · {SIMULATION_COUNT_DISPLAY}</div>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Run type check**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/components/landing
git commit -m "Cria componentes da landing contador Mercury"
```

---

### Task 5: Rewrite `/para-contadores`

**Files:**
- Modify: `src/app/para-contadores/page.tsx`
- Delete import/use of `AccountantLeadForm`

- [ ] **Step 1: Replace page imports**

Use these imports at the top of `src/app/para-contadores/page.tsx`:

```tsx
import Image from 'next/image'
import { AccountantLandingCta } from '@/components/landing/AccountantLandingCta'
import { AccountantTestimonial, type AccountantTestimonialItem } from '@/components/landing/AccountantTestimonial'
import { FaqSection, type FaqItem } from '@/components/landing/FaqSection'
import { MercuryFooter } from '@/components/landing/MercuryFooter'
import { PainelScreenshot } from '@/components/landing/PainelScreenshot'
import { PricingTable } from '@/components/landing/PricingTable'
```

Remove:

```tsx
import { AccountantLeadForm } from '@/components/accountant/AccountantLeadForm'
```

- [ ] **Step 2: Add page constants**

Add constants:

```tsx
const LOGGED_CITIES = ['SP', 'RJ', 'MG', 'RS'] as const
const TRUST_LOGOS: { src: string; alt: string; width: number; height: number }[] = []
const TESTIMONIALS: AccountantTestimonialItem[] = []

const PROBLEMS = [
  {
    id: '01',
    problem: 'Descobri que o Pedro passou do teto quando ele me ligou em panico em dezembro.',
    response: 'Painel mostra todo mes quem esta perto do limite, com semaforo e projecao do mes corrente.',
  },
  {
    id: '02',
    problem: 'Toda conversa de mudanca de regime comeca do zero.',
    response: 'Um clique concentra regime atual, Simples, Fator R e relatorio para conversa com o cliente.',
  },
  {
    id: '03',
    problem: 'Nao sei quem e Anexo III, V ou quem esta prestes a virar por Fator R.',
    response: 'O painel organiza CNAE, fator R e anexo provavel em uma visao de carteira.',
  },
  {
    id: '04',
    problem: 'Quando a carteira passou de 50 MEIs, a planilha parou de escalar.',
    response: 'A carteira vira operacao: status, alertas, historico e limites por plano em um lugar.',
  },
] as const

const FAQS: FaqItem[] = [
  {
    q: 'Como funciona o trial de 7 dias?',
    a: 'Voce cria a conta sem cartao, configura o escritorio e testa o painel por 7 dias. Nao ha cobranca automatica no cadastro. Para continuar em um plano pago, o owner precisa clicar explicitamente em Escolher plano ou Assinar e concluir o Stripe Checkout.',
    open: true,
  },
  {
    q: 'O cliente MEI final ve o painel?',
    a: 'Nao. O painel e do escritorio. O cliente MEI recebe apenas o que voce decidir enviar, como PDF de relatorio ou orientacao de acompanhamento.',
  },
  {
    q: 'Posso importar minha lista atual de MEIs?',
    a: 'No MVP, o cadastro e feito pelo painel do contador. Recursos de importacao, API e webhook devem aparecer como ativos somente quando estiverem implementados no branch de execucao.',
  },
  {
    q: 'Como funcionam os alertas?',
    a: 'O painel prioriza clientes proximos do teto MEI, mudancas de cenario por Fator R e situacoes que exigem revisao. A copy final espelha os alertas existentes no produto.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, sem fidelidade. O cancelamento acontece pelo Stripe Customer Portal quando a assinatura existe.',
  },
  {
    q: 'E sobre LGPD e os dados dos meus clientes?',
    a: 'O cadastro pressupoe autorizacao do escritorio para tratar dados dos clientes. A landing deve usar apenas claims sustentados por codigo e politicas vigentes.',
  },
]
```

- [ ] **Step 3: Compose the page**

Make the default export render:

```tsx
export default function ParaContadoresPage() {
  return (
    <main style={{ background: '#f5f3ee', color: '#1a2434' }}>
      <section className="mercury-hero">
        <div className="mercury-container mercury-hero-grid">
          <div>
            <div className="mercury-eyebrow">PARA ESCRITORIOS CONTABEIS</div>
            <h1>A planilha de carteira MEI tem um custo.</h1>
            <p>
              Cada cliente acima do teto vira retrabalho. SimulaMEI organiza teto,
              Fator R, anexos e sinais de risco em um painel para o escritorio.
            </p>
            <div className="mercury-hero-actions">
              <AccountantLandingCta href="/onboarding/contador" source="hero" variant="primary">
                Comece gratis 7 dias
              </AccountantLandingCta>
              <AccountantLandingCta href="#pricing" source="hero_pricing" variant="secondary">
                Ver planos e precos
              </AccountantLandingCta>
            </div>
            <p className="mercury-hero-note">Sem cartao de credito · Cancele quando quiser · Privacidade e autorizacao do escritorio</p>
          </div>
          <div className="mercury-mini-panel" aria-label="Previa do painel contador">
            <div>Pedro Souza <strong>103%</strong></div>
            <div>Joao Lima <strong>93%</strong></div>
            <div>Maria Costa <strong>62%</strong></div>
          </div>
        </div>
      </section>

      <section className="mercury-trust-strip">
        <div className="mercury-container mercury-trust-inner">
          <p>
            Usado por escritorios em <strong>{LOGGED_CITIES.join(', ')}</strong> para gerir carteiras MEI sem planilha.
          </p>
          {TRUST_LOGOS.length > 0 ? (
            <div className="mercury-trust-logos">
              {TRUST_LOGOS.map(logo => <Image key={logo.alt} {...logo} alt={logo.alt} />)}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mercury-problems">
        <div className="mercury-container">
          <div className="mercury-eyebrow">QUATRO COISAS QUE O PAINEL RESOLVE</div>
          <h2 className="mercury-h2">Problemas reais de carteira MEI, tratados como operacao.</h2>
          <div className="mercury-problem-grid">
            {PROBLEMS.map(item => (
              <article key={item.id}>
                <div className="mercury-label-red">{item.id} · O PROBLEMA</div>
                <p className="mercury-problem-quote">"{item.problem}"</p>
                <div className="mercury-response-box">
                  <div className="mercury-label-muted">A RESPOSTA</div>
                  <p>{item.response}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PainelScreenshot />
      <AccountantTestimonial testimonials={TESTIMONIALS} />
      <PricingTable />
      <FaqSection faqs={FAQS} />
      <MercuryFooter />
    </main>
  )
}
```

- [ ] **Step 4: Add CSS in `src/app/globals.css`**

Add classes for `.mercury-container`, `.mercury-hero`, `.mercury-cta-primary`, `.mercury-cta-secondary`, `.mercury-plan`, `.mercury-faq-item`, and responsive breakpoints in `src/app/globals.css`. Use `border-radius: 6px` or less for cards/buttons unless existing variables force otherwise.

- [ ] **Step 5: Verify no lead form import remains**

Run:

```powershell
Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern "AccountantLeadForm"
```

Expected at this point: only the component and test file remain.

- [ ] **Step 6: Run checks**

Run:

```powershell
npx tsc --noEmit
npm run test -- src/app/onboarding/contador/redirect-urls.test.ts src/app/api/accountant/onboarding/route.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/app/para-contadores/page.tsx
git commit -m "Redesenha landing para contadores"
```

---

### Task 6: Cleanup Lead Form And Trial Copy

**Files:**
- Delete: `src/components/accountant/AccountantLeadForm.tsx`
- Delete: `src/components/accountant/AccountantLeadForm.test.ts`
- Modify: `src/app/contador/assinatura/page.tsx`
- Modify: `src/app/upgrade/contador/page.tsx`
- Modify: `src/components/layout/ContadoresSection.tsx`
- Modify: screenshot-affect component comments

- [ ] **Step 1: Delete unused form files**

Run first:

```powershell
Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern "AccountantLeadForm"
```

Expected: only `AccountantLeadForm.tsx` and `AccountantLeadForm.test.ts` appear.

Delete with `apply_patch`:

```diff
*** Begin Patch
*** Delete File: src/components/accountant/AccountantLeadForm.tsx
*** Delete File: src/components/accountant/AccountantLeadForm.test.ts
*** End Patch
```

- [ ] **Step 2: Update trial progress UI**

In `src/app/contador/assinatura/page.tsx`, import:

```ts
import { ACCOUNTANT_TRIAL_DAYS } from '@/constants/accountant'
```

Replace all denominator/progress literals tied to trial length:

```tsx
<span>{trialDays}/{ACCOUNTANT_TRIAL_DAYS} dias restantes</span>
```

```tsx
width: `${Math.min(100, ((ACCOUNTANT_TRIAL_DAYS - trialDays) / ACCOUNTANT_TRIAL_DAYS) * 100)}%`,
```

Keep threshold copy for `trialDays <= 3`.

- [ ] **Step 3: Replace public copy**

Run:

```powershell
Select-String -Path "src\app\para-contadores\page.tsx","src\app\upgrade\contador\page.tsx","src\components\layout\ContadoresSection.tsx" -Pattern "14 dias|14"
```

Replace user-facing trial copy with `7 dias`. Do not replace fiscal values such as Resolução CGSN 140, SVG sizes, padding, or unrelated numeric constants.

- [ ] **Step 4: Add screenshot-affect comments**

At the top of each component, just before the exported component or main helper block, add:

```ts
// SCREENSHOT-AFFECT: re-capture painel-contador
```

Files:
- `src/components/accountant/AccountantShell.tsx`
- `src/components/accountant/OfficeStatsCards.tsx`
- `src/components/accountant/OfficeAlertsPanel.tsx`
- `src/components/accountant/OfficeClientTable.tsx`

- [ ] **Step 5: Run checks**

Run:

```powershell
npx tsc --noEmit
npm run test
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/components/accountant src/app/contador/assinatura/page.tsx src/app/upgrade/contador/page.tsx src/components/layout/ContadoresSection.tsx
git commit -m "Remove waitlist e alinha trial contador"
```

---

### Task 7: Screenshot Seed And Capture

**Files:**
- Modify: `package.json`
- Create: `scripts/seed-painel-screenshot.ts`
- Create: `scripts/capture-painel-screenshot.ts`
- Create: `public/images/painel-contador-real-2026-05.png` or `.webp`

- [ ] **Step 1: Install tooling**

Run:

```powershell
node -v
npm install -D @playwright/test sharp tsx
```

Expected: `package.json` and `package-lock.json` update. Do not stage `pnpm-lock.yaml`.

- [ ] **Step 2: Add npm scripts**

In `package.json`, add:

```json
"screenshot:contador:seed": "tsx scripts/seed-painel-screenshot.ts",
"screenshot:contador:capture": "tsx scripts/capture-painel-screenshot.ts"
```

- [ ] **Step 3: Create guarded seed script**

Create `scripts/seed-painel-screenshot.ts`. It must:
- Throw unless `SCREENSHOT_SEED_ENABLED === '1'`.
- Throw unless `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SCREENSHOT_TEST_PASSWORD` exist.
- Use `createClient` from `@supabase/supabase-js`.
- Upsert auth user `screenshot-contador+2026-05@simulamei.local`.
- Delete only rows tied to the seeded office/user before inserting.
- Insert one office, one owner member, 28 clients, and 7 alerts.

Use this safety gate at the top:

```ts
if (process.env.SCREENSHOT_SEED_ENABLED !== '1') {
  throw new Error('Set SCREENSHOT_SEED_ENABLED=1 to seed screenshot data.')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.SCREENSHOT_TEST_PASSWORD

if (!supabaseUrl || !serviceRoleKey || !password) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SCREENSHOT_TEST_PASSWORD.')
}
```

Use deterministic CNPJs generated locally:

```ts
function cnpjCheckDigits(base12: string) {
  const calc = (digits: string, weights: number[]) => {
    const sum = digits.split('').reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0)
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }

  const first = calc(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = calc(`${base12}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return `${first}${second}`
}

function makeCnpj(index: number) {
  const base12 = `420000${String(index + 1).padStart(6, '0')}`
  return `${base12}${cnpjCheckDigits(base12)}`
}
```

- [ ] **Step 4: Create capture script**

Create `scripts/capture-painel-screenshot.ts`. It must:
- Read `SCREENSHOT_TEST_PASSWORD`.
- Launch Playwright chromium.
- Visit `http://localhost:3000/auth/login?next=/contador`.
- Fill `#login-email` and `#login-password`.
- Submit and wait for `/contador`.
- Capture full-page screenshot to `public/images/painel-contador-real-2026-05.png`.
- Use `sharp` to recompress PNG; if still above 350kb, save WebP and print which file to use.

Core capture flow:

```ts
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 1024 }, deviceScaleFactor: 1 })
await page.goto('http://localhost:3000/auth/login?next=/contador', { waitUntil: 'networkidle' })
await page.fill('#login-email', 'screenshot-contador+2026-05@simulamei.local')
await page.fill('#login-password', process.env.SCREENSHOT_TEST_PASSWORD!)
await page.click('button[type="submit"]')
await page.waitForURL('**/contador', { timeout: 30000 })
await page.screenshot({ path: 'public/images/painel-contador-real-2026-05.png', fullPage: true })
await browser.close()
```

- [ ] **Step 5: Run local seed and capture**

Start the dev server in one terminal:

```powershell
npm run dev
```

In another terminal with env vars loaded:

```powershell
$env:SCREENSHOT_SEED_ENABLED='1'
$env:SCREENSHOT_TEST_PASSWORD='Use-uma-senha-local-forte-2026'
npm run screenshot:contador:seed
npm run screenshot:contador:capture
```

Expected:
- `public/images/painel-contador-real-2026-05.png` exists and is legible, or the script prints a `.webp` path.
- No checkout or payment page is opened.

- [ ] **Step 6: Commit**

Run:

```powershell
git add package.json package-lock.json scripts/seed-painel-screenshot.ts scripts/capture-painel-screenshot.ts public/images/painel-contador-real-2026-05.png
git commit -m "Adiciona captura real do painel contador"
```

If the script generated WebP instead of PNG, stage the WebP file and update `PainelScreenshot.tsx` to use that path before committing.

---

### Task 8: Final Verification

**Files:**
- All changed files

- [ ] **Step 1: Search for forbidden regressions**

Run:

```powershell
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern "AccountantLeadForm|intent=enterprise|intent=waitlist|autocheckout=.*plan|14 dias"
Select-String -Path "src\app\para-contadores\page.tsx","src\components\landing\*.tsx" -Pattern "30 dias após|HMAC|SLA LGPD|cobra automaticamente"
```

Expected:
- No active `AccountantLeadForm` references.
- No waitlist/enterprise intent on `/para-contadores`.
- No auto-checkout generated by onboarding.
- No public trial copy says 14 days.
- No unverified compliance promises on the landing.

- [ ] **Step 2: Run full checks**

Run:

```powershell
npx tsc --noEmit
npm run test
npm run build
```

Expected: all pass.

- [ ] **Step 3: Manual browser check**

Run:

```powershell
npm run dev
```

Open:
- `http://localhost:3000/para-contadores`
- `http://localhost:3000/onboarding/contador?plan=pro`

Verify:
- Mobile widths 360, 768, 1024, 1280 have no text overlap.
- Hero CTA opens onboarding.
- Pricing CTA includes `?plan=starter` or `?plan=pro`.
- After onboarding, success URL is `/contador?trial_started=1&intended_plan=pro`, not `/upgrade/contador?autocheckout=pro`.
- Enterprise CTA opens mail client and triggers analytics event when PostHog is loaded.
- Screenshot is legible and framed.

- [ ] **Step 4: Lighthouse**

Run Lighthouse from Chrome DevTools against `http://localhost:3000/para-contadores`.

Expected:
- Performance >= 90 on mobile.
- Accessibility >= 90 on mobile.
- Best Practices >= 90 on mobile.

- [ ] **Step 5: Final commit**

Run:

```powershell
git status --short
git add src docs package.json package-lock.json scripts public/images
git commit -m "Finaliza landing contador Mercury"
```

If there is nothing new to commit because previous task commits captured every change, keep the working tree clean and do not create an empty commit.
