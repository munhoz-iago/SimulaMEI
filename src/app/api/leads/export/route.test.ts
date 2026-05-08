import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock, createAdminClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

import { GET } from './route'

function makeServerClient(role: 'user' | 'contador' | 'admin' | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: role ? { id: 'user-1', email: 'user@example.com' } : null },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: role ? { id: 'user-1', role } : null,
            error: null,
          }),
        })),
      })),
    })),
  }
}

function makeAdminClient() {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn().mockResolvedValue({
      data: [{
        nome_escritorio: 'Prime Contabilidade',
        email: 'contato@example.com',
        telefone: '11999999999',
        carteira_range: '21-50',
        ferramenta_atual: 'Planilha',
        status: 'novo',
        created_at: '2026-05-08T10:00:00.000Z',
      }],
      error: null,
    }),
  }

  return {
    client: { from: vi.fn(() => query) },
    query,
  }
}

describe('/api/leads/export GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAIL = ''
    process.env.ADMIN_EMAILS = ''
  })

  it('requires authentication', async () => {
    createClientMock.mockResolvedValue(makeServerClient(null))

    const response = await GET()

    expect(response.status).toBe(401)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('blocks users without lead access before creating the admin client', async () => {
    createClientMock.mockResolvedValue(makeServerClient('user'))

    const response = await GET()

    expect(response.status).toBe(403)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('exports at most the first 1000 leads for authorized roles', async () => {
    createClientMock.mockResolvedValue(makeServerClient('admin'))
    const admin = makeAdminClient()
    createAdminClientMock.mockReturnValue(admin.client)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(admin.query.range).toHaveBeenCalledWith(0, 999)
  })
})
