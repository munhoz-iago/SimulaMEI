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

import { listOfficeClients } from './server'

describe('accountant server read paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista clientes com server client RLS-enforced, sem service role', async () => {
    const query = {
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn().mockResolvedValue({
        data: [{
          id: 'client-1',
          name: 'Cliente A',
          email: null,
          cnae: '6201-5/01',
          tipo_mei: 'geral',
          uf: null,
          municipio: null,
          observacoes: null,
          ativo: true,
          inactive_reason: null,
          disabled_by_plan_limit_at: null,
          created_at: '2026-05-25T10:00:00.000Z',
          updated_at: '2026-05-25T10:00:00.000Z',
        }],
        count: 1,
        error: null,
      }),
    }
    const table = {
      select: vi.fn(() => query),
    }
    const supabase = {
      from: vi.fn(() => table),
    }
    createClientMock.mockResolvedValue(supabase)
    createAdminClientMock.mockImplementation(() => {
      throw new Error('service role should not be used')
    })

    const result = await listOfficeClients('office-1')

    expect(result.total).toBe(1)
    expect(result.clients[0].id).toBe('client-1')
    expect(supabase.from).toHaveBeenCalledWith('office_clients')
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })
})
