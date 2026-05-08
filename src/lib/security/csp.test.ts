import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from './csp'

describe('buildContentSecurityPolicy', () => {
  it('includes a per-request nonce and required third-party origins', () => {
    const policy = buildContentSecurityPolicy('nonce-test')

    expect(policy).toContain("script-src 'self' 'nonce-nonce-test'")
    expect(policy).toContain('https://js.stripe.com')
    expect(policy).toContain('https://app.posthog.com')
    expect(policy).toContain('https://api.anthropic.com')
    expect(policy).toContain("frame-ancestors 'none'")
  })
})
