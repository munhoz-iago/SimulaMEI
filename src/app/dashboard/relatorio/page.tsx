import { createClient } from '@/lib/supabase/server'
import { CheckoutButton } from '@/components/billing/CheckoutButton'
import { DownloadReportButton } from '@/components/billing/DownloadReportButton'
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'
import { Panel } from '@/components/dashboard/Panel'
import { Pill } from '@/components/dashboard/Pill'
import { getDashboardContext } from '@/lib/dashboard/context'

export const metadata = {
  title: 'Relatório fiscal — SimulaMEI',
  description: 'Memória de cálculo, oportunidades e PDF compartilhável.',
}

const REPORT_PRICE = 29
const PRO_PRICE = 19

const REPORT_FEATURES = [
  'Resumo fiscal do cenário mais recente',
  'Comparativo de regimes (Simples III, V, Lucro Presumido e Real)',
  'Alerta de teto MEI com projeção anual',
  'Oportunidades prioritárias com impacto estimado',
  'Arquivo PDF para compartilhar com contador ou sócio',
]

const PRO_FEATURES = [
  { label: 'Relatórios PDF ilimitados', highlight: true },
  { label: 'Monitor mensal com histórico completo' },
  { label: 'Calendário fiscal por e-mail' },
  { label: 'Alertas automáticos de mudança de anexo' },
  { label: 'API para integração contábil' },
  { label: 'Suporte por chat em até 24h' },
]

