'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ResultadoSimulacao } from '@/types/tributario'
import { calcularSimples, gerarOportunidadesFiscais, LIMITES_MEI } from '@/lib/tributario'
import { calcFiscalScore, getFiscalScoreEstado } from '@/lib/tributario/fiscalScore'
import { captureProductEvent } from '@/lib/analytics/events'
import { fmt, fmtPct } from '@/lib/format'
import { Badge } from '@/components/ui'
import { FatorRInterativo } from './FatorRInterativo'
import { FiscalScore } from './FiscalScore'
import { ExcessoVisual } from './ExcessoVisual'
import { OportunidadesFiscais } from './OportunidadesFiscais'
import { TabelaDAS } from './TabelaDAS'
import { ShareResultButton } from './ShareResultButton'

interface FullResultsProps {
  resultado: ResultadoSimulacao
  email: string
}

interface RegimeItem {
  id: string
  label: string
  color: string
  desc: string
  imposto: number
  aliq: number
}

export function FullResults({ resultado, email }: FullResultsProps) {
  const [activeRegime, setActiveRegime] = useState<string | null>(null)
  const { fatorR, anexoAtual, comparativo, alertaTeto } = resultado
  const projecao = alertaTeto.projecaoAnual
  const excesso = projecao / alertaTeto.tetoAnual
  const year = new Date().getFullYear()

  // Usa dados ja calculados pelo motor - evita recalculacoes a cada render.
  const regimes: RegimeItem[] = useMemo(() => {
    const simplesIII = comparativo.simplesAnexoOtimo ?? calcularSimples(projecao, 'III')
    const simplesV = comparativo.simplesAnexoAtual.anexo === 'V'
      ? comparativo.simplesAnexoAtual
      : calcularSimples(projecao, 'V')

    const presuncaoPct = Math.round(comparativo.presumido.presuncaoUtilizada * 100)

    const exibirLucroPresumido = projecao > LIMITES_MEI[resultado.entrada.tipoMei].anual
    const baseRegimes = [
      {
        id: 'III',
        label: 'Simples III',
        color: 'var(--lime)',
        desc: 'Fator R >= 28%',
        imposto: simplesIII.dasAnual,
        aliq: simplesIII.aliquotaEfetiva,
      },
      {
        id: 'V',
        label: 'Simples V',
        color: 'var(--blue)',
        desc: 'Fator R < 28%',
        imposto: simplesV.dasAnual,
        aliq: simplesV.aliquotaEfetiva,
      },
    ]

    return [
      ...baseRegimes,
      ...(exibirLucroPresumido ? [
      {
        id: 'presumido',
        label: 'Lucro Presumido',
        color: 'var(--yellow)',
        desc: `LP - base ${presuncaoPct}%`,
        imposto: comparativo.presumido.custoTotal,
        aliq: comparativo.presumido.aliquotaEfetivaCustoTotal,
      },
      ] : []),
      {
        id: 'real',
        label: 'Lucro Real',
        color: 'var(--orange)',
        desc: 'LR - lucro efetivo',
        imposto: comparativo.real.custoTotal,
        aliq: comparativo.real.aliquotaEfetivaCustoTotal,
      },
    ]
  }, [comparativo, projecao, resultado.entrada.tipoMei])

  const maxImposto = Math.max(...regimes.map(r => r.imposto))
  const melhorRegime = regimes.reduce((a, b) => a.imposto < b.imposto ? a : b)
  const score = useMemo(() => calcFiscalScore(resultado), [resultado])
  const scoreEstado = getFiscalScoreEstado(score)
  const oportunidades = useMemo(() => gerarOportunidadesFiscais(resultado), [resultado])

  return (
    <section id="resultado-completo" style={{ padding: '60px 0', background: 'var(--bg0)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>

        {/* Header */}
        <div className="fade-up full-results-header" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <Badge color="var(--lime)">Análise completa</Badge>
              <Badge color="var(--blue)">{email}</Badge>
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 2.8vw, 36px)', fontWeight: 800 }}>
              Comparativo tributário — {year}
            </h2>
          </div>
          <div className="full-results-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <Link
              href="/relatorio"
              className="dashboard-action dashboard-secondary-action"
              onClick={() => captureProductEvent('pdf_cta_clicked', { source: 'full-results' })}
              style={{
                padding: '10px 18px', fontSize: 13, fontWeight: 700,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Baixar relatório
            </Link>
            <Link
              href="/para-contadores"
              className="dashboard-action dashboard-primary-action"
              style={{
                padding: '10px 18px', fontSize: 13,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Validar com contador
            </Link>
          </div>
        </div>

        <ShareResultButton resultado={resultado} variant="full" />

        <div className="fade-up-2">
          <OportunidadesFiscais oportunidades={oportunidades} />
        </div>

        {/* Comparativo de regimes - bars */}
        <div className="fade-up-3" style={{
          background: 'var(--bg1)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '32px 36px', marginBottom: 28,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Comparativo de regimes</h3>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
            Estimativa de carga tributária anual para faturamento de{' '}
            <b style={{ color: 'var(--text1)', fontFamily: 'var(--mono)' }}>{fmt(projecao)}</b>
          </p>
          <p className="result-info-note">
            A simulação considera a atividade predominante do CNAE.
            Lucro Presumido e Real incluem INSS do sócio e contribuição patronal no custo total.
          </p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', minHeight: 200 }}>
            {regimes.map(regime => {
              const pct = (regime.imposto / maxImposto) * 100
              const isMelhor = regime.id === melhorRegime.id
              const isAtual = regime.id === anexoAtual || (regime.id === 'III' && anexoAtual === 'III')
              const isActive = activeRegime === regime.id || isMelhor

              return (
                <button
                  type="button"
                  key={regime.id}
                  className="regime-bar-button"
                  onMouseEnter={() => setActiveRegime(regime.id)}
                  onMouseLeave={() => setActiveRegime(null)}
                  onFocus={() => setActiveRegime(regime.id)}
                  onBlur={() => setActiveRegime(null)}
                  onClick={() => setActiveRegime(activeRegime === regime.id ? null : regime.id)}
                >
                  <div style={{ minHeight: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isMelhor && <Badge color="var(--lime)" small>Menor custo</Badge>}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: regime.color }}>
                    {fmtPct(regime.aliq)}
                  </div>
                  <div className="regime-bar" style={{
                    height: Math.max(pct * 1.8, 16),
                    background: isActive ? regime.color : `color-mix(in oklch, ${regime.color} 38%, transparent)`,
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    paddingTop: 8,
                    boxShadow: isMelhor ? `0 0 24px ${regime.color}55, 0 0 8px ${regime.color}30` : 'none',
                  }} />
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                    {fmt(regime.imposto)}
                  </div>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: isAtual ? regime.color : 'var(--text2)',
                    textAlign: 'center',
                  }}>
                    {regime.label}
                    {isAtual && (
                      <span style={{ display: 'block', fontSize: 10, color: 'var(--text3)' }}>atual</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <TabelaDAS
          projecao={projecao}
          folhaMensal={resultado.entrada.folhaMensal}
          tipoMei={resultado.entrada.tipoMei}
          categoria={comparativo.presumido.categoria}
        />

        {/* Fator R interativo + Score fiscal */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 28 }}
          className="full-grid"
        >
          {fatorR && (
            <FatorRInterativo
              projecao={projecao}
              fatorRInicial={fatorR.fatorR}
            />
          )}
          {!fatorR && (
            <div style={{
              background: 'var(--bg1)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '28px 32px',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12,
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Regime identificado</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                Sua atividade é enquadrada no <b>Anexo {anexoAtual}</b> do Simples Nacional.
                O Fator R não se aplica a este CNAE.
              </p>
              <div style={{
                display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8,
              }}>
                <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Alíquota efetiva</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--lime)' }}>
                    {fmtPct(comparativo.simplesAnexoAtual.aliquotaEfetiva)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>DAS anual</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--blue)' }}>
                    {fmt(comparativo.simplesAnexoAtual.dasAnual)}
                  </div>
                </div>
              </div>
            </div>
          )}
          <FiscalScore score={score} estado={scoreEstado} resultado={resultado} />
        </div>

        {/* Excesso visual */}
        <ExcessoVisual
          excesso={excesso}
          teto={alertaTeto.tetoAnual}
          projecao={projecao}
        />
      </div>

    </section>
  )
}
