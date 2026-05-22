import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  createClientMock,
  getCnaeMock,
  normalizeCnaeCodeMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getCnaeMock: vi.fn(),
  normalizeCnaeCodeMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/tributario', () => ({
  getCnae: getCnaeMock,
  normalizeCnaeCode: normalizeCnaeCodeMock,
}))

import { PATCH } from './route'

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function makeSupabaseMock(options?: {
  user?: { id: string; email?: string } | null
  updateError?: { message: string } | null
}) {
  const resolvedUser = options && 'user' in options
    ? options.user
    : { id: 'user-1', email: 'ana@example.com' }

  const updateEqMock = vi.fn().mockResolvedValue({
    error: options?.updateError ?? null,
  })
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))
  const fromMock = vi.fn((table: string) => {
    if (table === 'user_profiles') {
      return { update: updateMock }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: resolvedUser } }),
      },
      from: fromMock,
    },
    updateMock,
    updateEqMock,
  }
}

describe('/api/profile PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    normalizeCnaeCodeMock.mockImplementation((value: string) => value)
    getCnaeMock.mockReturnValue({ cnae: '6204-0/00' })
  })

  it('requires an authenticated user', async () => {
    createClientMock.mockResolvedValue(makeSupabaseMock({ user: null }).client)

    const response = await PATCH(makeRequest({ nome: 'Ana' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Autenticação obrigatória.' })
  })

  it('updates a single field successfully', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest({ nome: '  Ana Silva  ' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(supabase.updateMock).toHaveBeenCalledWith({ nome: 'Ana Silva' })
    expect(supabase.updateEqMock).toHaveBeenCalledWith('id', 'user-1')
  })

  it('updates multiple fields in a single PATCH', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest({
      nome: 'Ana',
      telefone: '(11) 99999-9999',
      faturamentoMensalEstimado: 8500,
      mesAtual: 5,
    }))

    expect(response.status).toBe(200)
    expect(supabase.updateMock).toHaveBeenCalledWith({
      nome: 'Ana',
      telefone: '(11) 99999-9999',
      faturamento_mensal_estimado: 8500,
      mes_atual: 5,
    })
  })

  it('rejects empty payload with 400', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest({}))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Nenhum campo válido para atualizar.',
    })
    expect(supabase.updateMock).not.toHaveBeenCalled()
  })

  it('rejects unknown fields (strict schema) with 400', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest({ foo: 'bar' }))

    expect(response.status).toBe(400)
    const json = await response.json() as { error?: string }
    expect(json.error).toBe('Payload inválido.')
    expect(supabase.updateMock).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON with 400', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest('not-json'))

    expect(response.status).toBe(400)
    expect(supabase.updateMock).not.toHaveBeenCalled()
  })

  it('uppercases UF before saving', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest({ uf: 'sp' }))

    expect(response.status).toBe(200)
    expect(supabase.updateMock).toHaveBeenCalledWith({ uf: 'SP' })
  })

  it('rejects invalid UF length with 400', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest({ uf: 'SAP' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'UF deve ter 2 letras maiúsculas.',
    })
    expect(supabase.updateMock).not.toHaveBeenCalled()
  })

  it('rejects unknown CNAE codes with 400', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)
    normalizeCnaeCodeMock.mockReturnValueOnce('9999-9/99')
    getCnaeMock.mockReturnValueOnce(undefined)

    const response = await PATCH(makeRequest({ cnaePrincipal: '9999-9/99' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'CNAE não reconhecido. Informe um código oficial válido.',
    })
    expect(supabase.updateMock).not.toHaveBeenCalled()
  })

  it('rejects mesAtual out of range with 400 (zod)', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest({ mesAtual: 13 }))

    expect(response.status).toBe(400)
    const json = await response.json() as { error?: string }
    expect(json.error).toBe('Payload inválido.')
    expect(supabase.updateMock).not.toHaveBeenCalled()
  })

  it('rejects negative numeric values with 400 (zod nonnegative)', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest({ faturamentoMensalEstimado: -100 }))

    expect(response.status).toBe(400)
    expect(supabase.updateMock).not.toHaveBeenCalled()
  })

  it('rejects empty string for nome (normalizeBoundedText fails)', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest({ nome: '   ' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Nome inválido.' })
    expect(supabase.updateMock).not.toHaveBeenCalled()
  })

  it('returns 500 when Supabase update fails', async () => {
    const supabase = makeSupabaseMock({ updateError: { message: 'db down' } })
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest({ nome: 'Ana' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Não foi possível salvar agora.',
    })
  })

  it('persists tipoMei correctly when changed', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const response = await PATCH(makeRequest({ tipoMei: 'caminhoneiro' }))

    expect(response.status).toBe(200)
    expect(supabase.updateMock).toHaveBeenCalledWith({ tipo_mei: 'caminhoneiro' })
  })

  it('rejects nome that exceeds ONBOARDING_TEXT_LIMITS.nome', async () => {
    const supabase = makeSupabaseMock()
    createClientMock.mockResolvedValue(supabase.client)

    const tooLong = 'A'.repeat(200)
    const response = await PATCH(makeRequest({ nome: tooLong }))

    expect(response.status).toBe(400)
    expect(supabase.updateMock).not.toHaveBeenCalled()
  })

  describe('optional field clearing (nome_negocio, telefone)', () => {
    it('persists empty string for nomeNegocio (clears optional field)', async () => {
      const supabase = makeSupabaseMock()
      createClientMock.mockResolvedValue(supabase.client)

      const response = await PATCH(makeRequest({ nomeNegocio: '' }))

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ ok: true })
      expect(supabase.updateMock).toHaveBeenCalledWith({ nome_negocio: '' })
    })

    it('persists empty string for telefone (clears optional field)', async () => {
      const supabase = makeSupabaseMock()
      createClientMock.mockResolvedValue(supabase.client)

      const response = await PATCH(makeRequest({ telefone: '' }))

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ ok: true })
      expect(supabase.updateMock).toHaveBeenCalledWith({ telefone: '' })
    })

    it('rejects empty string for nome (domain-required, cannot clear)', async () => {
      const supabase = makeSupabaseMock()
      createClientMock.mockResolvedValue(supabase.client)

      const response = await PATCH(makeRequest({ nome: '' }))

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: 'Nome inválido.' })
      expect(supabase.updateMock).not.toHaveBeenCalled()
    })

    it('rejects empty string for municipio (domain-required, cannot clear)', async () => {
      const supabase = makeSupabaseMock()
      createClientMock.mockResolvedValue(supabase.client)

      const response = await PATCH(makeRequest({ municipio: '' }))

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: 'Município inválido.' })
      expect(supabase.updateMock).not.toHaveBeenCalled()
    })

    it('rejects nomeNegocio exceeding length limit with specific message', async () => {
      const supabase = makeSupabaseMock()
      createClientMock.mockResolvedValue(supabase.client)

      const response = await PATCH(makeRequest({ nomeNegocio: 'a'.repeat(200) }))

      expect(response.status).toBe(400)
      const body = await response.json() as { error?: string }
      expect(body.error).toMatch(/excedeu/i)
      expect(supabase.updateMock).not.toHaveBeenCalled()
    })
  })
})
