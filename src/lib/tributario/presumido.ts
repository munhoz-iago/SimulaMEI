// presumido.ts - Estimativa do Lucro Presumido com presuncao por categoria de atividade
// TAX_RULE_VERSION: 'BR-MEI-SN-2026-04-28'
// ESTIMATIVA APENAS - LP real requer contabilidade completa

import type { ResultadoPresumido, CnaeCategoriaFiscal } from '@/types/tributario'
import {
  SALARIO_MINIMO_2026,
  INSS_PRO_LABORE_RATE,
  INSS_PATRONAL_RATE,
  ESTIMATIVA_ICMS_EFETIVO,
  ESTIMATIVA_IPI_EFETIVO,
} from '@/constants/tributario'

// Percentuais de presuncao do lucro por categoria (RIR/1999 + atualizacoes)
// Comercio/industria/construcao: 8% | Servicos gerais: 32%
const PRESUNCAO_POR_CATEGORIA: Record<CnaeCategoriaFiscal, number> = {
  comercio:       0.08,
  industria:      0.08,
  construcao:     0.08,
  servicos:       0.32,
  ti_consultoria: 0.32,
}

// Aliquotas vigentes (Lucro Presumido - PIS/COFINS regime cumulativo)
const ALIQ_IRPJ            = 0.15
const ALIQ_IRPJ_ADICIONAL  = 0.10   // sobre lucro presumido trimestral > R$ 60k
const ALIQ_CSLL            = 0.09
const ALIQ_PIS             = 0.0065 // regime cumulativo
const ALIQ_COFINS          = 0.03   // regime cumulativo
const ALIQ_ISS_MEDIA       = 0.03   // ISS medio (varia por municipio: 2-5%)

/**
 * Calcula estimativa do Lucro Presumido com presuncao correta por categoria.
 *
 * Inclui INSS do socio (pro-labore 11%) e INSS patronal (20%) no `custoTotal`,
 * pois esses encargos nao fazem parte do DAS mas sao obrigatorios no regime.
 *
 * ISS incide apenas sobre prestacao de servicos.
 * ICMS/IPI estimados para comercio e industria.
 *
 * @param receitaAnual  - Receita bruta anual projetada
 * @param categoria     - Categoria fiscal do CNAE (padrao: 'servicos')
 * @param folhaMensal   - Folha mensal declarada; minimo = salario minimo para INSS
 */
export function calcularPresumido(
  receitaAnual: number,
  categoria: CnaeCategoriaFiscal = 'servicos',
  folhaMensal = 0,
): ResultadoPresumido {
  const presuncaoUtilizada = PRESUNCAO_POR_CATEGORIA[categoria]
  const lucroPresumido = receitaAnual * presuncaoUtilizada

  // IRPJ base
  let irpj = lucroPresumido * ALIQ_IRPJ

  // Adicional IRPJ: 10% sobre the lucro presumido trimestral que excede R$ 60k
  const lucroTrimestral = lucroPresumido / 4
  if (lucroTrimestral > 60_000) {
    irpj += (lucroTrimestral - 60_000) * 4 * ALIQ_IRPJ_ADICIONAL
  }

  const csll   = lucroPresumido * ALIQ_CSLL
  const pis    = receitaAnual * ALIQ_PIS
  const cofins = receitaAnual * ALIQ_COFINS

  // Tributos Estaduais/Municipais
  const isServico = categoria === 'servicos' || categoria === 'ti_consultoria'
  const iss = isServico ? receitaAnual * ALIQ_ISS_MEDIA : 0
  const icms = (categoria === 'comercio' || categoria === 'industria') ? receitaAnual * ESTIMATIVA_ICMS_EFETIVO : 0
  const ipi = (categoria === 'industria') ? receitaAnual * ESTIMATIVA_IPI_EFETIVO : 0

  const total = irpj + csll + pis + cofins + iss + icms + ipi
  const aliquotaEfetiva = receitaAnual > 0 ? total / receitaAnual : 0

  // INSS socio: base = max(folhaMensal, salario minimo), multiplicado por 12 meses
  const proLaboreBase  = Math.max(folhaMensal, SALARIO_MINIMO_2026)
  const inssProLabore  = proLaboreBase * INSS_PRO_LABORE_RATE * 12
  const inssPatronal   = proLaboreBase * INSS_PATRONAL_RATE * 12

  const custoTotal = total + inssProLabore + inssPatronal
  const aliquotaEfetivaCustoTotal = receitaAnual > 0 ? custoTotal / receitaAnual : 0

  return {
    receitaAnual,
    categoria,
    presuncaoUtilizada,
    irpj,
    csll,
    pis,
    cofins,
    iss,
    total,
    aliquotaEfetiva,
    inssProLabore,
    inssPatronal,
    custoTotal,
    aliquotaEfetivaCustoTotal,
  }
}

/**
 * Alias de compatibilidade - usa categoria 'servicos' (presuncao 32%).
 * @deprecated Prefira `calcularPresumido(receita, categoria, folha)`.
 */
export function calcularPresumidoServicos(receitaAnual: number): ResultadoPresumido {
  return calcularPresumido(receitaAnual, 'servicos', 0)
}
