import Link from 'next/link'
import { fmt, fmtPct } from '@/lib/format'
import { analyzeMonitorInsights, type MonthlyEntry } from '@/lib/monitor/insights'
import type { TipoMei } from '@/types/tributario'

interface MonitorInsightsProps {
  history: MonthlyEntry[]
  tipoMei?: TipoMei
}

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const TONE_STYLES = {
  info: { color: 'var(--blue)', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.24)' },
  warn: { color: 'var(--yellow)', bg: 'rgba(245,197,66,0.08)', border: 'rgba(245,197,66,0.24)' },
  critical: { color: 'var(--red)', bg: 'rgba(255,59,59,0.08)', border: 'rgba(255,59,59,0.24)' },
  opportunity: { color: 'var(--lime)', bg: 'rgba(200,241,53,0.08)', border: 'rgba(200,241,53,0.24)' },
}

/**
 * Renderiza insights preditivos sobre o histórico do Monitor mensal.
 * Mostra média, projeção 12m, mês de estouro do teto e recomendações
 * acionáveis. Usado abaixo do `MonthlyMonitorSection` no dashboard.
 */
export function MonitorInsights({ history, tipoMei = 'geral' }: MonitorInsightsProps) {
  const insights = analyzeMonitorInsights(history, tipoMei)

  if (!insights || insights.monthsCount === 0) return null

  const trendIcon = insights.trendCategory === 'rising' ? '↗' : insights.trendCategory === 'falling' ? '↘' : '→'
  const trendColor = insights.trendCategory === 'rising'
    ? insights.scenario === 'critical' ? 'var(--red)' : 'var(--lime)'
    : insights.trendCategory === 'falling' ? 'var(--yellow)' : 'var(--text2)'
  const scenarioColor = insights.scenario === 'critical'
    ? 'var(--red)' : insights.scenario === 'watch' ? 'var(--yellow)' : 'var(--lime)'

  return (
    <section style={{ marginBottom: 16 }}>
      <div className="acc-card" style={{ padding: '24px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>
                Análise preditiva
              </span>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: '2px 0 0' }}>
                Insights dos {insights.monthsCount} {insights.monthsCount === 1 ? 'mês' : 'meses'} registrados
              </h2>
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            background: `${scenarioColor}1a`,
            border: `1px solid ${scenarioColor}33`,
            color: scenarioColor,
            fontSize: 11, fontWeight: 800,
          }}>
            {insights.scenario === 'critical' ? 'Crítico' : insights.scenario === 'watch' ? 'Atenção' : 'Saudável'}
          </span>
        </div>

        {/* Métricas em 4 colunas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }} className="insights-grid">
          {/* Média mensal */}
          <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Média mensal
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, color: 'var(--text1)', lineHeight: 1.1 }}>
              {fmt(insights.averageMonthly)}
            </div>
            <div style={{ fontSize: 11, color: trendColor, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 800 }}>{trendIcon}</span>
              {insights.trendCategory === 'rising' ? 'crescendo' : insights.trendCategory === 'falling' ? 'caindo' : 'estável'}
            </div>
          </div>

          {/* Projeção anual */}
          <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Projeção 12m
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, color: scenarioColor, lineHeight: 1.1 }}>
              {fmt(insights.projectedAnnual)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              {fmtPct(insights.usagePct)} do teto
            </div>
          </div>

          {/* Mês de estouro */}
          <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Estouro do teto
            </div>
            {insights.monthOfTetoBreach ? (
              <>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, color: 'var(--red)', lineHeight: 1.1 }}>
                  {MONTH_LABELS[insights.monthOfTetoBreach.mes - 1]}/{String(insights.monthOfTetoBreach.ano).slice(-2)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                  no ritmo atual
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, color: 'var(--lime)', lineHeight: 1.1 }}>
                  —
                </div>
                <div style={{ fontSize: 11, color: 'var(--lime)', marginTop: 4 }}>
                  cabe no MEI
                </div>
              </>
            )}
          </div>

          {/* Excedente */}
          <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {insights.projectedOverflow > 0 ? 'Excedente' : 'Folga anual'}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, lineHeight: 1.1,
              color: insights.projectedOverflow > 0 ? 'var(--red)' : 'var(--lime)',
            }}>
              {insights.projectedOverflow > 0 ? '+' : ''}{fmt(Math.abs(insights.projectedOverflow))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              {insights.projectedOverflow > 0 ? 'acima do teto' : 'até o teto'}
            </div>
          </div>
        </div>

        {/* Recomendações acionáveis */}
        {insights.recommendations.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Próximos passos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.recommendations.map((rec, i) => {
                const tone = TONE_STYLES[rec.tone]
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', gap: 12,
                      padding: '12px 14px',
                      borderRadius: 'var(--radius)',
                      background: tone.bg,
                      border: `1px solid ${tone.border}`,
                      borderLeftWidth: 3,
                      borderLeftColor: tone.color,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 800,
                        color: tone.color,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        marginBottom: 4,
                      }}>
                        {rec.tone === 'critical' ? 'urgente' : rec.tone === 'warn' ? 'atenção' : rec.tone === 'opportunity' ? 'oportunidade' : 'informativo'}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
                        {rec.title}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, margin: 0 }}>
                        {rec.body}
                      </p>
                    </div>
                    {rec.cta && (
                      <Link
                        href={rec.cta.href}
                        style={{
                          alignSelf: 'center',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius)',
                          background: tone.color,
                          color: 'var(--ink-on-accent)',
                          fontSize: 11, fontWeight: 800,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {rec.cta.label} →
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
