import { fmt } from '@/lib/format'
import { confidenceLevel } from '@/lib/dashboard/confidence'
import type { Acao } from '@/lib/dashboard/recomendacao'
import { Panel } from './Panel'

const MES_BR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

interface Props {
  pctTetoUsado: number          // 0..100+
  projecaoAnual: number         // R$
  projecaoConfidenceMeses: number
  mesEstourarTeto: number | null
  proximaAcao: Acao
  tetoAnual: number
}

export function actionLabel(a: Acao): string {
  switch (a.tipo) {
    case 'consultar_contador': return 'Consultar contador'
    case 'lancar_mes': return `Lançar ${MES_BR[a.mes - 1] ?? '—'}`
    case 'planejar_migracao_me': return 'Planejar migração ME'
    case 'ajustar_pro_labore': return `Ajustar pró-labore (+${fmt(a.folhaSugerida)}/mês)`
    case 'sem_acao_urgente': return 'Sem ação urgente'
  }
}

export function mesEstouroLabel(mes: number | null): string {
  if (mes === null) return 'dentro do teto'
  return MES_BR[mes - 1] ?? '—'
}

export function DashboardTopCards(p: Props) {
  const conf = confidenceLevel(p.projecaoConfidenceMeses)
  const mesEstouro = mesEstouroLabel(p.mesEstourarTeto)
  return (
    <section
      aria-label="Resumo decisão-first do dashboard"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 16,
        marginBottom: 16,
      }}
    >
      <Card label="Teto usado" value={`${Math.round(p.pctTetoUsado)}%`} sub={`Teto ${fmt(p.tetoAnual)}`} />
      <Card label="Projeção anual" value={p.projecaoAnual > 0 ? fmt(p.projecaoAnual) : '—'} sub={conf.label} />
      <Card
        label="Mês provável de estouro"
        value={mesEstouro}
        sub={p.mesEstourarTeto !== null ? 'planeje migração antes' : 'sem risco previsto'}
      />
      <Card label="Próxima ação" value={actionLabel(p.proximaAcao)} sub="" highlight />
    </section>
  )
}

function Card({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <Panel
      style={{
        padding: '16px 18px',
        background: highlight ? 'rgba(200,241,53,0.06)' : undefined,
        borderColor: highlight ? 'rgba(200,241,53,0.3)' : undefined,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text3)',
          textTransform: 'uppercase',
          letterSpacing: 0.08,
          marginBottom: 6,
          fontWeight: 800,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--text1)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </Panel>
  )
}