export default async function DashboardRelatorioPage() {
  const ctx = await getDashboardContext()
  const supabase = await createClient()

  const [{ data: purchases }, { count: reportPurchasesCount }] = await Promise.all([
    supabase
      .from('purchases')
      .select('id')
      .eq('user_id', ctx.user.id)
      .eq('produto', 'relatorio')
      .eq('status', 'paid')
      .limit(1),
    supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .eq('produto', 'relatorio')
      .eq('status', 'paid'),
  ])

  const hasAccess = ctx.plan === 'pro' || (purchases?.length ?? 0) > 0
  const totalReportsPaid = reportPurchasesCount ?? 0
  // Quanto o user já gastou em relatórios avulsos — usado pra reforçar a recomendação
  const moneySpentOnReports = totalReportsPaid * REPORT_PRICE
  const monthsOfProEquivalent = Math.floor(moneySpentOnReports / PRO_PRICE)

  return (
    <>
      <DashboardPageHeader
        greeting="Relatório fiscal premium"
        subtitle="Gere ou baixe o PDF do seu cenário atual — memória de cálculo, comparativo de regimes e oportunidades."
        plan={ctx.plan}
      />

      {/* Card de conteúdo do relatório (sempre visível) */}
      <section style={{ marginBottom: 16 }}>
        <Panel style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(200,241,53,0.1)',
              border: '1px solid rgba(200,241,53,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)' }}>
                Conteúdo do PDF
              </div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>O que entra no relatório</div>
            </div>
          </div>

          <ul style={{
            listStyle: 'none', padding: 0, margin: 0,
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px 24px',
          }}>
            {REPORT_FEATURES.map((feature, i) => (
              <li key={i} style={{ display: 'flex', gap: 12, fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: 'rgba(200,241,53,0.12)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {/* Já tem acesso (pro ou pagou avulso) */}
      {hasAccess ? (
        <section>
          <Panel style={{ padding: 28, background: 'linear-gradient(135deg, var(--bg1) 0%, rgba(200,241,53,0.04) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <Pill color="var(--lime)">Acesso liberado</Pill>
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: '12px 0 6px' }}>
                  Pronto para baixar
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55, margin: 0, maxWidth: 540 }}>
                  {ctx.plan === 'pro'
                    ? 'Seu Plano Pro inclui geração ilimitada de relatórios. Baixe quantos cenários quiser.'
                    : 'Você adquiriu o relatório avulso. Pode baixar quantas vezes precisar enquanto sua simulação for válida.'}
                </p>
              </div>
              <DownloadReportButton />
            </div>
          </Panel>

          {/* Se já pagou avulso uma vez e não é Pro, oferece upgrade discreto */}
          {ctx.plan !== 'pro' && totalReportsPaid >= 1 && (
            <ProUpsellCompact totalReportsPaid={totalReportsPaid} moneySpent={moneySpentOnReports} monthsEquivalent={monthsOfProEquivalent} />
          )}
        </section>
      ) : (
        /* Sem acesso: oferece avulso E Pro lado a lado, Pro destacado */
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }} className="db-row1">
          {/* Compra avulsa */}
          <Panel style={{ padding: 26, display: 'flex', flexDirection: 'column' }}>
            <Pill color="var(--text3)">Compra avulsa</Pill>
            <div style={{ margin: '14px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 36, fontWeight: 900, color: 'var(--text1)', lineHeight: 1 }}>
                  R$ {REPORT_PRICE}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>uma vez</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.55, margin: '8px 0 0' }}>
                Só este PDF da simulação atual. Pagamento único, sem assinatura.
              </p>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 20px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {[
                { label: '1 relatório PDF', ok: true },
                { label: 'Sem monitor mensal', ok: false },
                { label: 'Sem alertas por e-mail', ok: false },
                { label: 'Sem histórico estendido', ok: false },
              ].map((feat, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: feat.ok ? 'var(--text2)' : 'var(--text3)', lineHeight: 1.5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={feat.ok ? 'var(--lime)' : 'var(--border2)'} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
                    {feat.ok ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                  </svg>
                  {feat.label}
                </li>
              ))}
            </ul>

            <CheckoutButton
              endpoint="/api/checkout/report"
              eventName="pdf_cta_clicked"
              style={{
                minHeight: 42,
                background: 'var(--bg2)',
                color: 'var(--text1)',
                border: '1px solid var(--border2)',
                fontWeight: 800, fontSize: 13,
              }}
            >
              Comprar relatório avulso
            </CheckoutButton>
          </Panel>

          {/* Pro plan - destacado */}
          <Panel style={{
            padding: '20px 26px 26px',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, var(--bg1) 0%, rgba(200,241,53,0.06) 100%)',
            borderColor: 'rgba(200,241,53,0.3)',
            borderWidth: 2,
          }}>
            {/* Header com pill recomendação inline (não mais absolute pra evitar sobreposição) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'var(--lime)',
                color: 'var(--ink-on-accent)',
                fontSize: 10, fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
              }}>
                ⭐ Recomendado
              </span>
              <span style={{
                fontSize: 10, fontWeight: 800,
                padding: '3px 9px',
                borderRadius: 999,
                background: 'rgba(200,241,53,0.12)',
                color: 'var(--lime)',
                border: '1px solid rgba(200,241,53,0.24)',
              }}>
                Ilimitado · {Math.round(((REPORT_PRICE - PRO_PRICE) / REPORT_PRICE) * 100)}% mais barato/mês
              </span>
            </div>

            <Pill color="var(--lime)">Plano Pro</Pill>

            <div style={{ margin: '14px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 36, fontWeight: 900, color: 'var(--lime)', lineHeight: 1 }}>
                  R$ {PRO_PRICE}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>/mês</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.55, margin: '8px 0 0' }}>
                <strong style={{ color: 'var(--lime)' }}>Pague menos por mês, receba muito mais.</strong>{' '}
                Relatórios ilimitados + monitor mensal + alertas + API.
              </p>
            </div>

            {/* Comparativo direto features (sem "X relatórios = Y meses" que confunde) */}
            <ValueComparisonCard reportPrice={REPORT_PRICE} proPrice={PRO_PRICE} />

            <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 20px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {PRO_FEATURES.map((feat, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: feat.highlight ? 'var(--text1)' : 'var(--text2)', fontWeight: feat.highlight ? 700 : 500, lineHeight: 1.5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {feat.label}
                </li>
              ))}
            </ul>

            <CheckoutButton
              endpoint="/api/checkout/monitor"
              eventName="pro_upgrade_from_relatorio"
              style={{
                minHeight: 44,
                background: 'var(--lime)',
                color: 'var(--ink-on-accent)',
                fontWeight: 900, fontSize: 14,
              }}
            >
              Assinar Pro · R$ {PRO_PRICE}/mês
            </CheckoutButton>
            <p style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', margin: '8px 0 0' }}>
              Cancele quando quiser · Sem fidelidade · 7 dias de garantia (CDC art. 49)
            </p>
          </Panel>
        </section>
      )}
    </>
  )
}

