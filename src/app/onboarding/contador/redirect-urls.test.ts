import { describe, expect, it } from 'vitest'
import { buildOnboardingNextUrl, buildOnboardingSuccessUrl } from './redirect-urls'

describe('buildOnboardingNextUrl', () => {
  it('builds a bare onboarding next URL when no plan is provided', () => {
    expect(buildOnboardingNextUrl(null)).toBe('/auth/login?next=%2Fonboarding%2Fcontador')
  })

  it('preserves ?plan=pro percent-encoded inside the next= value', () => {
    const url = buildOnboardingNextUrl('pro')
    expect(url).toBe('/auth/login?next=%2Fonboarding%2Fcontador%3Fplan%3Dpro')
    // Sanity check: a decoded value re-exposes the original path with the plan intact.
    const next = new URL(url, 'https://example.test').searchParams.get('next')
    expect(next).toBe('/onboarding/contador?plan=pro')
  })

  it('preserves ?plan=starter percent-encoded inside the next= value', () => {
    const url = buildOnboardingNextUrl('starter')
    const next = new URL(url, 'https://example.test').searchParams.get('next')
    expect(next).toBe('/onboarding/contador?plan=starter')
  })
})

describe('buildOnboardingSuccessUrl', () => {
  it('returns the contador dashboard when no plan is set', () => {
    expect(buildOnboardingSuccessUrl(null)).toBe('/contador')
  })

  it('forwards to /upgrade/contador with autocheckout=pro when plan is pro', () => {
    expect(buildOnboardingSuccessUrl('pro')).toBe('/upgrade/contador?autocheckout=pro&plan=pro')
  })

  it('forwards to /upgrade/contador with autocheckout=starter when plan is starter', () => {
    expect(buildOnboardingSuccessUrl('starter')).toBe(
      '/upgrade/contador?autocheckout=starter&plan=starter',
    )
  })
})
