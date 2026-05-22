'use client'

import Link from 'next/link'
import { useState } from 'react'
import { captureProductEvent, type ProductEventName } from '@/lib/analytics/events'
import type { AccountantPaidPlan } from '@/lib/accountant/billing'
import { buildCheckoutAuthRedirectUrl } from './checkout-auth-redirect'

type CheckoutState = 'idle' | 'loading' | 'office_missing'

export function CheckoutButton({
  endpoint,
  children,
  eventName,
  officeRequired,
  planForAuth,
  style,
}: {
  endpoint: string
  children: React.ReactNode
  eventName: ProductEventName
  /** Se true, trata 403 office_not_found com CTA em vez de mensagem de erro genérica */
  officeRequired?: boolean
  /**
   * Se setada, ao receber 401 (autenticação obrigatória) o componente
   * captura `checkout_auth_required` e redireciona para o login com
   * deep-link `?next=/upgrade/contador?autocheckout=<plan>&plan=<plan>`.
   * Ausente → 401 cai no fallback genérico de erro.
   */
  planForAuth?: AccountantPaidPlan
  style?: React.CSSProperties
}) {
  const [state, setState] = useState<CheckoutState>('idle')
  const [error, setError] = useState('')

  async function handleClick() {
    setState('loading')
    setError('')
    captureProductEvent(eventName, { endpoint })

    const response = await fetch(endpoint, { method: 'POST' })
    const payload = await response.json().catch(() => null) as { url?: string; error?: string } | null

    if (response.status === 403 && officeRequired) {
      setState('office_missing')
      return
    }

    if (response.status === 401 && planForAuth) {
      captureProductEvent('checkout_auth_required', { plan: planForAuth, endpoint })
      window.location.href = buildCheckoutAuthRedirectUrl(planForAuth)
      return
    }

    if (!response.ok || !payload?.url) {
      setState('idle')
      setError(payload?.error ?? 'Checkout indisponível neste ambiente.')
      return
    }

    window.location.href = payload.url
  }

  // Estado: escritório ausente detectado em runtime
  if (state === 'office_missing') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: 'rgba(245,197,66,0.07)',
        border: '1px solid rgba(245,197,66,0.25)',
        borderRadius: 'var(--radius)',
      }}>
        <span style={{ fontSize: 13, color: 'var(--text2)', flex: 1 }}>
          Escritório não encontrado.
        </span>
        <Link
          href="/onboarding/contador"
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius)',
            background: 'var(--yellow)',
            color: 'var(--ink-on-accent)',
            fontSize: 13,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          }}
        >
          Criar escritório →
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'loading'}
        style={{
          minHeight: 44,
          padding: '0 16px',
          borderRadius: 'var(--radius)',
          background: 'var(--lime)',
          color: 'var(--ink-on-accent)',
          fontSize: 14,
          fontWeight: 800,
          opacity: state === 'loading' ? 0.7 : 1,
          ...style,
        }}
      >
        {state === 'loading' ? 'Redirecionando...' : children}
      </button>
      {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
    </div>
  )
}
