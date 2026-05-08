'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { CookieBanner } from './CookieBanner'

const CONSENT_COOKIE = 'analytics_consent'

function getAnalyticsConsent() {
  const match = document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith(`${CONSENT_COOKIE}=`))

  return match?.split('=')[1] ?? null
}

export function PostHogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!apiKey || typeof window === 'undefined' || posthog.__loaded) {
      return
    }

    posthog.init(apiKey, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      disable_session_recording: true,
      opt_out_capturing_by_default: true,
      persistence: 'localStorage+cookie',
      advanced_disable_decide: true,
      loaded(instance) {
        instance.register({
          app: 'simulamei',
        })
        if (getAnalyticsConsent() === 'accepted') {
          instance.opt_in_capturing()
          instance.capture('$pageview')
        } else {
          instance.opt_out_capturing()
        }
      },
    })
  }, [])

  return (
    <>
      {children}
      <CookieBanner />
    </>
  )
}
