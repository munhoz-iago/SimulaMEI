'use client'

import { usePathname } from 'next/navigation'
import { CookieBanner } from './CookieBanner'

const SUPPRESS = ['/auth', '/onboarding']

export function CookieBannerGate() {
  const pathname = usePathname() ?? ''
  if (SUPPRESS.some(p => pathname === p || pathname.startsWith(`${p}/`))) return null
  return <CookieBanner />
}
