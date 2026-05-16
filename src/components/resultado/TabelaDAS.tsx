'use client'

import type { CnaeCategoriaFiscal, TipoMei } from '@/types/tributario'
import { calcularPresumido, calcularSimples, LIMITES_MEI, TAX_RULE_VERSION } from '@/lib/tributario'
import { MESES_COMPLETOS, fmt } from '@/lib/format'
import { TaxSourceNote } from './TaxSourceNote'
import { FONTES_FISCAIS } from '@/lib/tributario/oportunidades/fontes'

interface TabelaDASProps {
  projecao: number
  folhaMensal: number
  tipoMei: TipoMei
  categoria: CnaeCategoriaFiscal
}

const DAS_MEI_BASE_2026 = 81.05
const DAS_MEI_CAMINHONEIRO_BASE_2026 = 194.52

function calcularDasMeiMensal(tipoMei: TipoMei, categoria: CnaeCategoriaFiscal) {
  const base = tipoMei === 'caminhoneiro' ? DAS_MEI_CAMINHONEIRO_BASE_2026 : DAS_MEI_BASE_2026
  const iss = categoria === 'servicos' || categoria === 'ti_consultoria' || categoria === 'construcao' ? 5 : 0
  const icms = categoria === 'comercio' || categoria === 'industria' ? 1 : 0

  return base + iss + icms
}

export function TabelaDAS({ projecao, folhaMensal, tipoMei, categoria }: TabelaDASProps) {
  const receitaMediaMensal = projecao / 12
  const dasMeiMensal = calcularDasMeiMensal(tipoMei, categoria)
  const exibirLucroPresumido = projecao > LIMITES_MEI[tipoMei].anual

  const linhas = MESES_COMPLETOS.map((mes, index) => {
    const rbt12Projetado = receitaMediaMensal * (index + 1)
    const simplesIII = calcularSimples(rbt12Projetado, 'III').dasMensal
    const simplesV = calcularSimples(rbt12Projetado, 'V').dasMensal
    const lucroPresumido = calcularPresumido(rbt12Projetado, categoria, folhaMensal).custoTotal / 12

    return {
      mes,
      rbt12Projetado,
      mei: dasMeiMensal,
      simplesIII,
      simplesV,
      lucroPresumido,
    }
  })

  const total = linhas.reduce(
    (acc, linha) => ({
      mei: acc.mei + linha.mei,
      simplesIII: acc.simplesIII + linha.simplesIII,
      simplesV: acc.simplesV + linha.simplesV,
      lucroPresumido: acc.lucroPresumido + linha.lucroPresumido,
    }),
    { mei: 0, simplesIII: 0, simplesV: 0, lucroPresumido: 0 },
  )

  return (
    <div style={{
      background: 'var(--bg1)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '28px 32px',
      marginBottom: 28,
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>DAS estimado mês a mês</h3>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18 }}>
        Projeção em rampa mensal para visualizar quando cada regime começa a pesar no caixa.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: exibirLucroPresumido ? 760 : 640 }}>
          <thead>
            <tr>
              {['Mês', 'RBT12 projetado', 'DAS MEI', 'Simples III', 'Simples V', ...(exibirLucroPresumido ? ['Lucro Presumido'] : [])].map(head => (
                <th key={head} style={{
                  textAlign: head === 'Mês' ? 'left' : 'right',
                  padding: '10px 8px',
                  borderBottom: '1px solid var(--border2)',
                  color: 'var(--text3)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  fontWeight: 800,
                }}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(linha => (
              <tr key={linha.mes}>
                <td style={cellLeft}>{linha.mes}</td>
                <td style={cellRight}>{fmt(linha.rbt12Projetado)}</td>
                <td style={cellRight}>{fmt(linha.mei)}</td>
                <td style={cellRight}>{fmt(linha.simplesIII)}</td>
                <td style={cellRight}>{fmt(linha.simplesV)}</td>
                {exibirLucroPresumido && <td style={cellRight}>{fmt(linha.lucroPresumido)}</td>}
              </tr>
            ))}
            <tr>
              <td style={totalLeft}>Total anual</td>
              <td style={totalRight}>Delta III vs V</td>
              <td style={totalRight}>{fmt(total.mei)}</td>
              <td style={totalRight}>{fmt(total.simplesIII)}</td>
              <td style={totalRight}>{fmt(total.simplesV)}</td>
              {exibirLucroPresumido && <td style={totalRight}>{fmt(total.lucroPresumido)}</td>}
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
        Economia acumulada Simples III vs V: <b style={{ color: 'var(--lime)', fontFamily: 'var(--mono)' }}>{fmt(Math.max(0, total.simplesV - total.simplesIII))}</b>.
        {exibirLucroPresumido && ' LP usa estimativa simplificada com presunção por categoria e encargos de folha.'}
      </div>
      <TaxSourceNote
        taxRuleVersion={TAX_RULE_VERSION}
        mapeamento={[
          { valores: 'DAS Simples', fonte: FONTES_FISCAIS.resolucaoCgsn140 },
          { valores: 'Teto MEI', fonte: FONTES_FISCAIS.simplesNacionalLegislacao },
        ]}
        style={{ marginTop: 10 }}
      />
    </div>
  )
}

const cellLeft = {
  padding: '9px 8px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text2)',
  fontSize: 12,
} as const

const cellRight = {
  ...cellLeft,
  textAlign: 'right',
  fontFamily: 'var(--mono)',
  color: 'var(--text1)',
} as const

const totalLeft = {
  ...cellLeft,
  borderBottom: 'none',
  color: 'var(--text1)',
  fontWeight: 800,
} as const

const totalRight = {
  ...cellRight,
  borderBottom: 'none',
  color: 'var(--lime)',
  fontWeight: 800,
} as const
