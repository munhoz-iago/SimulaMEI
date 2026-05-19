import { redirect } from 'next/navigation'
import { hasReportAccess } from '@/lib/auth/report-access'
import { reportFingerprint } from '@/lib/reports/reportFingerprint'
import { REPORT_PRICE_LABEL } from '@/constants/pricing'
import { CheckoutButton } from '@/components/billing/CheckoutButton'
import { DownloadReportButton } from '@/components/billing/DownloadReportButton'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { createClient } from '@/lib/supabase/server'
import type { ResultadoSimulacao } from '@/types/tributario'

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

  const [{ data: profile }, { data: purchases }, { data: sims }] = await Promise.all([
    supabase.from('user_profiles').select('plano').eq('id', user.id).maybeSingle(),
    supabase
      .from('purchases')
      .select('report_fingerprint')
      .eq('user_id', user.id)
      .eq('produto', 'relatorio')
      .eq('status', 'paid'),
    supabase
      .from('simulations')
      .select('resultado')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const latest = (sims?.[0] as { resultado: ResultadoSimulacao } | undefined)?.resultado
  const currentFp = latest ? reportFingerprint(latest.entrada) : null
  const paidFps = (purchases ?? [])
    .map(p => (p as { report_fingerprint: string | null }).report_fingerprint)
    .filter(Boolean) as string[]
  const hasAccess = hasReportAccess({
    plan: profile?.plano,
    paidFingerprints: paidFps,
    currentFingerprint: currentFp,
  })

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
              Este relatório já está liberado.
            </div>
            <DownloadReportButton />
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            <iframe
              src="/api/relatorio/gerar?preview=1"
              title="Prévia do relatório fiscal"
              style={{
                width: '100%',
                height: 480,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
              }}
            />
            <div style={{ color: 'var(--text2)' }}>
              Liberar este relatório: <strong style={{ color: 'var(--text1)' }}>{REPORT_PRICE_LABEL}</strong>
            </div>
            <CheckoutButton endpoint="/api/checkout/report" eventName="pdf_cta_clicked">
              Liberar PDF — {REPORT_PRICE_LABEL}
            </CheckoutButton>
          </div>
        )}
      </section>
    </StaticPageLayout>
  )
}
