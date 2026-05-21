import type { AccountantPaidPlan } from '@/lib/accountant/billing'

/**
 * Pure helpers que compõem as URLs de redirecionamento do fluxo de onboarding
 * contador. Extraídos pra fora do `page.tsx` (server component) pra permitir
 * testes determinísticos em vitest sem precisar montar o runtime do Next.
 *
 * Contrato:
 * - `buildOnboardingNextUrl`: monta o `?next=` percent-encoded pro login,
 *   preservando o `?plan=` quando o usuário caiu no onboarding via deep-link
 *   de checkout (`/upgrade/contador?autocheckout=pro` → no office → onboarding).
 * - `buildOnboardingSuccessUrl`: destino pós-criação do escritório. Se o
 *   usuário veio com plan, leva direto pra `/upgrade/contador?autocheckout=`
 *   fechando a malha do deep-link; senão dashboard normal.
 */
export function buildOnboardingNextUrl(plan: AccountantPaidPlan | null): string {
  const onboardingPath = plan ? `/onboarding/contador?plan=${plan}` : '/onboarding/contador'
  return `/auth/login?next=${encodeURIComponent(onboardingPath)}`
}

export function buildOnboardingSuccessUrl(plan: AccountantPaidPlan | null): string {
  if (plan) {
    return `/upgrade/contador?autocheckout=${plan}&plan=${plan}`
  }
  return '/contador'
}
