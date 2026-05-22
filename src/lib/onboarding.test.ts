import { describe, expect, it } from 'vitest'
import { isOnboardingComplete, type UserProfileOnboarding } from './onboarding'

function buildCompleteProfile(overrides: Partial<UserProfileOnboarding> = {}): Partial<UserProfileOnboarding> {
  return {
    id: 'u1',
    email: 'test@example.com',
    nome: 'Fulano',
    nome_negocio: 'Minha empresa',
    telefone: '11999999999',
    cnae_principal: '6201-5/01',
    tipo_mei: 'geral',
    municipio: 'São Paulo',
    uf: 'SP',
    faturamento_mensal_estimado: 5000,
    faturamento_acumulado_atual: 30000,
    folha_mensal: 1500,
    mes_atual: 6,
    objetivo_principal: 'Crescer',
    atividades_realizadas: 'Programação',
    onboarding_completed_at: '2026-05-01T00:00:00Z',
    plano: 'free',
    ...overrides,
  }
}

describe('isOnboardingComplete', () => {
  it('returns true for fully-filled profile', () => {
    expect(isOnboardingComplete(buildCompleteProfile())).toBe(true)
  })

  it('returns false when null or undefined', () => {
    expect(isOnboardingComplete(null)).toBe(false)
    expect(isOnboardingComplete(undefined)).toBe(false)
  })

  it('returns false when onboarding_completed_at missing', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ onboarding_completed_at: null }))).toBe(false)
  })

  it('returns false when nome is null (required field)', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ nome: null }))).toBe(false)
  })

  it('returns false when nome is empty string (still required)', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ nome: '' }))).toBe(false)
  })

  // CORE: PR #6 permite limpar nome_negocio. Onboarding deve continuar válido.
  it('returns TRUE when nome_negocio is empty string (cleared by PR #6)', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ nome_negocio: '' }))).toBe(true)
  })

  it('returns false when nome_negocio is null (never filled)', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ nome_negocio: null }))).toBe(false)
  })

  // CORE: PR #6 permite limpar telefone também.
  it('returns TRUE when telefone is empty string (cleared by PR #6)', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ telefone: '' }))).toBe(true)
  })

  it('returns false when telefone is null (never filled)', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ telefone: null }))).toBe(false)
  })

  it('returns false when cnae_principal missing (core fiscal field, not clearable)', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ cnae_principal: null }))).toBe(false)
  })

  it('returns false when uf missing', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ uf: null }))).toBe(false)
  })

  it('returns false when faturamento_acumulado_atual is not a number', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ faturamento_acumulado_atual: null }))).toBe(false)
  })

  it('returns false when mes_atual is null', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ mes_atual: null }))).toBe(false)
  })

  it('returns true when nome_negocio AND telefone both cleared simultaneously', () => {
    expect(isOnboardingComplete(buildCompleteProfile({ nome_negocio: '', telefone: '' }))).toBe(true)
  })
})
