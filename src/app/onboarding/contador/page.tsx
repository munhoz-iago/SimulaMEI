import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccountantOnboardingWizard } from '@/components/onboarding/AccountantOnboardingWizard'
import { getCurrentAccountantOffice } from '@/lib/accountant/server'
import { isAccountantPaidPlan, type AccountantPaidPlan } from '@/lib/accountant/billing'
import { createClient } from '@/lib/supabase/server'
import { buildOnboardingNextUrl, buildOnboardingSuccessUrl } from './redirect-urls'

export const metadata = {
  title: 'Onboarding Contador — SimulaMEI',
  description: 'Crie o escritório contábil para gerenciar carteira MEI no SimulaMEI.',
}

interface SearchParams {
  plan?: string
}

export default async function AccountantOnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  const plan: AccountantPaidPlan | null = isAccountantPaidPlan(params.plan) ? params.plan : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(buildOnboardingNextUrl(plan))
  }

  const { office, error } = await getCurrentAccountantOffice(supabase, user.id, user.email)
  if (error) {
    throw new Error(`Accountant onboarding office query failed: ${error}`)
  }

  if (office) {
    redirect(buildOnboardingSuccessUrl(plan))
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg0)',
      color: 'var(--text1)',
      padding: '34px 24px 64px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 28 }}>
          <Link href="/para-contadores" style={{ color: 'var(--lime)', fontSize: 13, textDecoration: 'none' }}>
            Voltar ao plano contador
          </Link>
          <h1 style={{
            fontSize: 'clamp(34px, 6vw, 68px)',
            lineHeight: 0.96,
            letterSpacing: 0,
            margin: '18px 0 12px',
            maxWidth: 850,
          }}>
            Configure o escritório antes da carteira.
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.7, maxWidth: 680 }}>
            Esta etapa cria o tenant contador, define o trial Starter e prepara a separação segura entre clientes, membros e simulações.
          </p>
        </header>

        <AccountantOnboardingWizard email={user.email ?? ''} plan={plan} />
      </div>
    </main>
  )
}
