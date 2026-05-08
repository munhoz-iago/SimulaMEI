'use client'

import { useState, useSyncExternalStore } from 'react'
import posthog from 'posthog-js'

const CONSENT_COOKIE = 'analytics_consent'
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

type AnalyticsConsent = 'accepted' | 'rejected'
type ConsentSnapshot = AnalyticsConsent | 'unset' | 'unknown'

function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof document === 'undefined') return null

  const match = document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith(`${CONSENT_COOKIE}=`))

  const value = match?.split('=')[1]
  return value === 'accepted' || value === 'rejected' ? value : null
}

function setAnalyticsConsent(value: AnalyticsConsent) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

function subscribeConsentStore() {
  return () => {}
}

function getConsentSnapshot(): ConsentSnapshot {
  return getAnalyticsConsent() ?? 'unset'
}

function getServerConsentSnapshot(): ConsentSnapshot {
  return 'unknown'
}

export function CookieBanner() {
  const consent = useSyncExternalStore(subscribeConsentStore, getConsentSnapshot, getServerConsentSnapshot)
  const [dismissed, setDismissed] = useState(false)

  if (consent !== 'unset' || dismissed) return null

  const accept = () => {
    setAnalyticsConsent('accepted')
    posthog.opt_in_capturing()
    posthog.capture('$pageview')
    setDismissed(true)
  }

  const reject = () => {
    setAnalyticsConsent('rejected')
    posthog.opt_out_capturing()
    setDismissed(true)
  }

  return (
    <section
      aria-label="Preferências de cookies"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 50,
        maxWidth: 760,
        margin: '0 auto',
        padding: '14px 16px',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg2)',
        boxShadow: '0 18px 48px rgba(0,0,0,0.28)',
        color: 'var(--text1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)', lineHeight: 1.45, maxWidth: 520 }}>
          Usamos analytics para entender uso do produto. Você pode aceitar ou continuar apenas com cookies essenciais.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={reject}
            style={{
              minHeight: 44,
              padding: '0 14px',
              borderRadius: 6,
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text2)',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Recusar
          </button>
          <button
            type="button"
            onClick={accept}
            style={{
              minHeight: 44,
              padding: '0 14px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--lime)',
              color: 'var(--ink-on-accent)',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            Aceitar
          </button>
        </div>
      </div>
    </section>
  )
}
