import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthCallbackOrigin } from './origin'

describe('getAuthCallbackOrigin', () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalWindow) {
      globalThis.window = originalWindow
    }
  })

  it('returns DEFAULT_SITE_URL when window is undefined (SSR)', () => {
    // @ts-expect-error — simulating SSR
    delete globalThis.window
    expect(getAuthCallbackOrigin()).toBe('https://simulamei.com.br')
  })

  it('returns canonical https URL when on simulamei.com.br', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'simulamei.com.br', origin: 'https://simulamei.com.br' },
    })
    expect(getAuthCallbackOrigin()).toBe('https://simulamei.com.br')
  })

  it('returns canonical https URL when on www.simulamei.com.br', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'www.simulamei.com.br', origin: 'https://www.simulamei.com.br' },
    })
    expect(getAuthCallbackOrigin()).toBe('https://www.simulamei.com.br')
  })

  it('returns window.location.origin on Vercel preview URLs (transient deployment)', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'simula-mei-git-feat-auth-deeplin-f507bb-munhoziago244s-projects.vercel.app',
        origin: 'https://simula-mei-git-feat-auth-deeplin-f507bb-munhoziago244s-projects.vercel.app',
      },
    })
    expect(getAuthCallbackOrigin()).toBe(
      'https://simula-mei-git-feat-auth-deeplin-f507bb-munhoziago244s-projects.vercel.app',
    )
  })

  it('returns window.location.origin on localhost dev', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', origin: 'http://localhost:3000' },
    })
    expect(getAuthCallbackOrigin()).toBe('http://localhost:3000')
  })

  it('returns window.location.origin on Vercel branch alias (not canonical)', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'simula-mei-git-main-munhoziago244s-projects.vercel.app',
        origin: 'https://simula-mei-git-main-munhoziago244s-projects.vercel.app',
      },
    })
    expect(getAuthCallbackOrigin()).toBe(
      'https://simula-mei-git-main-munhoziago244s-projects.vercel.app',
    )
  })
})
