import { describe, expect, it } from 'vitest'
import { diagnoseMonitorEmptyReason } from './monitor-empty-state'

describe('diagnoseMonitorEmptyReason', () => {
  it('profile null retorna cnae-missing', () => {
    expect(diagnoseMonitorEmptyReason(null, 0)).toBe('cnae-missing')
    expect(diagnoseMonitorEmptyReason(undefined, 5)).toBe('cnae-missing')
  })

  it('profile com cnae mas sem tipo retorna tipo-missing', () => {
    expect(
      diagnoseMonitorEmptyReason({ cnae_principal: '6201500', tipo_mei: null }, 0),
    ).toBe('tipo-missing')
    expect(
      diagnoseMonitorEmptyReason({ cnae_principal: '6201500' }, 3),
    ).toBe('tipo-missing')
  })

  it('profile completo com rowsCount 0 retorna no-rows', () => {
    expect(
      diagnoseMonitorEmptyReason({ cnae_principal: '6201500', tipo_mei: 'geral' }, 0),
    ).toBe('no-rows')
  })

  it('profile completo com rowsCount > 0 retorna null', () => {
    expect(
      diagnoseMonitorEmptyReason({ cnae_principal: '6201500', tipo_mei: 'geral' }, 5),
    ).toBeNull()
    expect(
      diagnoseMonitorEmptyReason({ cnae_principal: '4930202', tipo_mei: 'caminhoneiro' }, 1),
    ).toBeNull()
  })

  it('cnae string vazia conta como missing (falsy)', () => {
    expect(
      diagnoseMonitorEmptyReason({ cnae_principal: '', tipo_mei: 'geral' }, 10),
    ).toBe('cnae-missing')
  })
})
