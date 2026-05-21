/**
 * Helper isolado para construir a URL de redirecionamento ao login quando
 * o backend de checkout responde 401 (autenticação obrigatória) num plano
 * contador. Mantido fora do componente `'use client'` `CheckoutButton.tsx`
 * para permitir testes puros em ambiente `node` (vitest).
 *
 * O `next=` é encodado para que o `?` e `&` internos virem `%3F` e `%26`,
 * preservando o significado original do URL aninhado quando o consumidor
 * decodificar o parâmetro no servidor.
 */
export function buildCheckoutAuthRedirectUrl(plan: 'starter' | 'pro'): string {
  const next = `/upgrade/contador?autocheckout=${plan}&plan=${plan}`
  return `/auth/login?next=${encodeURIComponent(next)}`
}
