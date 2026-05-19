import { describe, expect, it } from 'vitest'
import { buildRegimePreview } from './RegimePreviewLocked'
import type { ComparativoRegimes } from '@/types/tributario'

const base = {
  simplesAnexoAtual: { dasAnual: 8000, anexo: 'V' },
  presumido: { custoTotal: 12000 },
  real: { custoTotal: 16000 },
  melhorRegime: 'simplesAtual',
} as unknown as ComparativoRegimes

describe('buildRegimePreview', () => {
  it('normalizes each cost to % of the most expensive and flags the cheapest', () => {
    const r = buildRegimePreview(base)

    expect(r.map(x => x.label)).toEqual(['Simples', 'Presumido', 'Real'])
    expect(r.find(x => x.label === 'Real')!.pct).toBe(100)
    expect(r.find(x => x.label === 'Simples')!.pct).toBe(50)
    expect(r.find(x => x.melhor)!.label).toBe('Simples')
  })

  it('expõe o custo R$ de cada regime (relatório PDF pago mostra valores, não só barras)', () => {
    const r = buildRegimePreview(base)

    expect(r.find(x => x.label === 'Simples')!.custo).toBe(8000)
    expect(r.find(x => x.label === 'Presumido')!.custo).toBe(12000)
    expect(r.find(x => x.label === 'Real')!.custo).toBe(16000)
  })

  it('includes Simples ótimo (other anexo) when present and can be the best', () => {
    const r = buildRegimePreview({
      ...base,
      simplesAnexoOtimo: { dasAnual: 6000, anexo: 'III' },
      melhorRegime: 'simplesOtimo',
    } as unknown as ComparativoRegimes)

    expect(r.some(x => x.label === 'Simples (Anexo III)')).toBe(true)
    expect(r.find(x => x.melhor)!.label).toBe('Simples (Anexo III)')
  })
})
