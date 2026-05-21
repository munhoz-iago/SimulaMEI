import { describe, expect, it } from 'vitest'
import { simular } from '../index'
import { calcularPresumido } from '../presumido'
import { calcularReal } from '../real'

describe('Motor Fiscal - Cenários Completos', () => {
  it('inclui ICMS e IPI no Lucro Presumido para indústria', () => {
    // CNAE de indústria (ex: 1011-2/01 - Frigorífico, embora não comum para ex-MEI, serve para teste)
    // Vamos usar a categoria 'industria' diretamente via calcularPresumido para precisão
    const receita = 500_000
    const resultado = calcularPresumido(receita, 'industria', 0)

    // ICMS esperado (5%): 25.000
    // IPI esperado (2%): 10.000
    // ISS esperado: 0
    expect(resultado.iss).toBe(0)
    
    // O 'total' no ResultadoPresumido inclui todos os tributos.
    // Vamos verificar se o total é coerente com a inclusão de ICMS e IPI.
    // IRPJ (8% presunção * 15% alíquota): 500k * 0.08 * 0.15 = 6.000
    // CSLL (8% presunção * 9% alíquota): 500k * 0.08 * 0.09 = 3.600
    // PIS (0.65%): 500k * 0.0065 = 3.250
    // COFINS (3%): 500k * 0.03 = 15.000
    // Total Federal: 27.850
    // Total Geral: 27.850 + 25.000 (ICMS) + 10.000 (IPI) = 62.850
    expect(resultado.total).toBeCloseTo(62_850)
  })

  it('inclui ICMS no Lucro Real para comércio', () => {
    const receita = 500_000
    const margem = 0.20 // 20%
    const resultado = calcularReal(receita, margem, 'comercio', 0)

    // Lucro estimado: 100.000
    // IRPJ: 100k * 0.15 = 15.000 (abaixo do adicional)
    // CSLL: 100k * 0.09 = 9.000
    // PIS (1.65% * 0.6): 500k * 0.0099 = 4.950
    // COFINS (7.6% * 0.6): 500k * 0.0456 = 22.800
    // ICMS (5%): 25.000
    // Total esperado: 15.000 + 9.000 + 4.950 + 22.800 + 25.000 = 76.750
    expect(resultado.total).toBeCloseTo(76_750)
  })

  it('oferece Simples Ótimo apenas quando CNAE é elegível e anexo atual é V', () => {
    // Cenário 1: TI (elegível ao Fator R), anexo V (Fator R < 28%)
    const resultadoV = simular({
      faturamentoAcumulado: 60_000,
      mesAtual: 6, // Projeção 120k
      cnae: '6201-5/01', // TI, elegível, anexo V padrão
      folhaMensal: 1_000, // Fator R = (1000 * 12) / 120000 = 10%
      tipoMei: 'geral',
    })

    expect(resultadoV.anexoAtual).toBe('V')
    expect(resultadoV.comparativo.simplesAnexoOtimo).toBeDefined()
    expect(resultadoV.comparativo.simplesAnexoOtimo?.anexo).toBe('III')

    // Cenário 2: TI (elegível), anexo III (Fator R >= 28%)
    const resultadoIII = simular({
      faturamentoAcumulado: 60_000,
      mesAtual: 6,
      cnae: '6201-5/01',
      folhaMensal: 3_000, // Fator R = (3000 * 12) / 120000 = 30%
      tipoMei: 'geral',
    })

    expect(resultadoIII.anexoAtual).toBe('III')
    expect(resultadoIII.comparativo.simplesAnexoOtimo).toBeUndefined()

    // Cenário 3: Cabeleireiro (Não elegível ao Fator R, anexo III fixo)
    const resultadoFixo = simular({
      faturamentoAcumulado: 60_000,
      mesAtual: 6,
      cnae: '9602-5/01', // Cabeleireiro, não elegível, anexo III
      folhaMensal: 1_000,
      tipoMei: 'geral',
    })

    expect(resultadoFixo.anexoAtual).toBe('III')
    expect(resultadoFixo.comparativo.simplesAnexoOtimo).toBeUndefined()
  })

  it('calcula economia do Fator R corretamente na memória de cálculo', () => {
    const rbt12 = 200_000
    // Vamos usar a função de simulação para garantir o fluxo completo
    const resultado = simular({
      faturamentoAcumulado: 100_000,
      mesAtual: 6,
      cnae: '6201-5/01',
      folhaMensal: 5_000, // Fator R alto
      tipoMei: 'geral',
    })

    const fr = resultado.fatorR
    expect(fr).not.toBeNull()
    if (fr) {
      expect(fr.memoriaCalculo.economiaAnual).toBeGreaterThan(0)
      expect(fr.economiaAnual).toBe(fr.memoriaCalculo.economiaAnual)
    }
  })
})
