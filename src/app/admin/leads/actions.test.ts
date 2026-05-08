import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock, createAdminClientMock, revalidatePathMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

import { updateLeadStatus } from './actions'

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
            data: role ? { id: 'user-1', role, onboarding_completed_at: '2026-01-01T00:00:00.000Z' } : null,
            error: null,
          }),
        })),
      })),
    })),
  }
}

describe('updateLeadStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = ''
    process.env.ADMIN_EMAIL = ''
  })

  it('throws before touching the service role client for non-admin users', async () => {
    createClientMock.mockResolvedValue(makeServerClient('contador'))

    await expect(updateLeadStatus('lead-1', 'qualificado')).rejects.toThrow('Unauthorized')

    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('updates the lead status after verifying an admin session', async () => {
    createClientMock.mockResolvedValue(makeServerClient('admin'))
    const updateQuery = {
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    const updateMock = vi.fn(() => updateQuery)
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({
        update: updateMock,
      })),
    })

    await expect(updateLeadStatus('lead-1', 'qualificado')).resolves.toEqual({})

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'qualificado' }))
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'lead-1')
    expect(revalidatePathMock).toHaveBeenCalledWith('/admin/leads')
  })
})
