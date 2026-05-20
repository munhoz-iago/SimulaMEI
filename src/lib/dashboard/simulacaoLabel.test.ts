import { describe, expect, it } from 'vitest'
import { simulacaoLabel } from './simulacaoLabel'

describe('simulacaoLabel', () => {
  it('formata como mês/ano · CNAE/descrição · cenário', () => {
    const label = simulacaoLabel({
      geradoEm: '2026-05-12T10:00:00Z',
      cnae: '9602-5/01',
      cenario: 'excesso_grave',
      cnaeDescricao: 'Cabeleireiros',
    })
    expect(label).toBe('mai/2026 · Cabeleireiros · excesso grave')
  })

  it('cai no CNAE quando não há descrição', () => {
    const label = simulacaoLabel({
      geradoEm: '2026-01-03T12:00:00Z',
      cnae: '6201-5/01',
      cenario: 'dentro_limite',
    })
    expect(label).toBe('jan/2026 · 6201-5/01 · dentro do teto')
  })

  it('trunca descrição longa', () => {
    const label = simulacaoLabel({
      geradoEm: '2026-03-15T10:00:00Z',
      cnae: '4711-3/02',
      cenario: 'excesso_leve',
      cnaeDescricao: 'Atividade super longa de descrição que estoura o espaço da linha',
    })
    expect(label.length).toBeLessThan(80)
    expect(label.startsWith('mar/2026')).toBe(true)
    expect(label).toContain('excesso leve')
  })

  it('cenário desconhecido cai no slug original', () => {
    const label = simulacaoLabel({
      geradoEm: '2026-07-01T00:00:00Z',
      cnae: '0000-0/00',
      cenario: 'cenario_novo' as 'dentro_limite',
    })
    expect(label).toContain('cenario_novo')
  })
})