/** Comparativo de VALOR (não de break-even confuso).
 *  Mostra que avulso = 1 PDF / Pro = ilimitado, com preços alinhados. */
function ValueComparisonCard({ reportPrice, proPrice }: { reportPrice: number; proPrice: number }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 'var(--radius)',
      background: 'rgba(200,241,53,0.06)',
      border: '1px solid rgba(200,241,53,0.16)',
      marginTop: 4,
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        Comparativo direto
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Avulso */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>Avulso</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 900, color: 'var(--text2)' }}>
            1<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginLeft: 4 }}>PDF</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            R$ {reportPrice}
          </div>
        </div>
        {/* Pro */}
        <div style={{
          textAlign: 'left',
          padding: '0 0 0 12px',
          borderLeft: '1px solid rgba(200,241,53,0.16)',
        }}>
          <div style={{ fontSize: 10, color: 'var(--lime)', marginBottom: 4, fontWeight: 700 }}>Pro</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 900, color: 'var(--lime)' }}>
            ∞<span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginLeft: 4 }}>PDFs</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            R$ {proPrice}<span style={{ color: 'var(--text3)' }}>/mês</span>
          </div>
        </div>
      </div>
      <div style={{
        marginTop: 10, paddingTop: 10,
        borderTop: '1px dashed rgba(200,241,53,0.16)',
        fontSize: 11, color: 'var(--text2)', lineHeight: 1.45,
      }}>
        Pague <strong style={{ color: 'var(--lime)' }}>R$ {reportPrice - proPrice} a menos</strong> por mês e
        gere quantos relatórios precisar. Sem limite, sem novo checkout a cada simulação.
      </div>
    </div>
  )
}

/** Upsell compacto quando user já comprou relatório avulso pelo menos 1× */
function ProUpsellCompact({ totalReportsPaid, moneySpent, monthsEquivalent }: { totalReportsPaid: number; moneySpent: number; monthsEquivalent: number }) {
  return (
    <Panel style={{
      padding: 22,
      marginTop: 16,
      background: 'linear-gradient(135deg, var(--bg1) 0%, rgba(200,241,53,0.04) 100%)',
      borderColor: 'rgba(200,241,53,0.2)',
    }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'rgba(200,241,53,0.12)', border: '1px solid rgba(200,241,53,0.24)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Você já comprou {totalReportsPaid} {totalReportsPaid === 1 ? 'relatório' : 'relatórios'}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>
            Esses R$ {moneySpent} {monthsEquivalent > 1 ? `dariam ${monthsEquivalent} meses de Pro` : 'já dariam Pro ilimitado'}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>
            No Plano Pro você gera quantos relatórios quiser por R$ {PRO_PRICE}/mês, mais monitor mensal, alertas e API.
          </p>
        </div>
        <CheckoutButton
          endpoint="/api/checkout/monitor"
          eventName="pro_upgrade_from_relatorio"
          style={{
            minHeight: 40,
            background: 'var(--lime)',
            color: 'var(--ink-on-accent)',
            fontWeight: 800, fontSize: 13,
            flexShrink: 0,
          }}
        >
          Migrar para Pro
        </CheckoutButton>
      </div>
    </Panel>
  )
}
