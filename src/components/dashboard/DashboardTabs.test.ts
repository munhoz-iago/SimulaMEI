import { describe, expect, it } from 'vitest'
import { getDashboardTabHref, parseDashboardTab } from './DashboardTabs'

describe('parseDashboardTab', () => {
  it('default monitor quando vazio', () => {
    expect(parseDashboardTab(undefined)).toBe('monitor')
    expect(parseDashboardTab('')).toBe('monitor')
  })

  it('aceita tabs válidas', () => {
    expect(parseDashboardTab('monitor')).toBe('monitor')
    expect(parseDashboardTab('fator-r')).toBe('fator-r')
    expect(parseDashboardTab('simulacoes')).toBe('simulacoes')
    expect(parseDashboardTab('agenda')).toBe('agenda')
    expect(parseDashboardTab('conta')).toBe('conta')
  })

  it('cai no default quando inválido', () => {
    expect(parseDashboardTab('hackme')).toBe('monitor')
    expect(parseDashboardTab('admin')).toBe('monitor')
  })

  it('aceita primeiro valor de array (Next searchParams)', () => {
    expect(parseDashboardTab(['agenda', 'conta'])).toBe('agenda')
    expect(parseDashboardTab(['lixo'])).toBe('monitor')
  })

  it('gera href absoluto para forçar troca de aba no dashboard', () => {
    expect(getDashboardTabHref('fator-r')).toBe('/dashboard?aba=fator-r')
    expect(getDashboardTabHref('simulacoes')).toBe('/dashboard?aba=simulacoes')
  })
})
