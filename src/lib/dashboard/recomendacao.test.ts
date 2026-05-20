import { describe, expect, it } from 'vitest'
import { recomendarAcao, type RecomendacaoInput } from './recomendacao'

const baseInput: RecomendacaoInput = {
  cenario: 'dentro_limite',
  fatorR: undefined,
  mesEstourarTeto: null,
  elegivelFatorR: false,
  faltaLancamentoMesAtual: false,
  diaDoMes: 10,
  mesAtual: 5,
}

describe('recomendarAcao — regra ranqueada', () => {
  it('1) excesso_grave → consultar_contador', () => {
    const r = recomendarAcao({ ...baseInput, cenario: 'excesso_grave' })
    expect(r.tipo).toBe('consultar_contador')
  })

  it('2) falta lançamento e dia > 5 → lancar_mes', () => {
    const r = recomendarAcao({ ...baseInput, faltaLancamentoMesAtual: true, diaDoMes: 10 })
    expect(r.tipo).toBe('lancar_mes')
    if (r.tipo === 'lancar_mes') expect(r.mes).toBe(5)
  })

  it('2b) falta lançamento mas dia <= 5 → NÃO é lancar_mes', () => {
    const r = recomendarAcao({ ...baseInput, faltaLancamentoMesAtual: true, diaDoMes: 3 })
    expect(r.tipo).not.toBe('lancar_mes')
  })

  it('3) excesso_leve → planejar_migracao_me', () => {
    const r = recomendarAcao({ ...baseInput, cenario: 'excesso_leve', mesEstourarTeto: 11 })
    expect(r.tipo).toBe('planejar_migracao_me')
    if (r.tipo === 'planejar_migracao_me') expect(r.mesEstouro).toBe(11)
  })

  it('4) estouro previsto nos próximos 3 meses → planejar_migracao_me', () => {
    const r = recomendarAcao({ ...baseInput, mesAtual: 5, mesEstourarTeto: 7 })
    expect(r.tipo).toBe('planejar_migracao_me')
  })

  it('4b) estouro previsto além de 3 meses → não dispara migração ainda', () => {
    const r = recomendarAcao({ ...baseInput, mesAtual: 5, mesEstourarTeto: 11 })
    expect(r.tipo).toBe('sem_acao_urgente')
  })

  it('5) elegível FR sem atingir → ajustar_pro_labore', () => {
    const r = recomendarAcao({
      ...baseInput,
      elegivelFatorR: true,
      fatorR: { atingeMinimo: false, aumentoFolhaMensalNecessario: 1500 },
    })
    expect(r.tipo).toBe('ajustar_pro_labore')
    if (r.tipo === 'ajustar_pro_labore') expect(r.folhaSugerida).toBe(1500)
  })

  it('6) default → sem_acao_urgente', () => {
    const r = recomendarAcao(baseInput)
    expect(r.tipo).toBe('sem_acao_urgente')
  })

  it('precedência: excesso_grave vence falta de lançamento', () => {
    const r = recomendarAcao({
      ...baseInput,
      cenario: 'excesso_grave',
      faltaLancamentoMesAtual: true,
      diaDoMes: 25,
    })
    expect(r.tipo).toBe('consultar_contador')
  })
})
