import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccountantBillingNotice } from '@/components/accountant/AccountantBillingNotice'
import { AccountantShell } from '@/components/accountant/AccountantShell'
import { OfficeAlertsPanel } from '@/components/accountant/OfficeAlertsPanel'
import { OfficeClientTable } from '@/components/accountant/OfficeClientTable'
import { OfficeStatsCards } from '@/components/accountant/OfficeStatsCards'
import { TrialCheckinCard } from '@/components/accountant/TrialCheckinCard'
import { getAccountantBillingState } from '@/lib/accountant/billing-state'
import { getTodayTrialCheckin, shouldShowTrialCheckin } from '@/lib/accountant/trial-checkins'
import { getCurrentAccountantOffice, getOfficeClientStats, isAdminAccessFallbackOffice, listOfficeAlerts, listOfficeClients } from '@/lib/accountant/server'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Painel Contador — SimulaMEI',
  description: 'Carteira de clientes MEI para escritórios contábeis no SimulaMEI.',
}

export default async function AccountantDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/contador')
  }

  const { office, error } = await getCurrentAccountantOffice(supabase, user.id, user.email)
  if (error) {
    throw new Error(`Accountant dashboard office query failed: ${error}`)
  }

  if (!office) {
    redirect('/onboarding/contador')
  }

  const trialCheckinPromise = office.plan === 'starter_trial' && !isAdminAccessFallbackOffice(office)
    ? getTodayTrialCheckin(office.id, user.id).catch(error => {
      console.error('[/contador] trial checkin query error:', error)
      return null
    })
    : Promise.resolve(null)

  const [stats, recentClients, openAlerts, resolvedAlerts, todayCheckin] = await Promise.all([
    getOfficeClientStats(office.id),
    listOfficeClients(office.id, { status: 'all', page: 1, pageSize: 5 }),
    listOfficeAlerts(office.id, { status: 'open', limit: 4 }),
    listOfficeAlerts(office.id, { status: 'resolved', limit: 3 }),
    trialCheckinPromise,
  ])
  const trialEndsAt = office.trial_ends_at
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(office.trial_ends_at))
    : null
  const billingState = getAccountantBillingState(office)

  return (
    <AccountantShell office={office} active="dashboard">
      {billingState.restricted ? (
        <div style={{ marginBottom: 16 }}>
          <AccountantBillingNotice state={billingState} compact />
        </div>
      ) : null}

      <TrialCheckinCard show={shouldShowTrialCheckin(office, todayCheckin)} />

      <OfficeStatsCards stats={stats} limit={office.max_clients} trialEndsAt={trialEndsAt} />

      <OfficeAlertsPanel openAlerts={openAlerts} resolvedAlerts={resolvedAlerts} />

      <section style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
          <h2 style={{ fontSize: 22 }}>Clientes recentes</h2>
          <Link href="/contador/clientes" className="quiet-link">
            Ver carteira
          </Link>
        </div>
        <OfficeClientTable clients={recentClients.clients} />
      </section>
    </AccountantShell>
  )
}
