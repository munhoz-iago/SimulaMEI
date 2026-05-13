import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccountantShell } from '@/components/accountant/AccountantShell'
import { CheckoutButton } from '@/components/billing/CheckoutButton'
import { getAccountantBillingState } from '@/lib/accountant/billing-state'
import { getCurrentAccountantOffice, getOfficeClientStats } from '@/lib/accountant/server'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Assinatura do contador — SimulaMEI',
  description: 'Gestão de plano, limite de clientes e cobrança do escritório contador no SimulaMEI.',
}

interface PlanFeature {
  label: string
  highlight?: boolean
}

interface PlanOption {
  plan: 'starter' | 'pro'
  name: string
  price: string
  priceSuffix: string
  limit: string
  endpoint: string
  description: string
  features: PlanFeature[]
  accent: string
  recommended?: boolean
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    plan: 'starter',
    name: 'Starter',
    price: 'R$ 97',
    priceSuffix: '/mês',
    limit: '30 clientes ativos',
    endpoint: '/api/checkout/accountant-starter',
    description: 'Para escritórios em consolidação que precisam profissionalizar a entrega.',
    features: [
      { label: 'Até 30 clientes MEI ativos' },
      { label: 'Carteira com alertas automáticos' },
      { label: 'Relatório PDF com sua marca' },
      { label: 'Histórico mensal de simulações' },
    ],
    accent: 'var(--blue)',
  },
  {
    plan: 'pro',
    name: 'Pro',
    price: 'R$ 247',
    priceSuffix: '/mês',
    limit: '150 clientes ativos',
    endpoint: '/api/checkout/accountant-pro',
    description: 'A escolha de escritórios estabelecidos com carteira em crescimento.',
    features: [
      { label: 'Até 150 clientes MEI ativos', highlight: true },
      { label: 'Tudo do Starter, mais:' },
      { label: 'API para integração contábil' },
      { label: 'Alertas por e-mail aos clientes' },
      { label: 'Suporte prioritário em até 4h' },
    ],
    accent: 'var(--lime)',
    recommended: true,
  },
]

function formatDate(value: string | null) {
  if (!value) return 'Sem data definida'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

/** Calcula dias restantes do trial */
function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const target = new Date(iso).getTime()
  if (!Number.isFinite(target)) return null
  return Math.max(0, Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24)))
}

