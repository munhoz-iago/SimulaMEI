import Link from 'next/link'
import { CheckoutButton } from '@/components/billing/CheckoutButton'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { FREE_SIMULATION_LIMIT, PLAN_ACCENT_COLORS, PLAN_DESCRIPTIONS, PLAN_LABELS } from '@/constants/plans'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Planos — SimulaMEI',
  description: 'Compare planos para MEI solo e contadores: Free, Pro, Starter, Pro para escritórios e Enterprise.',
}

type PlanKey = 'free' | 'pro'

interface SearchParams {
  checkout?: string | string[]
  session_id?: string | string[]
}

interface PlanOption {
  name: string
  price: string
  priceSuffix: string
  description: string
  features: string[]
  accent: string
  recommended?: boolean
}

interface IndividualPlanOption extends PlanOption {
  key: PlanKey
}

interface AccountantPlanOption extends PlanOption {
  href: string
  cta: string
}

const INDIVIDUAL_PLANS: IndividualPlanOption[] = [
  {
    key: 'free',
    name: PLAN_LABELS.free,
    price: 'R$ 0',
    priceSuffix: '/mês',
    description: PLAN_DESCRIPTIONS.free,
    accent: PLAN_ACCENT_COLORS.free,
    features: [
      `${FREE_SIMULATION_LIMIT} simulações completas`,
      'Dashboard com histórico da conta',
      'Uso do teto MEI e projeção anual',
      'Upgrade quando precisar de monitor recorrente',
    ],
  },
  {
    key: 'pro',
    name: PLAN_LABELS.pro,
    price: 'R$ 19',
    priceSuffix: '/mês',
    description: 'Para acompanhar um único CNPJ MEI com monitor, alertas e relatórios completos.',
    accent: PLAN_ACCENT_COLORS.pro,
    recommended: true,
    features: [
      'Monitor mensal com histórico',
      'Calendário fiscal por e-mail',
      'Alertas de mudança de anexo',
      'Download do relatório premium',
    ],
  },
]

