import { describe, expect, it } from 'vitest'
import { actionLabel, mesEstouroLabel } from './DashboardTopCards'

describe('actionLabel', () => {
  it('rotula consultar_contador', () => {
    expect(actionLabel({ tipo: 'consultar_contador', motivo: '' })).toBe('Consultar contador')
  })

  it('rotula lancar_mes com mês pt-BR', () => {
    expect(actionLabel({ tipo: 'lancar_mes', mes: 5 })).toBe('Lançar mai')
    expect(actionLabel({ tipo: 'lancar_mes', mes: 12 })).toBe('Lançar dez')
  })

  it('rotula planejar_migracao_me', () => {
    expect(actionLabel({ tipo: 'planejar_migracao_me', mesEstouro: 8 })).toBe('Planejar migração ME')
  })

  it('rotula ajustar_pro_labore com valor formatado', () => {
    const label = actionLabel({ tipo: 'ajustar_pro_labore', folhaSugerida: 1500 })
    expect(label).toContain('Ajustar pró-labore')
    expect(label).toContain('/mês')
    expect(label).toMatch(/R\$\s?1\.500|1\.500/)
  })

  it('rotula sem_acao_urgente', () => {
    expect(actionLabel({ tipo: 'sem_acao_urgente' })).toBe('Sem ação urgente')
  })
})

describe('mesEstouroLabel', () => {
  it('null → "dentro do teto"', () => {
    expect(mesEstouroLabel(null)).toBe('dentro do teto')
  })

  it('mês válido → abreviação pt-BR', () => {
    expect(mesEstouroLabel(1)).toBe('jan')
    expect(mesEstouroLabel(11)).toBe('nov')
  })
})
