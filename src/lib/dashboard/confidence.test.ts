import { describe, expect, it } from 'vitest'
import { confidenceLevel } from './confidence'

describe('confidenceLevel', () => {
  it('limitada para < 6 meses', () => {
    expect(confidenceLevel(0).level).toBe('limitada')
    expect(confidenceLevel(5).level).toBe('limitada')
  })
  it('razoavel para 6-9', () => {
    expect(confidenceLevel(6).level).toBe('razoavel')
    expect(confidenceLevel(9).level).toBe('razoavel')
  })
  it('forte para >= 10', () => {
    expect(confidenceLevel(10).level).toBe('forte')
    expect(confidenceLevel(12).level).toBe('forte')
  })
  it('label pt-BR coerente', () => {
    expect(confidenceLevel(3).label).toMatch(/base limitada/i)
    expect(confidenceLevel(12).label).toMatch(/histórico consistente|projeção confi/i)
  })
})
