import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'
import { DashboardSimulator } from '@/components/dashboard/DashboardSimulator'
import { getDashboardContext } from '@/lib/dashboard/context'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Nova simulação — SimulaMEI',
  description: 'Simule cenários tributários direto do dashboard sem perder o contexto.',
}

interface MonthlyInputRow {
  faturamento_mes: number
  folha_mes: number
  cnae: string | null
}

/**
 * Busca os últimos lançamentos do Monitor mensal pra pré-popular o simulador
 * quando o user chegar via ?prefill=monitor (ex: clicando numa recomendação
 * do MonitorInsights).
 */
async function getMonitorPrefill(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('monthly_inputs')
    .select('faturamento_mes, folha_mes, cnae')
    .eq('user_id', userId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .limit(12)

  const rows = (data ?? []) as MonthlyInputRow[]
  if (rows.length === 0) return undefined

  const sumFat = rows.reduce((s, r) => s + Number(r.faturamento_mes), 0)
  const sumFolha = rows.reduce((s, r) => s + Number(r.folha_mes), 0)

  return {
    averageMonthly: sumFat / rows.length,
    avgFolhaMes: sumFolha / rows.length,
    cnaeCode: rows.find(r => r.cnae)?.cnae ?? '',
  }
}

export default async function DashboardSimularPage() {
  const ctx = await getDashboardContext()
  const prefill = await getMonitorPrefill(ctx.user.id)

  return (
    <>
      <DashboardPageHeader
        greeting="Nova simulação"
        subtitle="Roda um novo cenário sem sair do dashboard. O resultado é salvo automaticamente no seu histórico."
        plan={ctx.plan}
      />

      <DashboardSimulator userEmail={ctx.user.email ?? ''} monitorPrefill={prefill} />
    </>
  )
}
