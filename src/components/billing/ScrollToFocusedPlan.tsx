'use client'

import { useEffect } from 'react'

/**
 * Faz auto-scroll suave até o card do plano que o usuário escolheu na home
 * (link "Quero o Starter/Pro" passa ?focus=starter|pro). Reduz cliques entre
 * intenção e abertura do Stripe Checkout.
 *
 * Renderizado dentro de uma Server Component que já parseou e validou o
 * focusedPlan — aqui só fazemos o trabalho client-side de localizar o anchor.
 */
export function ScrollToFocusedPlan({ planKey }: { planKey: 'starter' | 'pro' }) {
  useEffect(() => {
    // Pequeno delay para a animação de fade-in dos cards terminar antes do scroll
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`plan-${planKey}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 240)

    return () => window.clearTimeout(timer)
  }, [planKey])

  return null
}