export default async function AccountantBillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/contador/assinatura')
  }

  const { office, error } = await getCurrentAccountantOffice(supabase, user.id, user.email)
  if (error) throw new Error(`Accountant billing office query failed: ${error}`)
  if (!office) redirect('/onboarding/contador')

  const [stats] = await Promise.all([
    getOfficeClientStats(office.id),
  ])
  const billingState = getAccountantBillingState(office)
  const isOwner = office.role === 'owner'
  const usagePct = office.max_clients > 0
    ? Math.min(100, Math.round((stats.active / office.max_clients) * 100))
    : 0
  const trialDays = daysUntil(office.trial_ends_at)
  const inTrial = billingState.kind === 'trialing'
  const trialExpired = billingState.kind === 'trial_expired'

  return (
    <AccountantShell office={office} active="billing">
      <section style={{ display: 'grid', gap: 18 }}>

        {/* ── HERO: Trial countdown ou status atual em destaque ─────── */}
        {(inTrial || trialExpired) && (
          <div
            className="acc-card acc-fade-in"
            style={{
              padding: '28px 32px',
              background: trialExpired
                ? 'linear-gradient(135deg, var(--bg1) 0%, rgba(255,59,59,0.04) 100%)'
                : trialDays !== null && trialDays <= 3
                  ? 'linear-gradient(135deg, var(--bg1) 0%, rgba(255,59,59,0.04) 100%)'
                  : trialDays !== null && trialDays <= 14
                    ? 'linear-gradient(135deg, var(--bg1) 0%, rgba(245,197,66,0.04) 100%)'
                    : 'linear-gradient(135deg, var(--bg1) 0%, rgba(200,241,53,0.04) 100%)',
              borderColor: trialExpired
                ? 'rgba(255,59,59,0.24)'
                : trialDays !== null && trialDays <= 3
                  ? 'rgba(255,59,59,0.24)'
                  : trialDays !== null && trialDays <= 14
                    ? 'rgba(245,197,66,0.24)'
                    : 'rgba(200,241,53,0.24)',
            }}
          >
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Countdown circular SVG ou número grande */}
              {trialExpired ? (
                <div style={{
                  width: 80, height: 80, borderRadius: 16,
                  background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.24)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  width: 80, height: 80, borderRadius: 16,
                  background: trialDays !== null && trialDays <= 3
                    ? 'rgba(255,59,59,0.1)'
                    : trialDays !== null && trialDays <= 14
                      ? 'rgba(245,197,66,0.1)'
                      : 'rgba(200,241,53,0.1)',
                  border: `1px solid ${trialDays !== null && trialDays <= 3
                    ? 'rgba(255,59,59,0.24)'
                    : trialDays !== null && trialDays <= 14
                      ? 'rgba(245,197,66,0.24)'
                      : 'rgba(200,241,53,0.24)'}`,
                  flexShrink: 0,
                }}>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 900, lineHeight: 1,
                    color: trialDays !== null && trialDays <= 3
                      ? 'var(--red)'
                      : trialDays !== null && trialDays <= 14
                        ? 'var(--yellow)'
                        : 'var(--lime)',
                  }}>
                    {trialDays ?? '—'}
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 800, color: 'var(--text3)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2,
                  }}>
                    {trialDays === 1 ? 'dia' : 'dias'}
                  </div>
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: trialExpired ? 'var(--red)' : 'var(--text3)', marginBottom: 6,
                }}>
                  {trialExpired ? 'Trial encerrado' : 'Trial em andamento'}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                  {trialExpired
                    ? 'Escolha um plano para continuar'
                    : trialDays !== null && trialDays <= 3
                      ? 'Trial termina em breve!'
                      : 'Você está no trial Starter'}
                </h2>
                <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.55, margin: 0, maxWidth: 600 }}>
                  {trialExpired
                    ? 'A carteira está bloqueada para novos cadastros e simulações. Escolha Starter ou Pro abaixo para reativar.'
                    : `Você está usando o SimulaMEI com 0/30 clientes. ${trialDays !== null && trialDays <= 3 ? 'Escolha um plano AGORA para não perder o acesso.' : `Trial termina em ${formatDate(office.trial_ends_at)}.`}`}
                </p>
              </div>

              <Link
                href="#planos"
                className="dashboard-action dashboard-primary-action"
                style={{ padding: '11px 22px', fontSize: 14, fontWeight: 800, flexShrink: 0 }}
              >
                Ver planos
              </Link>
            </div>

            {inTrial && trialDays !== null && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
                  <span>Trial iniciado</span>
                  <span>{trialDays}/14 dias restantes</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, ((14 - trialDays) / 14) * 100)}%`,
                    height: '100%',
                    background: trialDays <= 3 ? 'var(--red)' : trialDays <= 14 ? 'var(--yellow)' : 'var(--lime)',
                    borderRadius: 999,
                    transition: 'width .5s var(--ease-out)',
                  }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Status atual + Cobrança em 2 colunas ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }} className="acc-stats-grid">
          {/* Card 1: Plano atual */}
          <article className="acc-card" style={{ padding: 24, position: 'relative' }}>
            <div className="acc-card-accent" style={{
              background: usagePct >= 95 ? 'var(--red)' : usagePct >= 80 ? 'var(--yellow)' : 'var(--lime)',
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 4 }}>
                  Plano atual
                </div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{billingState.planLabel}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 800,
                padding: '4px 10px', borderRadius: 999,
                background: billingState.severity === 'ok' ? 'rgba(200,241,53,0.1)' : billingState.severity === 'warn' ? 'rgba(245,197,66,0.1)' : 'rgba(255,59,59,0.1)',
                color: billingState.severity === 'ok' ? 'var(--lime)' : billingState.severity === 'warn' ? 'var(--yellow)' : 'var(--red)',
                border: `1px solid ${billingState.severity === 'ok' ? 'rgba(200,241,53,0.24)' : billingState.severity === 'warn' ? 'rgba(245,197,66,0.24)' : 'rgba(255,59,59,0.24)'}`,
              }}>
                {billingState.statusLabel}
              </span>
            </div>

            {/* Barra de uso da carteira */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                <span>Carteira ativa</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text1)' }}>
                  {stats.active} / {office.max_clients}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  width: `${usagePct}%`,
                  height: '100%',
                  background: usagePct >= 95 ? 'var(--red)' : usagePct >= 80 ? 'var(--yellow)' : 'linear-gradient(90deg, var(--lime), var(--blue))',
                  borderRadius: 999,
                  transition: 'width .5s var(--ease-out)',
                }} />
              </div>
            </div>

            {/* Detalhes em mini-grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Renovação
                </div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  {office.current_period_end ? formatDate(office.current_period_end) : '—'}
                </div>
              </div>
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Fim do trial
                </div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  {office.trial_ends_at ? formatDate(office.trial_ends_at) : '—'}
                </div>
              </div>
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Pausados por limite
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: stats.planLimitInactive > 0 ? 'var(--orange)' : 'var(--text1)' }}>
                  {stats.planLimitInactive.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          </article>

          {/* Card 2: Cobrança */}
          <article className="acc-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)' }}>
                  Cobrança
                </div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Portal Stripe</div>
              </div>
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.55, margin: '0 0 18px', flex: 1 }}>
              Cartão, cancelamento e dados de cobrança ficam no Stripe Customer Portal. Acesso seguro com 2FA.
            </p>
            {office.stripe_customer_id && isOwner ? (
              <CheckoutButton
                endpoint="/api/billing/portal"
                eventName="accountant_billing_portal_opened"
                style={{ background: 'var(--text1)', color: 'var(--bg0)', minHeight: 40, fontWeight: 800 }}
              >
                Abrir Customer Portal
              </CheckoutButton>
            ) : isOwner ? (
              <Link
                href="#planos"
                className="dashboard-action dashboard-primary-action"
                style={{ padding: '10px 16px', fontSize: 13, fontWeight: 800, alignSelf: 'flex-start' }}
              >
                Escolher plano →
              </Link>
            ) : (
              <p style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                Apenas o owner do escritório pode alterar cobrança.
              </p>
            )}
          </article>
        </div>

        {/* ── Planos disponíveis ───────────────────────────────────── */}
        <section id="planos" style={{ marginTop: 8, scrollMarginTop: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
              Disponíveis
            </span>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Escolha o plano ideal</h2>
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
              Cobrança mensal sem fidelidade. Cancele quando quiser pelo Customer Portal.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="acc-plans-grid">
            {PLAN_OPTIONS.map(option => {
              const isCurrent = office.plan === option.plan
              return (
                <article
                  key={option.plan}
                  className="acc-card acc-fade-in"
                  style={{
                    padding: option.recommended ? '20px 24px 24px' : 24,
                    borderColor: option.recommended ? 'var(--lime)' : 'var(--border)',
                    borderWidth: option.recommended ? 2 : 1,
                    background: option.recommended ? 'linear-gradient(135deg, var(--bg1) 0%, rgba(200,241,53,0.04) 100%)' : 'var(--bg1)',
                  }}
                >
                  {option.recommended && (
                    <div style={{ marginBottom: 12 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 999,
                        background: 'var(--lime)', color: 'var(--ink-on-accent)',
                        fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                      }}>
                        ⭐ Mais escolhido
                      </span>
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{option.name}</h3>
                      {isCurrent && (
                        <span style={{
                          fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                          padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(200,241,53,0.12)', color: 'var(--lime)',
                          border: '1px solid rgba(200,241,53,0.24)',
                        }}>
                          Atual
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>
                      {option.description}
                    </p>
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 900, color: option.accent, lineHeight: 1 }}>
                      {option.price}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600, marginLeft: 2 }}>
                      {option.priceSuffix}
                    </span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {option.features.map((feature, i) => (
                      <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: feature.highlight ? 'var(--text1)' : 'var(--text2)', fontWeight: feature.highlight ? 700 : 500, lineHeight: 1.5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={option.accent} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {feature.label}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(200,241,53,0.08)',
                      border: '1px solid rgba(200,241,53,0.2)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--lime)',
                      fontSize: 12, fontWeight: 800, textAlign: 'center',
                    }}>
                      ✓ Plano ativo
                    </div>
                  ) : isOwner ? (
                    <CheckoutButton
                      endpoint={option.endpoint}
                      eventName="accountant_checkout_started"
                      style={{
                        minHeight: 40,
                        background: option.recommended ? 'var(--lime)' : 'var(--bg2)',
                        color: option.recommended ? 'var(--ink-on-accent)' : 'var(--text1)',
                        border: option.recommended ? 'none' : '1px solid var(--border2)',
                        fontWeight: 800, fontSize: 13,
                      }}
                    >
                      {trialExpired ? 'Assinar' : 'Mudar para'} {option.name}
                    </CheckoutButton>
                  ) : (
                    <span style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', display: 'block' }}>
                      Owner necessário
                    </span>
                  )}
                </article>
              )
            })}

            {/* Enterprise card */}
            <article className="acc-card acc-fade-in" style={{ padding: 24, animationDelay: '120ms' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Enterprise</h3>
                  {office.plan === 'enterprise' && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(200,241,53,0.12)', color: 'var(--lime)',
                      border: '1px solid rgba(200,241,53,0.24)',
                    }}>
                      Atual
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>
                  Para escritórios grandes que precisam de carteira customizada e suporte dedicado.
                </p>
              </div>

              <div style={{ marginBottom: 18 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 900, color: 'var(--text1)', lineHeight: 1 }}>
                  Sob contrato
                </span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['150+ clientes ativos', 'White-label completo', 'API dedicada e SLA 99.9%', 'Implantação assistida', 'Suporte 24/5 por canal direto'].map((feature, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/para-contadores"
                style={{
                  display: 'block', textAlign: 'center',
                  padding: '10px 14px',
                  border: '1px solid var(--border2)',
                  background: 'var(--bg2)',
                  color: 'var(--text1)',
                  borderRadius: 'var(--radius)',
                  fontSize: 13, fontWeight: 800,
                  textDecoration: 'none',
                  transition: 'border-color 160ms ease',
                }}
              >
                Falar com comercial →
              </Link>
            </article>
          </div>
        </section>
      </section>
    </AccountantShell>
  )
}
