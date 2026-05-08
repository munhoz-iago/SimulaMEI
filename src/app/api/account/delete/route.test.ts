import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

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

import { POST } from './route'

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/account/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeRawRequest(body: string) {
  return new NextRequest('http://localhost/api/account/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
}

function makeServerClient(user: { id: string; email?: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeAdminClient(
  deleteResults: Array<{ error: { message: string } | null }> = [],
  authDeleteResult: { error: { message: string } | null } = { error: null },
) {
  let deleteCallIndex = 0
  const deleteEqMock = vi.fn().mockImplementation(() => {
    const result = deleteResults[deleteCallIndex] ?? { error: null }
    deleteCallIndex += 1
    return Promise.resolve(result)
  })
  const deleteMock = vi.fn(() => ({ eq: deleteEqMock }))
  const fromMock = vi.fn(() => ({ delete: deleteMock }))
  const deleteUserMock = vi.fn().mockResolvedValue(authDeleteResult)

  return {
    client: {
      from: fromMock,
      auth: { admin: { deleteUser: deleteUserMock } },
    },
    fromMock,
    deleteEqMock,
    deleteUserMock,
  }
}

describe('/api/account/delete POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires authentication', async () => {
    createClientMock.mockResolvedValue(makeServerClient(null))

    const response = await POST(makeRequest({ confirmation: 'EXCLUIR' }))

    expect(response.status).toBe(401)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('requires the exact deletion confirmation', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1' }))

    const response = await POST(makeRequest({ confirmation: 'apagar' }))

    expect(response.status).toBe(400)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON as an invalid confirmation', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1' }))

    const response = await POST(makeRawRequest('{'))

    expect(response.status).toBe(400)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('deletes owned data and then removes the auth user', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1', email: 'User@Example.com ' }))
    const admin = makeAdminClient()
    createAdminClientMock.mockReturnValue(admin.client)

    const response = await POST(makeRequest({ confirmation: 'EXCLUIR' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(admin.fromMock).toHaveBeenCalledWith('api_keys')
    expect(admin.fromMock).toHaveBeenCalledWith('simulations')
    expect(admin.fromMock).toHaveBeenCalledWith('leads')
    expect(admin.fromMock).toHaveBeenCalledWith('user_profiles')
    expect(admin.deleteEqMock).toHaveBeenCalledWith('email', 'user@example.com')
    expect(admin.deleteUserMock).toHaveBeenCalledWith('user-1')
  })

  it('does not run the email cleanup when the auth user has no email', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1' }))
    const admin = makeAdminClient()
    createAdminClientMock.mockReturnValue(admin.client)

    const response = await POST(makeRequest({ confirmation: 'EXCLUIR' }))

    expect(response.status).toBe(200)
    expect(admin.deleteEqMock).not.toHaveBeenCalledWith('email', expect.any(String))
  })

  it.each([
    ['api key cleanup', [{ error: { message: 'api keys failed' } }], 'Não foi possível limpar as chaves da conta.'],
    ['simulation cleanup', [{ error: null }, { error: { message: 'simulations failed' } }], 'Não foi possível remover as simulações da conta.'],
    ['lead cleanup by user', [{ error: null }, { error: null }, { error: { message: 'leads failed' } }], 'Não foi possível remover os leads vinculados à conta.'],
    ['lead cleanup by email', [{ error: null }, { error: null }, { error: null }, { error: { message: 'email leads failed' } }], 'Não foi possível remover os leads associados ao e-mail.'],
    ['profile cleanup', [{ error: null }, { error: null }, { error: null }, { error: null }, { error: { message: 'profile failed' } }], 'Não foi possível remover o perfil da conta.'],
  ])('returns 500 when %s fails', async (_caseName, deleteResults, message) => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1', email: 'user@example.com' }))
    const admin = makeAdminClient(deleteResults)
    createAdminClientMock.mockReturnValue(admin.client)

    const response = await POST(makeRequest({ confirmation: 'EXCLUIR' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: message })
    expect(admin.deleteUserMock).not.toHaveBeenCalled()
  })

  it('returns 500 when auth user deletion fails', async () => {
    createClientMock.mockResolvedValue(makeServerClient({ id: 'user-1', email: 'user@example.com' }))
    const admin = makeAdminClient([], { error: { message: 'auth failed' } })
    createAdminClientMock.mockReturnValue(admin.client)

    const response = await POST(makeRequest({ confirmation: 'EXCLUIR' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Não foi possível concluir a exclusão da conta.' })
  })

  it('returns 500 on unexpected failures', async () => {
    createClientMock.mockRejectedValue(new Error('session unavailable'))

    const response = await POST(makeRequest({ confirmation: 'EXCLUIR' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Erro interno ao excluir a conta.' })
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })
})
