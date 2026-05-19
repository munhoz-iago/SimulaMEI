import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const { updateSessionMock } = vi.hoisted(() => ({
  updateSessionMock: vi.fn(),
}))

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: updateSessionMock,
}))

import { proxy } from './proxy'

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function makeSupabaseProfileMock(profile: Record<string, unknown> | null = {
    onboarding_completed_at: '2026-01-01T00:00:00.000Z',
    nome: 'Ana',
    nome_negocio: 'Studio',
    telefone: '11999999999',
    cnae_principal: '6204-0/00',
    tipo_mei: 'geral',
    municipio: 'Sao Paulo',
    uf: 'SP',
    faturamento_acumulado_atual: 1000,
    folha_mensal: 0,
    mes_atual: 1,
    objetivo_principal: 'Monitorar teto',
    atividades_realizadas: 'Desenvolvimento de sistemas',
  }) {
    return {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
          })),
        })),
      })),
    }
  }

  it('redirects anonymous users hitting protected routes to login with next param', async () => {
    updateSessionMock.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: null,
    })

    const request = new NextRequest('http://localhost/dashboard')
    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/auth/login?next=%2Fdashboard')
  })

  it('protects accountant routes for anonymous users', async () => {
    updateSessionMock.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: null,
    })

    const request = new NextRequest('http://localhost/contador')
    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/auth/login?next=%2Fcontador')
  })

  it('keeps the plan comparison page public for anonymous users', async () => {
    const nextResponse = NextResponse.next()
    nextResponse.headers.set('x-test-response', 'ok')
    updateSessionMock.mockResolvedValue({
      supabaseResponse: nextResponse,
      user: null,
    })

    const request = new NextRequest('http://localhost/upgrade')
    const response = await proxy(request)

    expect(response).toBe(nextResponse)
    expect(response.headers.get('x-test-response')).toBe('ok')
  })

  it('redirects authenticated users away from auth pages', async () => {
    updateSessionMock.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      supabase: makeSupabaseProfileMock(),
      user: { id: 'user-1' },
    })

    const request = new NextRequest('http://localhost/auth/login')
    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/dashboard')
  })

  it('returns the session-updated response for public routes', async () => {
    const nextResponse = NextResponse.next()
    nextResponse.headers.set('x-test-response', 'ok')
    updateSessionMock.mockResolvedValue({
      supabaseResponse: nextResponse,
      user: null,
    })

    const request = new NextRequest('http://localhost/privacidade')
    const response = await proxy(request)

    expect(response).toBe(nextResponse)
    expect(response.headers.get('x-test-response')).toBe('ok')
  })
})
