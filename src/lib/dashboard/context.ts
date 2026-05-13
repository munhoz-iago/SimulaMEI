import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin-access'
import { isOnboardingComplete, type UserProfileOnboarding } from '@/lib/onboarding'
import { PLAN_LABELS } from '@/constants/plans'

type Plan = keyof typeof PLAN_LABELS

interface DashboardContext {
  user: { id: string; email?: string }
  profile: UserProfileOnboarding | null
  plan: Plan
  userName: string
  greeting: 'Bom dia' | 'Boa tarde' | 'Boa noite'
  hasFullAdminAccess: boolean
}

/**
 * Carrega o contexto compartilhado entre páginas do /dashboard.
 *
 * - Autentica e redireciona se necessário (login + onboarding)
 * - Retorna user + profile + plan + greeting calculado em fuso BR
 *
 * Usa `cache` do React pra deduplicar chamadas entre layout e páginas filhas
 * no mesmo request — múltiplas chamadas retornam o mesmo objeto.
 */
export const getDashboardContext = cache(async (): Promise<DashboardContext> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/dashboard')
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw new Error(`Dashboard profile query failed: ${error.message}`)
  }

  const profileData = profile as UserProfileOnboarding | null
  const hasFullAdminAccess = isAdminEmail(user.email)

  if (!hasFullAdminAccess && !isOnboardingComplete(profileData)) {
    redirect('/onboarding')
  }

  // Greeting baseado no fuso de Brasília (servidor Vercel roda UTC)
  const brHour = Number(
    new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' })
      .format(new Date()),
  )
  const greeting = brHour < 12 ? 'Bom dia' : brHour < 18 ? 'Boa tarde' : 'Boa noite'

  return {
    user: { id: user.id, email: user.email },
    profile: profileData,
    plan: profileData?.plano ?? 'free',
    userName: profileData?.nome ?? user.email?.split('@')[0] ?? 'você',
    greeting,
    hasFullAdminAccess,
  }
})
