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

const REPORT_FEATURES = [
  'Resumo fiscal do cenário mais recente',
  'Comparativo de regimes (Simples III, V, Lucro Presumido e Real)',
  'Alerta de teto MEI com projeção anual',
  'Oportunidades prioritárias com impacto estimado',
  'Arquivo PDF para compartilhar com contador ou sócio',
]

export default async function DashboardRelatorioPage() {
  const ctx = await getDashboardContext()
  const supabase = await createClient()
  const { data: purchases } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', ctx.user.id)
    .eq('produto', 'relatorio')
    .eq('status', 'paid')
    .limit(1)

  const hasAccess = ctx.plan === 'pro' || (purchases?.length ?? 0) > 0

  return (
    <>
      <DashboardPageHeader
        greeting="Relatório fiscal premium"
        subtitle="Gere ou baixe o PDF do seu cenário atual — memória de cálculo, comparativo de regimes e oportunidades."
        plan={ctx.plan}
      />

      <section style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }} className="db-row1">
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

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
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

        <Panel style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {hasAccess ? (
            <>
              <Pill color="var(--lime)">Acesso liberado</Pill>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '4px 0' }}>Baixar relatório</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
                {ctx.plan === 'pro'
                  ? 'Seu Plano Pro inclui geração ilimitada de relatórios.'
                  : 'Você já adquiriu o relatório avulso. Pode baixar quantas vezes precisar.'}
              </p>
              <DownloadReportButton />
            </>
          ) : (
            <>
              <Pill color="var(--blue)">Compra avulsa</Pill>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '4px 0' }}>R$ 29</h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
                Acesso ao PDF da sua simulação mais recente. Pagamento único, sem assinatura.
              </p>
              <CheckoutButton endpoint="/api/checkout/report" eventName="pdf_cta_clicked">
                Comprar relatório
              </CheckoutButton>
              <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>
                  Quer geração ilimitada? O <strong>Plano Pro</strong> inclui relatórios + API + histórico estendido.
                </p>
              </div>
            </>
          )}
        </Panel>
      </section>
    </>
  )
}
