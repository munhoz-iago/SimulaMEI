import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'
import { DashboardSimulator } from '@/components/dashboard/DashboardSimulator'
import { getDashboardContext } from '@/lib/dashboard/context'

export const metadata = {
  title: 'Nova simulação — SimulaMEI',
  description: 'Simule cenários tributários direto do dashboard sem perder o contexto.',
}

export default async function DashboardSimularPage() {
  const ctx = await getDashboardContext()

  return (
    <>
      <DashboardPageHeader
        greeting="Nova simulação"
        subtitle="Roda um novo cenário sem sair do dashboard. O resultado é salvo automaticamente no seu histórico."
        plan={ctx.plan}
      />

      <DashboardSimulator userEmail={ctx.user.email ?? ''} />
    </>
  )
}
