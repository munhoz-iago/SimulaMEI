import { describe, expect, it } from 'vitest'
import { sanitizeXlsxCell } from './xlsx-injection'

describe('sanitizeXlsxCell', () => {
  it('mantem strings seguras inalteradas', () => {
    expect(sanitizeXlsxCell('Prime Contabilidade')).toBe('Prime Contabilidade')
    expect(sanitizeXlsxCell('contato@example.com')).toBe('contato@example.com')
    expect(sanitizeXlsxCell('(11) 99999-9999')).toBe('(11) 99999-9999')
    expect(sanitizeXlsxCell('')).toBe('')
  })

  it('prefixa entradas interpretadas como formula por planilhas', () => {
    expect(sanitizeXlsxCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
    expect(sanitizeXlsxCell('+5511999999999')).toBe("'+5511999999999")
    expect(sanitizeXlsxCell('-FALSE')).toBe("'-FALSE")
    expect(sanitizeXlsxCell('@formula')).toBe("'@formula")
    expect(sanitizeXlsxCell('\tformula')).toBe("'\tformula")
    expect(sanitizeXlsxCell('\rformula')).toBe("'\rformula")
  })
})
