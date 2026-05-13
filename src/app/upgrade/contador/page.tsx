import Link from 'next/link'
import { CheckoutButton } from '@/components/billing/CheckoutButton'
import { ScrollToFocusedPlan } from '@/components/billing/ScrollToFocusedPlan'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAccountantOffice } from '@/lib/accountant/server'
import { getSiteUrl } from '@/constants/site'

const PAGE_TITLE = 'Planos para Contadores — SimulaMEI'
const PAGE_DESCRIPTION = 'Assine Starter ou Pro e gerencie sua carteira MEI com dashboard, alertas e API.'
const PAGE_URL = `${getSiteUrl()}/upgrade/contador`

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    siteName: 'SimulaMEI',
    type: 'website' as const,
    locale: 'pt_BR',
    images: [
      {
        url: `${getSiteUrl()}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'Planos para Contadores — SimulaMEI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [`${getSiteUrl()}/opengraph-image`],
  },
}

interface PlanFeature {
  label: string
  highlight?: boolean
}

interface PlanOption {
  name: string
  price: string
  priceSuffix: string
  description: string
  endpoint: string
  features: PlanFeature[]
  accent: string
  recommended?: boolean
  planKey: 'starter' | 'pro'
}

const PLANS: PlanOption[] = [
  {
    name: 'Starter',
    price: 'R$ 97',
    priceSuffix: '/mês',
    description: 'Para escritórios em consolidação que estão profissionalizando a entrega.',
    endpoint: '/api/checkout/accountant-starter',
    planKey: 'starter',
    accent: 'var(--blue)',
    features: [
      { label: 'Até 30 clientes MEI ativos' },
      { label: 'Carteira com alertas automáticos' },
      { label: 'Histórico mensal de simulações' },
      { label: 'Relatório PDF por cliente' },
      { label: 'Garantia de 7 dias (CDC art. 49)' },
    ],
  },
  {
    name: 'Pro',
    price: 'R$ 247',
    priceSuffix: '/mês',
    description: 'A escolha de escritórios estabelecidos com carteira em crescimento.',
    endpoint: '/api/checkout/accountant-pro',
    planKey: 'pro',
    accent: 'var(--lime)',
    recommended: true,
    features: [
      { label: 'Até 150 clientes MEI ativos', highlight: true },
      { label: 'Tudo do Starter, mais:' },
      { label: 'API para integração contábil' },
      { label: 'Reativação automática dos pausados' },
      { label: 'Alertas por e-mail aos clientes' },
      { label: 'Marca branca no PDF' },
    ],
  },
]

interface SearchParams {
  checkout?: string
  plan?: string
  session_id?: string
  focus?: string
}

export default async function AccountantUpgradePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const checkoutStatus = params.checkout
  const cancelledPlan = params.plan
  // Plano que o usuário clicou na home (?focus=starter|pro) — destaca o card
  // e dispara auto-scroll para reduzir cliques até o checkout do Stripe.
  const focusedPlan: 'starter' | 'pro' | null =
    params.focus === 'starter' || params.focus === 'pro' ? params.focus : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const officeResult = user
    ? await getCurrentAccountantOffice(supabase, user.id, user.email)
    : null
  const hasOffice = officeResult ? Boolean(officeResult.office) : null
  const currentPlan = officeResult?.office?.plan
  const isOwner = officeResult?.office?.role === 'owner'

  return (
    <StaticPageLayout
      title="Planos para contadores"
      subtitle="Assinatura recorrente no Stripe com sincronização automática de limites. Cancele a qualquer momento pelo Customer Portal."
    >
      {focusedPlan && <ScrollToFocusedPlan planKey={focusedPlan} />}

      {/* Banner: checkout cancelado */}
      {checkoutStatus === 'cancel' && (
        <div className="acc-fade-in" style={{
          background: 'var(--tint-yellow)',
          border: '1px solid var(--tint-yellow-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
          marginBottom: 24,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius)',
            background: 'var(--tint-yellow-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--yellow)', fontSize: 13, marginBottom: 4 }}>
              Checkout cancelado{cancelledPlan ? ` (plano ${cancelledPlan})` : ''}
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Sem cobrança — você pode revisar os planos e tentar de novo quando quiser.
              Tem dúvida sobre qual escolher? <Link href="/para-contadores" style={{ color: 'var(--lime)', textDecoration: 'underline' }}>Fale com vendas</Link>.
            </p>
          </div>
        </div>
      )}

      {/* Banner: checkout sucesso */}
      {checkoutStatus === 'success' && (
        <div className="acc-fade-in" style={{
          background: 'var(--tint-lime)',
          border: '1px solid var(--tint-lime-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
          marginBottom: 24,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius)',
            background: 'var(--tint-lime-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--lime)', fontSize: 13, marginBottom: 4 }}>
              Assinatura confirmada{cancelledPlan ? ` — plano ${cancelledPlan}` : ''}
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Pagamento processado. <Link href="/contador" style={{ color: 'var(--lime)', textDecoration: 'underline', fontWeight: 700 }}>Voltar ao painel</Link>
              {' '}— o webhook pode levar até 30s pra atualizar limites.
            </p>
          </div>
        </div>
      )}

      {/* Banner: escritório ausente */}
      {hasOffice === false && (
        <div className="acc-fade-in" style={{
          background: 'var(--tint-orange)',
          border: '1px solid var(--tint-orange-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 22px',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius)',
            background: 'var(--tint-orange-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
              Crie o escritório antes de assinar
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
              O plano fica vinculado ao escritório. Setup leva ~2min e ativa trial Starter gratuito.
            </p>
          </div>
          <Link
            href="/onboarding/contador"
            className="pressable"
            style={{
              flexShrink: 0,
              padding: '10px 16px',
              borderRadius: 'var(--radius)',
              background: 'var(--orange)',
              color: 'var(--ink-on-accent)',
              fontSize: 13,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}
          >
            Criar escritório →
          </Link>
        </div>
      )}

      {/* Banner: usuário chegou clicando "Quero o X" na home */}
      {focusedPlan && checkoutStatus !== 'success' && (
        <div className="acc-fade-in" style={{
          background: 'var(--tint-lime)',
          border: '1px solid var(--tint-lime-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius)',
            background: 'var(--tint-lime-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--lime)', marginBottom: 2 }}>
              Você escolheu o plano {focusedPlan === 'starter' ? 'Starter' : 'Pro'}
            </div>
            <p style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              {hasOffice === false
                ? 'Crie o escritório e em seguida assine — leva ~2 minutos.'
                : 'Confirme o plano abaixo para abrir o checkout seguro do Stripe.'}
            </p>
          </div>
        </div>
      )}

      {/* Grid 3 colunas: Starter + Pro + Enterprise */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }} className="acc-plans-grid">
        {PLANS.map((plan, i) => {
          const isCurrent = currentPlan === plan.planKey
          const disabled = hasOffice === false
          const isFocused = focusedPlan === plan.planKey
          return (
            <article
              key={plan.name}
              id={`plan-${plan.planKey}`}
              className="acc-card acc-fade-in"
              style={{
                padding: plan.recommended || isFocused ? '20px 24px 24px' : 24,
                borderColor: isFocused ? plan.accent : plan.recommended ? 'var(--lime)' : 'var(--border)',
                borderWidth: isFocused || plan.recommended ? 2 : 1,
                background: plan.recommended
                  ? 'linear-gradient(135deg, var(--bg1) 0%, var(--tint-lime) 100%)'
                  : 'var(--bg1)',
                opacity: disabled ? 0.55 : 1,
                animationDelay: `${i * 80}ms`,
                boxShadow: isFocused ? `0 0 0 4px ${plan.accent}22, 0 12px 32px -10px ${plan.accent}44` : undefined,
                scrollMarginTop: 96,
              }}
            >
              {(plan.recommended || isFocused) && (
                <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {isFocused && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 999,
                      background: plan.accent, color: 'var(--ink-on-accent)',
                      fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                    }}>
                      ✓ Sua escolha
                    </span>
                  )}
                  {plan.recommended && !isFocused && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 999,
                      background: 'var(--lime)', color: 'var(--ink-on-accent)',
                      fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                    }}>
                      ⭐ Mais escolhido
                    </span>
                  )}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{plan.name}</h2>
                  {isCurrent && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 4,
                      background: 'var(--tint-lime-strong)',
                      color: 'var(--lime)',
                      border: '1px solid var(--tint-lime-border)',
                    }}>
                      Atual
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>
                  {plan.description}
                </p>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 900, color: plan.accent, lineHeight: 1 }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>
                    {plan.priceSuffix}
                  </span>
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.features.map((feat, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      fontSize: 12,
                      color: feat.highlight ? 'var(--text1)' : 'var(--text2)',
                      fontWeight: feat.highlight ? 700 : 500,
                      lineHeight: 1.5,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={plan.accent} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {feat.label}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--tint-lime)',
                  border: '1px solid var(--tint-lime-border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--lime)',
                  fontSize: 12, fontWeight: 800, textAlign: 'center',
                }}>
                  ✓ Plano ativo
                </div>
              ) : (
                <CheckoutButton
                  endpoint={plan.endpoint}
                  eventName="accountant_checkout_started"
                  officeRequired
                  style={{
                    minHeight: 42,
                    background: plan.recommended ? 'var(--lime)' : 'var(--bg2)',
                    color: plan.recommended ? 'var(--ink-on-accent)' : 'var(--text1)',
                    border: plan.recommended ? 'none' : '1px solid var(--border2)',
                    fontWeight: 800, fontSize: 13,
                  }}
                >
                  Assinar {plan.name}
                </CheckoutButton>
              )}
            </article>
          )
        })}

        {/* Card Enterprise */}
        <article className="acc-card acc-fade-in" style={{ padding: 24, animationDelay: '160ms' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Enterprise</h2>
              {currentPlan === 'enterprise' && (
                <span style={{
                  fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                  padding: '2px 8px', borderRadius: 4,
                  background: 'var(--tint-lime-strong)', color: 'var(--lime)',
                  border: '1px solid var(--tint-lime-border)',
                }}>
                  Atual
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>
              Para carteiras grandes, multi-seat, white-label completo, SLA e integrações sob contrato.
            </p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 900, color: 'var(--text1)', lineHeight: 1 }}>
              Sob contrato
            </span>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['150+ clientes ativos', 'White-label completo', 'API dedicada e SLA 99.9%', 'Multi-seat com permissões', 'Suporte 24/5 canal direto'].map((feature, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <Link
            href="/para-contadores"
            className="pressable"
            style={{
              display: 'block', textAlign: 'center',
              padding: '10px 14px',
              border: '1px solid var(--border2)',
              background: 'var(--bg2)',
              color: 'var(--text1)',
              borderRadius: 'var(--radius)',
              fontSize: 13, fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            Falar com comercial →
          </Link>
        </article>
      </section>

      {/* Footer com garantia + portal */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center',
        padding: '20px 22px',
        background: 'var(--bg1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }} className="acc-billing-footer">
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 4 }}>
            Já assina?
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>
            Gerencie cartão, downloads de invoice e cancelamento no Customer Portal Stripe.
          </p>
        </div>
        {isOwner ? (
          <CheckoutButton
            endpoint="/api/billing/portal"
            eventName="accountant_billing_portal_opened"
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border2)',
              color: 'var(--text1)',
              fontWeight: 800,
              fontSize: 13,
              minHeight: 40,
              padding: '0 18px',
            }}
          >
            Abrir Customer Portal
          </CheckoutButton>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
            Owner necessário
          </span>
        )}
      </div>

      <p style={{
        marginTop: 18, textAlign: 'center',
        fontSize: 11, color: 'var(--text3)', lineHeight: 1.6,
      }}>
        Cobrança mensal sem fidelidade · Cancele quando quiser · Garantia de 7 dias (CDC art. 49) ·
        Tributos por nota fiscal (CNPJ coletado no checkout)
      </p>
    </StaticPageLayout>
  )
}