const ACCOUNTANT_PLANS: AccountantPlanOption[] = [
  {
    name: 'Starter',
    price: 'R$ 97',
    priceSuffix: '/mês',
    description: 'Para escritórios que estão profissionalizando a carteira MEI.',
    href: '/upgrade/contador?focus=starter',
    cta: 'Ver Starter',
    accent: 'var(--blue)',
    features: [
      'Até 30 clientes MEI ativos',
      'Carteira com alertas automáticos',
      'Histórico mensal de simulações',
      'Relatório PDF por cliente',
    ],
  },
  {
    name: 'Pro Contador',
    price: 'R$ 247',
    priceSuffix: '/mês',
    description: 'Para escritórios com carteira em crescimento e operação recorrente.',
    href: '/upgrade/contador?focus=pro',
    cta: 'Ver Pro Contador',
    accent: 'var(--lime)',
    recommended: true,
    features: [
      'Até 150 clientes MEI ativos',
      'Tudo do Starter',
      'API para integração contábil',
      'Marca branca no PDF',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Sob contrato',
    priceSuffix: '',
    description: 'Para carteiras grandes, multi-seat, SLA e integrações sob contrato.',
    href: '/para-contadores?intent=enterprise#contato',
    cta: 'Falar com comercial',
    accent: 'var(--text1)',
    features: [
      '150+ clientes ativos',
      'White-label completo',
      'API dedicada e SLA',
      'Suporte direto',
    ],
  },
]

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function PlanLink({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        padding: '0 14px',
        borderRadius: 'var(--radius)',
        border: primary ? '1px solid var(--lime)' : '1px solid var(--border2)',
        background: primary ? 'var(--lime)' : 'var(--bg2)',
        color: primary ? 'var(--ink-on-accent)' : 'var(--text1)',
        fontSize: 13,
        fontWeight: 900,
        textDecoration: 'none',
        textAlign: 'center',
      }}
    >
      {label}
    </Link>
  )
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const checkoutStatus = getSingleParam(params.checkout)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const profile = user
    ? (await supabase.from('user_profiles').select('plano').eq('id', user.id).maybeSingle()).data
    : null
  const currentPlan: PlanKey | null = user ? (profile?.plano === 'pro' ? 'pro' : 'free') : null

  return (
    <StaticPageLayout
      title="Planos SimulaMEI"
      subtitle="Valores para quem acompanha um único MEI e para contadores que gerenciam carteira de clientes."
    >
      <section style={{ display: 'grid', gap: 32 }}>
        {!user && (
          <div style={{
            background: 'var(--bg1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            color: 'var(--text2)',
            fontSize: 13,
            lineHeight: 1.6,
          }}>
            Os preços ficam visíveis para comparação. Para assinar ou ver seu plano atual, entre na conta.
          </div>
        )}

        {checkoutStatus === 'success' && (
          <div style={{
            background: 'var(--tint-lime)',
            border: '1px solid var(--tint-lime-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            color: 'var(--text2)',
            fontSize: 13,
            lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--lime)' }}>Assinatura confirmada.</strong>
            {' '}O Stripe processou o checkout. O webhook pode levar alguns segundos para atualizar seu plano no dashboard.
          </div>
        )}

        {checkoutStatus === 'cancel' && (
          <div style={{
            background: 'var(--tint-yellow)',
            border: '1px solid var(--tint-yellow-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            color: 'var(--text2)',
            fontSize: 13,
            lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--yellow)' }}>Checkout cancelado.</strong>
            {' '}Nenhuma cobrança foi feita. Você pode revisar os planos antes de tentar novamente.
          </div>
        )}

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>
              MEI solo
            </span>
            <h2 style={{ margin: '4px 0 0', color: 'var(--text1)', fontSize: 22, fontWeight: 900 }}>
              Para acompanhar um único CNPJ
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {INDIVIDUAL_PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.key
              const isPro = plan.key === 'pro'

              return (
                <article
                  key={plan.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    minHeight: 420,
                    padding: 24,
                    borderRadius: 'var(--radius-lg)',
                    border: `1px solid ${isCurrent ? plan.accent : 'var(--border)'}`,
                    background: isPro
                      ? 'linear-gradient(135deg, var(--bg1) 0%, var(--tint-lime) 100%)'
                      : 'var(--bg1)',
                    boxShadow: isCurrent ? `0 0 0 3px color-mix(in oklch, ${plan.accent} 18%, transparent)` : undefined,
                  }}
                >
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <h3 style={{ margin: 0, color: 'var(--text1)', fontSize: 20, fontWeight: 900 }}>
                        {plan.name}
                      </h3>
                      {(isCurrent || plan.recommended) && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          minHeight: 24,
                          padding: '4px 8px',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--tint-lime-border)',
                          background: 'var(--tint-lime)',
                          color: 'var(--lime)',
                          fontSize: 10,
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}>
                          {isCurrent ? 'Atual' : 'Popular'}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, minHeight: 62, color: 'var(--text3)', fontSize: 13, lineHeight: 1.6 }}>
                      {plan.description}
                    </p>
                  </div>

                  <div>
                    <span style={{ color: plan.accent, fontFamily: 'var(--mono)', fontSize: 34, fontWeight: 900, lineHeight: 1 }}>
                      {plan.price}
                    </span>
                    <span style={{ marginLeft: 4, color: 'var(--text3)', fontSize: 13, fontWeight: 700 }}>
                      {plan.priceSuffix}
                    </span>
                  </div>

                  <ul style={{ display: 'grid', gap: 10, padding: 0, margin: 0, listStyle: 'none', flex: 1 }}>
                    {plan.features.map((feature) => (
                      <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: 'var(--text2)', fontSize: 13, lineHeight: 1.5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.accent} strokeWidth="2.5" style={{ marginTop: 3, flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 44,
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                      color: 'var(--text2)',
                      fontSize: 13,
                      fontWeight: 800,
                    }}>
                      Plano ativo
                    </div>
                  ) : isPro ? (
                    user ? (
                      <CheckoutButton endpoint="/api/checkout/monitor" eventName="monitor_waitlist_joined">
                        Assinar Plano Pro
                      </CheckoutButton>
                    ) : (
                      <PlanLink href="/auth/login?next=/upgrade" label="Entrar para assinar" primary />
                    )
                  ) : (
                    <PlanLink href={user ? '/dashboard' : '/auth/login?next=/dashboard'} label={user ? 'Ir para o dashboard' : 'Começar grátis'} />
                  )}
                </article>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>
              Contadores
            </span>
            <h2 style={{ margin: '4px 0 0', color: 'var(--text1)', fontSize: 22, fontWeight: 900 }}>
              Para gerenciar carteira de clientes MEI
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}>
            {ACCOUNTANT_PLANS.map((plan) => (
              <article
                key={plan.name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  minHeight: 360,
                  padding: 22,
                  borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${plan.recommended ? 'var(--lime)' : 'var(--border)'}`,
                  background: plan.recommended
                    ? 'linear-gradient(135deg, var(--bg1) 0%, var(--tint-lime) 100%)'
                    : 'var(--bg1)',
                }}
              >
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <h3 style={{ margin: 0, color: 'var(--text1)', fontSize: 18, fontWeight: 900 }}>
                      {plan.name}
                    </h3>
                    {plan.recommended && (
                      <span style={{
                        minHeight: 22,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius)',
                        background: 'var(--lime)',
                        color: 'var(--ink-on-accent)',
                        fontSize: 10,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                      }}>
                        Popular
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, minHeight: 58, color: 'var(--text3)', fontSize: 12, lineHeight: 1.55 }}>
                    {plan.description}
                  </p>
                </div>

                <div>
                  <span style={{ color: plan.accent, fontFamily: 'var(--mono)', fontSize: plan.price === 'Sob contrato' ? 22 : 30, fontWeight: 900, lineHeight: 1 }}>
                    {plan.price}
                  </span>
                  {plan.priceSuffix && (
                    <span style={{ marginLeft: 4, color: 'var(--text3)', fontSize: 12, fontWeight: 700 }}>
                      {plan.priceSuffix}
                    </span>
                  )}
                </div>

                <ul style={{ display: 'grid', gap: 8, padding: 0, margin: 0, listStyle: 'none', flex: 1 }}>
                  {plan.features.map((feature) => (
                    <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--text2)', fontSize: 12, lineHeight: 1.45 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={plan.accent} strokeWidth="2.5" style={{ marginTop: 2, flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <PlanLink href={plan.href} label={plan.cta} primary={plan.recommended} />
              </article>
            ))}
          </div>
        </div>
      </section>
    </StaticPageLayout>
  )
}
