import { describe, expect, it } from 'vitest'
import { DELETE_CONFIRMATION, isDeleteInputValid } from './delete-account-validation'

describe('isDeleteInputValid', () => {
  it('aceita "EXCLUIR" exato', () => {
    expect(isDeleteInputValid('EXCLUIR')).toBe(true)
    expect(isDeleteInputValid(DELETE_CONFIRMATION)).toBe(true)
  })

  it('rejeita lowercase "excluir"', () => {
    expect(isDeleteInputValid('excluir')).toBe(false)
  })

  it('rejeita "EXCLUIR " com espaço no final (sem trim)', () => {
    expect(isDeleteInputValid('EXCLUIR ')).toBe(false)
    expect(isDeleteInputValid(' EXCLUIR')).toBe(false)
  })

  it('rejeita string vazia', () => {
    expect(isDeleteInputValid('')).toBe(false)
  })

  it('rejeita parcial "EXCL"', () => {
    expect(isDeleteInputValid('EXCL')).toBe(false)
    expect(isDeleteInputValid('EXCLU')).toBe(false)
    expect(isDeleteInputValid('EXCLUIRA')).toBe(false)
  })
})
