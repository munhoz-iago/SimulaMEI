import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createClientMock, signOutMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  signOutMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

function makeRequest(method: string, url = 'http://localhost/auth/logout') {
  return new NextRequest(url, { method })
}

function makeSupabaseClient() {
  return {
    auth: {
      signOut: signOutMock.mockResolvedValue({ error: null }),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  createClientMock.mockResolvedValue(makeSupabaseClient())
})

describe('/auth/logout route handlers', () => {
  describe('POST — happy path', () => {
    it('chama signOut com escopo global e redireciona para /auth/login (303)', async () => {
      const { POST } = await import('./route')
      const response = await POST(makeRequest('POST'))

      expect(signOutMock).toHaveBeenCalledTimes(1)
      expect(signOutMock).toHaveBeenCalledWith({ scope: 'global' })
      expect(response.status).toBe(303)
      const location = response.headers.get('location')
      expect(location).toBeTruthy()
      expect(new URL(location!).pathname).toBe('/auth/login')
    })

    it('com reason=inactive usa escopo local e preserva o motivo no redirect', async () => {
      const { POST } = await import('./route')
      const response = await POST(
        makeRequest('POST', 'http://localhost/auth/logout?reason=inactive'),
      )

      expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' })
      expect(response.status).toBe(303)
      const location = response.headers.get('location')
      const parsed = new URL(location!)
      expect(parsed.pathname).toBe('/auth/login')
      expect(parsed.searchParams.get('reason')).toBe('inactive')
    })
  })

  describe('CSRF hardening — GET é rejeitado', () => {
    it('não exporta handler GET (audit P1.1: bloqueia <img src=...> attack)', async () => {
      const mod = await import('./route')

      // O módulo deve expor APENAS POST. Se algum dia alguém adicionar GET,
      // HEAD ou OPTIONS sem revisar threat-model, este teste explode.
      expect(mod).not.toHaveProperty('GET')
      expect(mod).not.toHaveProperty('HEAD')
      expect(mod).not.toHaveProperty('PUT')
      expect(mod).not.toHaveProperty('DELETE')
      expect(mod).not.toHaveProperty('PATCH')
      expect(mod).toHaveProperty('POST')
    })

    it('signOut não é chamado quando apenas POST é exportado e o request é GET', async () => {
      // Sanity check: como não existe GET handler, o Next.js retornaria 405.
      // Aqui validamos que o módulo não invocou nada acidentalmente no import.
      await import('./route')
      expect(signOutMock).not.toHaveBeenCalled()
      expect(createClientMock).not.toHaveBeenCalled()
    })
  })
})
