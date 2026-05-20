import { describe, expect, it } from 'vitest'
import { labelAnexoPorRegime } from './labels'

describe('labelAnexoPorRegime', () => {
  it('MEI: descreve como projeção, não "atual"', () => {
    expect(labelAnexoPorRegime('mei', 'III')).toBe('Anexo III (se migrar para ME)')
    expect(labelAnexoPorRegime('mei', 'V')).toBe('Anexo V (se migrar para ME)')
  })

  it('Simples: descreve como atual', () => {
    expect(labelAnexoPorRegime('simples', 'III')).toBe('Anexo III (atual)')
    expect(labelAnexoPorRegime('simples', 'V')).toBe('Anexo V (atual)')
  })

  it('regime indefinido: usa rótulo neutro', () => {
    expect(labelAnexoPorRegime(undefined, 'III')).toBe('Anexo III')
    expect(labelAnexoPorRegime(null, 'V')).toBe('Anexo V')
  })
})
