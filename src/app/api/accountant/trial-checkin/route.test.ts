import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createClientMock, getCurrentAccountantOfficeMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getCurrentAccountantOfficeMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/accountant/server', () => ({
  getCurrentAccountantOffice: getCurrentAccountantOfficeMock,
}))

import { POST } from './route'

const OFFICE = {
  id: 'office-1',
  name: 'Prime Contabilidade',
  plan: 'starter_trial',
  max_clients: 30,
  trial_ends_at: '2026-05-30T12:00:00.000Z',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_subscription_status: null,
  current_period_end: null,
  role: 'owner',
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/accountant/trial-checkin', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * Mock do server SSR client (Supabase). Após o fix RLS, o mesmo client trata
 * auth.getUser() E o upsert em accountant_trial_checkins — sem createAdminClient.
 *
 * - `user: null` simula usuário não autenticado.
 * - `withTableError` força supabase.from().upsert() retornar erro.
 */
function makeServerClient({
  user = { id: 'user-1', email: 'ana@example.com' } as { id: string; email?: string } | null,
  withTableError = false,
} = {}) {
  const singleMock = vi.fn().mockResolvedValue(
    withTableError
      ? { data: null, error: { message: 'RLS denied insert' } }
      : {
          data: {
            id: 'checkin-1',
            office_id: 'office-1',
            user_id: 'user-1',
            shown_on: '2026-05-25',
          },
          error: null,
        },
  )
  const selectMock = vi.fn(() => ({ single: singleMock }))
  const upsertMock = vi.fn(() => ({ select: selectMock }))
  const fromMock = vi.fn((table: string) => {
    if (table !== 'accountant_trial_checkins') {
      throw new Error(`Unexpected table: ${table}`)
    }
    return { upsert: upsertMock }
  })

  return {
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
      from: fromMock,
    },
    upsertMock,
    selectMock,
    singleMock,
    fromMock,
  }
}

describe('/api/accountant/trial-checkin POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-25T12:00:00.000Z'))
    getCurrentAccountantOfficeMock.mockResolvedValue({ office: OFFICE, error: null })
  })

  it('requires authentication', async () => {
    const server = makeServerClient({ user: null })
    createClientMock.mockResolvedValue(server.client)

    const response = await POST(makeRequest({ action: 'shown' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Autenticação obrigatória.' })
    expect(server.fromMock).not.toHaveBeenCalled()
  })

  it('records that today checkin was shown for the authenticated office member', async () => {
    const server = makeServerClient()
    createClientMock.mockResolvedValue(server.client)

    const response = await POST(makeRequest({ action: 'shown' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      checkin: {
        id: 'checkin-1',
        office_id: 'office-1',
        user_id: 'user-1',
        shown_on: '2026-05-25',
      },
    })
    expect(server.upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        office_id: 'office-1',
        user_id: 'user-1',
        shown_on: '2026-05-25',
        shown_at: '2026-05-25T12:00:00.000Z',
      }),
      { onConflict: 'office_id,user_id,shown_on' },
    )
  })

  it('records pain point answers without opening checkout', async () => {
    const server = makeServerClient()
    createClientMock.mockResolvedValue(server.client)

    const response = await POST(makeRequest({
      action: 'answer',
      satisfaction: 'pain',
      painPoint: 'fator_r',
      freeText: 'Preciso entender quando muda para Anexo V.',
    }))

    expect(response.status).toBe(200)
    expect(server.upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        office_id: 'office-1',
        user_id: 'user-1',
        shown_on: '2026-05-25',
        answered_at: '2026-05-25T12:00:00.000Z',
        satisfaction: 'pain',
        pain_point: 'fator_r',
        free_text: 'Preciso entender quando muda para Anexo V.',
      }),
      { onConflict: 'office_id,user_id,shown_on' },
    )
  })

  it('rejects invalid answer values', async () => {
    const server = makeServerClient()
    createClientMock.mockResolvedValue(server.client)

    const response = await POST(makeRequest({
      action: 'answer',
      satisfaction: 'great',
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Resposta do check-in inválida.' })
    expect(server.fromMock).not.toHaveBeenCalled()
  })

  it('returns 500 when RLS denies the upsert (insufficient office membership)', async () => {
    const server = makeServerClient({ withTableError: true })
    createClientMock.mockResolvedValue(server.client)

    const response = await POST(makeRequest({ action: 'shown' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Não foi possível salvar o check-in.' })
    expect(server.upsertMock).toHaveBeenCalled()
  })
})
