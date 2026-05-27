'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

const LAST_ACTIVITY_KEY = 'simulamei:last-activity-at'
const PENDING_LOGOUT_KEY = 'simulamei:auto-logout-pending'
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000
const CHECK_INTERVAL_MS = 60 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'input'] as const

let memoryLastActivityAt = Date.now()

function getAutoLogoutIdleTimeoutMs() {
  const configuredMinutes = Number(process.env.NEXT_PUBLIC_AUTO_LOGOUT_MINUTES)

  if (Number.isFinite(configuredMinutes) && configuredMinutes > 0) {
    return configuredMinutes * 60 * 1000
  }

  return DEFAULT_IDLE_TIMEOUT_MS
}

function readLastActivityAt() {
  try {
    const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY)
    const parsed = Number(raw)

    if (Number.isFinite(parsed) && parsed > 0) {
      memoryLastActivityAt = parsed
      return parsed
    }
  } catch {
    return memoryLastActivityAt
  }

  return memoryLastActivityAt
}

function writeLastActivityAt(value = Date.now()) {
  memoryLastActivityAt = value

  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(value))
  } catch {
    // In private/restricted contexts the in-memory timestamp still protects the current tab.
  }
}

function ensureLastActivityAt() {
  try {
    const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY)
    const parsed = Number(raw)

    if (Number.isFinite(parsed) && parsed > 0) {
      memoryLastActivityAt = parsed
      return
    }
  } catch {
    return
  }

  writeLastActivityAt()
}

function setPendingLogout() {
  try {
    window.localStorage.setItem(PENDING_LOGOUT_KEY, '1')
  } catch {
    // Best effort cross-tab state.
  }
}

function clearLogoutState() {
  try {
    window.localStorage.removeItem(PENDING_LOGOUT_KEY)
  } catch {
    // Best effort cross-tab state.
  }
}

function hasPendingLogout() {
  try {
    return window.localStorage.getItem(PENDING_LOGOUT_KEY) === '1'
  } catch {
    return false
  }
}

export function AutoLogoutProvider({ children }: { children: ReactNode }) {
  const [hasSession, setHasSession] = useState(false)
  const idleTimeoutMs = useRef(getAutoLogoutIdleTimeoutMs())
  const signingOutRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return

        const active = Boolean(data.session)
        setHasSession(active)

        if (active) {
          ensureLastActivityAt()
        }
      })
      .catch(() => {
        if (mounted) setHasSession(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const active = Boolean(session)
      setHasSession(active)

      if (event === 'SIGNED_IN' && active) {
        writeLastActivityAt()
        clearLogoutState()
      }

      if (!active) {
        clearLogoutState()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!hasSession) return

    const isIdle = () => Date.now() - readLastActivityAt() >= idleTimeoutMs.current

    const requestLogout = () => {
      if (signingOutRef.current) return

      setPendingLogout()

      if (navigator.onLine === false) {
        return
      }

      signingOutRef.current = true
      // POST via formulário invisível: `/auth/logout` aceita apenas POST
      // para evitar CSRF (audit security 2026-05-26 P1.1).
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/auth/logout?reason=inactive'
      form.style.display = 'none'
      document.body.appendChild(form)
      form.submit()
    }

    const checkIdle = () => {
      if (hasPendingLogout() || isIdle()) {
        requestLogout()
      }
    }

    const markActivity = () => {
      if (signingOutRef.current) return
      writeLastActivityAt()
      clearLogoutState()
    }

    const checkThenMarkActivity = () => {
      if (isIdle()) {
        requestLogout()
        return
      }

      markActivity()
    }

    ensureLastActivityAt()
    checkIdle()

    const activityOptions: AddEventListenerOptions = { passive: true }
    ACTIVITY_EVENTS.forEach(eventName => {
      window.addEventListener(eventName, markActivity, activityOptions)
    })

    window.addEventListener('focus', checkThenMarkActivity)
    window.addEventListener('online', checkIdle)
    document.addEventListener('visibilitychange', checkThenMarkActivity)

    const intervalId = window.setInterval(checkIdle, CHECK_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach(eventName => {
        window.removeEventListener(eventName, markActivity, activityOptions)
      })
      window.removeEventListener('focus', checkThenMarkActivity)
      window.removeEventListener('online', checkIdle)
      document.removeEventListener('visibilitychange', checkThenMarkActivity)
      window.clearInterval(intervalId)
    }
  }, [hasSession])

  return <>{children}</>
}
