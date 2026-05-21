// real.ts - Estimativa simplificada do Lucro Real
// TAX_RULE_VERSION: 'BR-MEI-SN-2026-04-28'
// ESTIMATIVA APENAS - Lucro Real real requer contabilidade completa

import type { ResultadoReal, CnaeCategoriaFiscal } from '@/types/tributario'
import {
  SALARIO_MINIMO_2026,
  INSS_PRO_LABORE_RATE,
  INSS_PATRONAL_RATE,
  ESTIMATIVA_ICMS_EFETIVO,
  ESTIMATIVA_IPI_EFETIVO,
} from '@/constants/tributario'

// Aliquotas Lucro Real (PIS/COFINS regime nao-cumulativo)
const ALIQ_IRPJ           = 0.15
const ALIQ_IRPJ_ADICIONAL = 0.10   // sobre lucro que exceder R$ 60k/trimestre
const ALIQ_CSLL           = 0.09
const ALIQ_PIS_NC         = 0.0165 // nao-cumulativo
const ALIQ_COFINS_NC      = 0.076  // nao-cumulativo
const ALIQ_ISS_MEDIA      = 0.03   // ISS medio para servicos

export const MARGEM_REAL_DEFAULT = 0.30

/**
 * Estimativa do Lucro Real.
 *
 * PIS/COFINS regime nao-cumulativo com credito estimado em 40% do debito.
 * ISS incide apenas sobre servicos.
 * ICMS/IPI estimados para comercio e industria.
 * INSS socio + patronal compoem o `custoTotal`.
 *
 * @param receitaAnual  - Receita bruta anual projetada
 * @param margemLiquida - Margem liquida estimada (padrao: 30%)
 * @param categoria     - Categoria fiscal do CNAE (padrao: 'servicos')
 * @param folhaMensal   - Folha mensal declarada; minimo = salario minimo para INSS
 */
export function calcularReal(
  receitaAnual: number,
  margemLiquida = MARGEM_REAL_DEFAULT,
  categoria: CnaeCategoriaFiscal = 'servicos',
  folhaMensal = 0,
): ResultadoReal {
  const lucroEstimado = receitaAnual * margemLiquida

  // IRPJ
  let irpj = lucroEstimado * ALIQ_IRPJ
  const lucroTrimestral = lucroEstimado / 4
  if (lucroTrimestral > 60_000) {
    irpj += (lucroTrimestral - 60_000) * 4 * ALIQ_IRPJ_ADICIONAL
  }

  const csll = lucroEstimado * ALIQ_CSLL

  // PIS/COFINS nao-cumulativo: debito - credito estimado (40% do debito)
  const pis    = receitaAnual * ALIQ_PIS_NC    * 0.60
  const cofins = receitaAnual * ALIQ_COFINS_NC * 0.60

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
    margemLiquida,
    lucroEstimado,
    categoria,
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
