import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExcelJS from 'exceljs'
import { Buffer } from 'node:buffer'

const { createClientMock, consumeRateLimitMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/security/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security/rate-limit')>('@/lib/security/rate-limit')
  return {
    ...actual,
    consumeRateLimit: consumeRateLimitMock,
  }
})

import { GET } from './route'

function makeServerClient(user: { id: string; email: string } | null, leads = [{
  nome_escritorio: 'Prime Contabilidade',
  email: 'contato@example.com',
  telefone: '11999999999',
  carteira_range: '21-50',
  ferramenta_atual: 'Planilha',
  status: 'novo',
  created_at: '2026-05-08T10:00:00.000Z',
}]) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn().mockResolvedValue({
      data: leads,
      error: null,
    }),
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn(() => query),
    query,
  }
}

describe('/api/leads/export GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAIL = 'admin@simulamei.com.br'
    process.env.ADMIN_EMAILS = ''
    consumeRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: '2026-05-08T11:00:00.000Z',
      hitCount: 1,
    })
  })

  it('requires authentication', async () => {
    createClientMock.mockResolvedValue(makeServerClient(null))

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('blocks non-admin users, including contador role emails', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'contador-1', email: 'contador@example.com' }))

    const response = await GET()

    expect(response.status).toBe(403)
    expect(consumeRateLimitMock).not.toHaveBeenCalled()
  })

  it('exports at most the first 1000 leads for admin email', async () => {
    const client = makeServerClient({ id: 'admin-1', email: 'admin@simulamei.com.br' })
    createClientMock.mockResolvedValue(client)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(client.query.range).toHaveBeenCalledWith(0, 999)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
  })

  it('sanitizes spreadsheet formula injection values', async () => {
    createClientMock.mockResolvedValue(makeServerClient(
      { id: 'admin-1', email: 'admin@simulamei.com.br' },
      [{
        nome_escritorio: '=cmd|calc',
        email: 'safe@example.com',
        telefone: '+5511999999999',
        carteira_range: '21-50',
        ferramenta_atual: '@formula',
        status: 'novo',
        created_at: '2026-05-08T10:00:00.000Z',
      }],
    ))

    const response = await GET()
    const workbook = new ExcelJS.Workbook()
    const workbookInput = Buffer.from(await response.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0]
    await workbook.xlsx.load(workbookInput)
    const row = workbook.getWorksheet('leads')!.getRow(2)

    expect(row.getCell(1).value).toBe("'=cmd|calc")
    expect(row.getCell(6).value).toBe("'+5511999999999")
    expect(row.getCell(8).value).toBe("'@formula")
  })

  it('rate limits admin exports', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'admin-1', email: 'admin@simulamei.com.br' }))
    consumeRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: '2026-05-08T11:00:00.000Z',
      hitCount: 11,
    })

    const response = await GET()

    expect(response.status).toBe(429)
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
  })
})
