import { describe, expect, it } from 'vitest'
import { sanitizeNextParam } from './safe-redirect'

describe('sanitizeNextParam', () => {
  it('accepts /dashboard', () => {
    expect(sanitizeNextParam('/dashboard')).toBe('/dashboard')
  })

  it('accepts /contador/clientes/abc-123', () => {
    expect(sanitizeNextParam('/contador/clientes/abc-123')).toBe('/contador/clientes/abc-123')
  })

  it('accepts /dashboard with query string', () => {
    expect(sanitizeNextParam('/dashboard?tab=overview')).toBe('/dashboard?tab=overview')
  })

  it('rejects protocol-relative //evil.com', () => {
    expect(sanitizeNextParam('//evil.com')).toBe('/dashboard')
  })

  it('rejects backslash /\\evil.com (browser normalizes to //)', () => {
    expect(sanitizeNextParam('/\\evil.com')).toBe('/dashboard')
  })

  it('rejects encoded backslash /%5cevil.com', () => {
    expect(sanitizeNextParam('/%5cevil.com')).toBe('/dashboard')
  })

  it('rejects encoded //evil.com (%2f%2f)', () => {
    expect(sanitizeNextParam('%2f%2fevil.com')).toBe('/dashboard')
  })

  it('rejects javascript: scheme', () => {
    expect(sanitizeNextParam('javascript:alert(1)')).toBe('/dashboard')
  })

  it('rejects /javascript: scheme via leading slash', () => {
    expect(sanitizeNextParam('/javascript:alert(1)')).toBe('/dashboard')
  })

  it('rejects data: scheme', () => {
    expect(sanitizeNextParam('data:text/html,<script>alert(1)</script>')).toBe('/dashboard')
  })

  it('rejects absolute URL http://evil.com', () => {
    expect(sanitizeNextParam('http://evil.com')).toBe('/dashboard')
  })

  it('rejects absolute URL https://evil.com', () => {
    expect(sanitizeNextParam('https://evil.com')).toBe('/dashboard')
  })

  it('rejects empty string', () => {
    expect(sanitizeNextParam('')).toBe('/dashboard')
  })

  it('rejects null', () => {
    expect(sanitizeNextParam(null)).toBe('/dashboard')
  })

  it('rejects undefined', () => {
    expect(sanitizeNextParam(undefined)).toBe('/dashboard')
  })

  it('rejects tab-embedded /%09/evil.com', () => {
    expect(sanitizeNextParam('/%09/evil.com')).toBe('/dashboard')
  })

  it('rejects CR-embedded path', () => {
    expect(sanitizeNextParam('/foo%0devil.com')).toBe('/dashboard')
  })

  it('rejects LF-embedded path', () => {
    expect(sanitizeNextParam('/foo%0aevil.com')).toBe('/dashboard')
  })

  it('rejects path not starting with /', () => {
    expect(sanitizeNextParam('dashboard')).toBe('/dashboard')
  })

  it('rejects malformed encoding gracefully', () => {
    expect(sanitizeNextParam('/%E0%A4%A')).toBe('/dashboard')
  })

  it('respects custom fallback for invalid input', () => {
    expect(sanitizeNextParam('//evil.com', '/contador')).toBe('/contador')
  })

  it('respects custom fallback for empty input', () => {
    expect(sanitizeNextParam(null, '/')).toBe('/')
  })
})
