'use client'

import { useEffect, useRef, useState } from 'react'
import { captureProductEvent } from '@/lib/analytics/events'

const ENDPOINT_BY_PLAN = {
  starter: '/api/checkout/accountant-starter',
  pro: '/api/checkout/accountant-pro',
} as const

type Status = 'firing' | 'failed'

/**
 * Dispara automaticamente o checkout do plano contador uma única vez
 * após o login (deep-link `?autocheckout=<plan>`). Em sucesso captura
 * `checkout_resumed_after_login` e redireciona pro Stripe Checkout;
 * em falha esconde-se silenciosamente para o usuário cair no card
 * manual da página abaixo.
 *
 * `useRef` guard impede double-fire em re-renders / Strict Mode.
 *
 * NÃO está montado em nenhuma página ainda — montagem é Task #30.
 */
export function AutoCheckoutTrigger({ plan }: { plan: 'starter' | 'pro' }) {
  const triggered = useRef(false)
  const [status, setStatus] = useState<Status>('firing')

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true

    ;(async () => {
      try {
        const endpoint = ENDPOINT_BY_PLAN[plan]
        const response = await fetch(endpoint, { method: 'POST' })
        const payload = await response.json().catch(() => null) as { url?: string; error?: string } | null

        if (!response.ok || !payload?.url) {
          setStatus('failed')
          return
        }

        captureProductEvent('checkout_resumed_after_login', { plan })
        window.location.href = payload.url
      } catch {
        setStatus('failed')
      }
    })()
  }, [plan])

  if (status === 'failed') return null

  const planLabel = plan === 'pro' ? 'Pro' : 'Starter'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--tint-lime)',
        border: '1px solid var(--tint-lime-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 18px',
        marginBottom: 24,
        fontSize: 13,
        color: 'var(--text2)',
      }}
    >
      Redirecionando para o checkout do plano <strong style={{ color: 'var(--text1)' }}>{planLabel}</strong>...
    </div>
  )
}
