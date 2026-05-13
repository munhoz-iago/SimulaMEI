'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fmt, fmtPct } from '@/lib/format'
import type { MonthlyMonitorSummary } from '@/lib/monitor'

interface RecentMonthlyRow {
  ano: number
  mes: number
  faturamentoMes: number
  folhaMes: number
  anexoCalculado: string | null
  fatorR: number | null
}

interface TransitionPreview {
  from: string
  to: string
  ano: number
  mes: number
  fatorR: number
}

interface MonthlyMonitorSectionProps {
  cnae: string
  tipoMei: 'geral' | 'caminhoneiro'
  defaultMonth: number
  defaultYear: number
  defaultRevenue: number
  defaultPayroll: number
  initialSummary: MonthlyMonitorSummary | null
  initialTransition: TransitionPreview | null
  recentRows: RecentMonthlyRow[]
  monthlyInputsError?: string | null
}

function monthLabel(month: number) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(2026, Math.max(0, month - 1), 1))
}

const FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--bg2)',
  color: 'var(--text1)',
  padding: '10px 12px',
  fontSize: 14,
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  color: 'var(--text3)',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
}

export function MonthlyMonitorSection({
  cnae,
  tipoMei,
  defaultMonth,
  defaultYear,
  defaultRevenue,
  defaultPayroll,
  initialSummary,
  initialTransition,
  recentRows,
  monthlyInputsError,
}: MonthlyMonitorSectionProps) {
  const router = useRouter()
  const [month, setMonth] = useState(String(defaultMonth))
  const [year, setYear] = useState(String(defaultYear))
  const [revenue, setRevenue] = useState(defaultRevenue ? String(Math.round(defaultRevenue)) : '')
  const [payroll, setPayroll] = useState(String(Math.round(defaultPayroll)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<MonthlyMonitorSummary | null>(initialSummary)
  const [transition, setTransition] = useState<TransitionPreview | null>(initialTransition)

  const hasMetrics = Boolean(summary)
  const fatorR = summary?.fatorRAtual ?? 0
  const atingeFatorR = fatorR >= 0.28

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const response = await fetch('/api/monthly-inputs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ano: Number(year),
        mes: Number(month),
        faturamentoMes: Number(revenue),
        folhaMes: Number(payroll),
        cnae,
        tipoMei,
      }),
    })

    const payload = await response.json().catch(() => null) as
      | { error?: string; summary?: MonthlyMonitorSummary; transition?: TransitionPreview | null }
      | null

    if (!response.ok) {
      setError(payload?.error ?? 'Não foi possível atualizar o monitor mensal.')
      setSaving(false)
      return
    }

    setSummary(payload?.summary ?? null)
    setTransition(payload?.transition ?? null)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="monitor-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)',
      gap: 24,
    }}>
      {/* ── Coluna esquerda: form + transition + histórico ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Atualize o mês corrente para recalcular DAS, Fator R e alertas de mudança de anexo.
          Lance esses dados todo mês — eles alimentam todos os outros widgets do dashboard.
        </p>

        {monthlyInputsError && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(245,197,66,0.24)',
            background: 'rgba(245,197,66,0.08)',
            color: 'var(--yellow)', fontSize: 13,
          }}>
            Schema de <code>monthly_inputs</code> ainda não está aplicado no Supabase.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Linha 1: Mês + Ano (compactos lado a lado) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 2fr', gap: 12 }}>
            <div>
              <label htmlFor="monitor-month" style={LABEL_STYLE}>Mês</label>
              <select
                id="monitor-month"
                value={month}
                onChange={event => setMonth(event.target.value)}
                style={FIELD_STYLE}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map(value => (
                  <option key={value} value={value}>{monthLabel(value)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="monitor-year" style={LABEL_STYLE}>Ano</label>
              <input
                id="monitor-year"
                inputMode="numeric"
                value={year}
                onChange={event => setYear(event.target.value)}
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label htmlFor="monitor-revenue" style={LABEL_STYLE}>Faturamento do mês</label>
              <input
                id="monitor-revenue"
                inputMode="decimal"
                value={revenue}
                onChange={event => setRevenue(event.target.value)}
                placeholder="R$"
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label htmlFor="monitor-payroll" style={LABEL_STYLE}>Folha / pró-labore</label>
              <input
                id="monitor-payroll"
                inputMode="decimal"
                value={payroll}
                onChange={event => setPayroll(event.target.value)}
                placeholder="R$"
                style={FIELD_STYLE}
              />
            </div>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text3)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              CNAE monitorado: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text2)', fontWeight: 700 }}>{cnae}</span>
            </div>
            <button
              type="submit"
              disabled={saving || Boolean(monthlyInputsError)}
              className="pressable"
              style={{
                minHeight: 42,
                padding: '0 22px',
                borderRadius: 'var(--radius)',
                background: 'var(--lime)',
                color: 'var(--ink-on-accent)',
                fontSize: 13,
                fontWeight: 800,
                opacity: saving || monthlyInputsError ? 0.7 : 1,
                cursor: saving || monthlyInputsError ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                border: 'none',
              }}
            >
              {saving ? (
                <>Atualizando…</>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Salvar mês
                </>
              )}
            </button>
          </div>
        </form>

        {transition && (
          <div style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(200,241,53,0.24)',
            background: 'rgba(200,241,53,0.06)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(200,241,53,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5">
                <path d="M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <div>
              <div style={{ color: 'var(--lime)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                Mudança de anexo detectada
              </div>
              <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.5 }}>
                Transição de <strong style={{ color: 'var(--text1)' }}>{transition.from}</strong> para <strong style={{ color: 'var(--text1)' }}>{transition.to}</strong> em <strong>{monthLabel(transition.mes)}/{transition.ano}</strong>, com Fator R de <strong>{fmtPct(transition.fatorR)}</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Histórico (timeline compacta) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={LABEL_STYLE}>Últimos lançamentos</span>
            {recentRows.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                {recentRows.length} {recentRows.length === 1 ? 'mês registrado' : 'meses registrados'}
              </span>
            )}
          </div>
          {recentRows.length > 0 ? (
            <div style={{ display: 'grid', gap: 0 }}>
              {recentRows.slice(0, 4).map((row, i, arr) => (
                <div
                  key={`${row.ano}-${row.mes}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 14,
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'var(--bg2)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: 'var(--text2)', lineHeight: 1,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text1)' }}>{monthLabel(row.mes)}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{row.ano}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                      {fmt(row.faturamentoMes)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      folha {fmt(row.folhaMes)}
                      {row.fatorR != null && ` · Fator R ${fmtPct(row.fatorR)}`}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 800,
                    color: row.anexoCalculado === 'III' ? 'var(--lime)' : row.anexoCalculado === 'V' ? 'var(--orange)' : 'var(--text3)',
                    padding: '3px 8px', borderRadius: 4,
                    background: row.anexoCalculado === 'III' ? 'rgba(200,241,53,0.1)' : row.anexoCalculado === 'V' ? 'rgba(255,140,0,0.1)' : 'var(--bg2)',
                  }}>
                    {row.anexoCalculado ? `Anexo ${row.anexoCalculado}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '20px 16px',
              background: 'var(--bg2)', border: '1px dashed var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: 13, color: 'var(--text3)', lineHeight: 1.6,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, opacity: 0.4, marginBottom: 6 }}>📅</div>
              Nenhum mês lançado. O primeiro registro ativa o histórico e os gráficos.
            </div>
          )}
        </div>
      </div>

      {/* ── Coluna direita: métricas calculadas ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={LABEL_STYLE}>Resultados deste mês</span>

        {/* Métrica principal: RBT12 (a soma 12 meses) */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '16px 18px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--blue)' }} />
          <div style={LABEL_STYLE}>RBT12 monitorado</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 900, color: hasMetrics ? 'var(--blue)' : 'var(--text3)', lineHeight: 1 }}>
            {hasMetrics ? fmt(summary!.rbt12) : 'R$ —'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
            Receita acumulada nos últimos 12 meses
          </div>
        </div>

        {/* Métricas secundárias em 2x1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '14px 16px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--lime)' }} />
            <div style={LABEL_STYLE}>DAS estimado</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 800, color: hasMetrics ? 'var(--text1)' : 'var(--text3)', lineHeight: 1.2 }}>
              {hasMetrics ? `${fmt(summary!.dasMensalEstimado)}` : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>/mês</div>
          </div>

          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '14px 16px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: atingeFatorR ? 'var(--lime)' : 'var(--orange)' }} />
            <div style={LABEL_STYLE}>Fator R</div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 800,
              color: hasMetrics ? (atingeFatorR ? 'var(--lime)' : 'var(--orange)') : 'var(--text3)',
              lineHeight: 1.2,
            }}>
              {hasMetrics ? fmtPct(fatorR) : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
              {hasMetrics ? (atingeFatorR ? 'Anexo III ✓' : 'Anexo V (< 28%)') : '/ 28% mínimo'}
            </div>
          </div>
        </div>

        {/* Pró-labore ideal — recomendação acionável */}
        <div style={{
          background: 'var(--bg1)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '14px 16px',
        }}>
          <div style={LABEL_STYLE}>Pró-labore ideal</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 800, color: 'var(--text1)', lineHeight: 1.2 }}>
            {hasMetrics ? fmt(summary!.proLaboreIdeal) : '—'}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)' }}>/mês</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, lineHeight: 1.5 }}>
            Folha mínima pra atingir Fator R ≥ 28% e tributar no Anexo III.
          </div>
        </div>
      </div>
    </div>
  )
}
