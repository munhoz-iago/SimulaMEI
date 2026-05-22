import { describe, expect, it } from 'vitest'
import { parseNumberInput } from './OperationsCard'

describe('parseNumberInput', () => {
  describe('BR thousand separator (without decimal)', () => {
    it('parses "1.500" as 1500 (BR thousand)', () => {
      expect(parseNumberInput('1.500')).toBe(1500)
    })

    it('parses "1.500.000" as 1500000 (BR multi-thousand)', () => {
      expect(parseNumberInput('1.500.000')).toBe(1500000)
    })
  })

  describe('BR decimal with comma', () => {
    it('parses "1.500,50" as 1500.5 (BR thousand + decimal)', () => {
      expect(parseNumberInput('1.500,50')).toBe(1500.5)
    })

    it('parses "5000,75" as 5000.75 (no thousand, BR decimal)', () => {
      expect(parseNumberInput('5000,75')).toBe(5000.75)
    })
  })

  describe('plain integers', () => {
    it('parses "5000" as 5000', () => {
      expect(parseNumberInput('5000')).toBe(5000)
    })
  })

  describe('US decimal (ambiguous, treated as decimal)', () => {
    it('parses "1.5" as 1.5 (decimal, rare in BRL but valid)', () => {
      expect(parseNumberInput('1.5')).toBe(1.5)
    })
  })

  describe('negative numbers', () => {
    it('parses "-100" as -100', () => {
      expect(parseNumberInput('-100')).toBe(-100)
    })

    it('parses "-1.000,50" as -1000.5', () => {
      expect(parseNumberInput('-1.000,50')).toBe(-1000.5)
    })
  })

  describe('invalid inputs return null', () => {
    it('rejects "abc"', () => {
      expect(parseNumberInput('abc')).toBeNull()
    })

    it('rejects empty string', () => {
      expect(parseNumberInput('')).toBeNull()
    })

    it('rejects whitespace-only string', () => {
      expect(parseNumberInput('  ')).toBeNull()
    })

    it('rejects undefined', () => {
      expect(parseNumberInput(undefined)).toBeNull()
    })
  })
})
