import { redirect } from 'next/navigation'
import { REPORT_PRICE_LABEL } from '@/constants/pricing'
import { CheckoutButton } from '@/components/billing/CheckoutButton'
import { DownloadReportButton } from '@/components/billing/DownloadReportButton'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Relatório Fiscal — SimulaMEI',
  description: 'Checkout e download do relatório fiscal premium do SimulaMEI.',
}

export default async function RelatorioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/relatorio')
  }

  const [{ data: profile }, { data: purchases }] = await Promise.all([
    supabase.from('user_profiles').select('plano').eq('id', user.id).maybeSingle(),
    supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('produto', 'relatorio')
      .eq('status', 'paid')
      .limit(1),
  ])

  const hasAccess = profile?.plano === 'pro' || (purchases?.length ?? 0) > 0

  return (
    <StaticPageLayout
      title="Relatório fiscal premium"
      subtitle="Memória de cálculo, oportunidades fiscais e versão exportável em PDF."
    >
      <section style={{ display: 'grid', gap: 18 }}>
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <h2 style={{ fontSize: 20, color: 'var(--text1)', marginBottom: 8 }}>O que entra no relatório</h2>
          <ul style={{ paddingLeft: 18 }}>
            <li>Resumo fiscal do cenário mais recente</li>
            <li>Comparativo de regimes e alerta de teto</li>
            <li>Oportunidades prioritárias com impacto estimado</li>
            <li>Arquivo PDF para compartilhar com contador ou sócio</li>
          </ul>
        </div>

        {hasAccess ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ color: 'var(--text2)' }}>
              Seu acesso já está liberado.
            </div>
            <DownloadReportButton />
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ color: 'var(--text2)' }}>
              Compra avulsa do relatório: <strong style={{ color: 'var(--text1)' }}>{REPORT_PRICE_LABEL}</strong>
            </div>
            <CheckoutButton endpoint="/api/checkout/report" eventName="pdf_cta_clicked">
              Comprar relatório
            </CheckoutButton>
          </div>
        )}
      </section>
    </StaticPageLayout>
  )
}
