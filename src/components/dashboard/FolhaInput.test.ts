import { describe, expect, it } from 'vitest'
import { parseBRL } from './FolhaInput'

describe('parseBRL', () => {
  it('parseia número simples', () => {
    expect(parseBRL('1234')).toBe(1234)
    expect(parseBRL('0')).toBe(0)
  })

  it('parseia formato pt-BR com separador de milhar', () => {
    expect(parseBRL('1.234')).toBe(1234)
    expect(parseBRL('1.234.567')).toBe(1234567)
  })

  it('parseia decimal com vírgula', () => {
    expect(parseBRL('5,50')).toBe(5.5)
    expect(parseBRL('1.234,56')).toBe(1234.56)
  })

  it('retorna NaN para entrada inválida', () => {
    expect(parseBRL('abc')).toBeNaN()
    expect(parseBRL('1.2.3,abc')).toBeNaN()
    expect(parseBRL('')).toBeNaN()
    expect(parseBRL('   ')).toBeNaN()
  })

  it('retorna número negativo para valores negativos (caller rejeita)', () => {
    expect(parseBRL('-100')).toBe(-100)
  })

  it('ignora espaços ao redor', () => {
    expect(parseBRL('  1234  ')).toBe(1234)
  })
})
