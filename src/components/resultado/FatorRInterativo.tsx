'use client'

import { useMemo, useRef, useState } from 'react'
import { calcularFatorR, calcularSimples } from '@/lib/tributario'
import { FATOR_R_MINIMO } from '@/lib/tributario/fatorR'
import { captureProductEvent } from '@/lib/analytics/events'
import { fmt, fmtPct } from '@/lib/format'
import { MonoVal, Tooltip } from '@/components/ui'

interface FatorRInterativoProps {
  projecao: number
  fatorRInicial: number
}

export function FatorRInterativo({ projecao, fatorRInicial }: FatorRInterativoProps) {
  const trackedRef = useRef(false)
  const [folhaMensal, setFolhaMensal] = useState(
    Math.max((projecao * fatorRInicial) / 12, 0)
  )

  const projecaoValida = Number.isFinite(projecao) && projecao > 0

  // Economia anual III vs V — calculado aqui (antes de qualquer return) para
  // não violar as regras de hooks. Com projeção inválida resolve em 0 e o
  // valor é descartado pelo placeholder; a chamada precisa ser incondicional.
  const economiaAnual = useMemo(
    () =>
      projecaoValida
        ? calcularSimples(projecao, 'V').dasAnual - calcularSimples(projecao, 'III').dasAnual
        : 0,
    [projecao, projecaoValida],
  )

  // Defesa: sem projeção válida, o componente fica inerte e enganador.
  // Mostra um placeholder pedindo simulação real ao invés de R$ 0 em tudo.
  if (!projecaoValida) {
    return (
      <div style={{
        background: 'var(--bg1)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px',
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Simulador Fator R</h3>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
          Faça uma nova simulação com faturamento e folha atualizados para usar o simulador interativo
          de pró-labore.
        </p>
      </div>
    )
  }

  const sliderMax = projecao * 0.5 / 12
  const resultado = calcularFatorR(folhaMensal * 12, projecao)
  const fr = resultado.fatorR
  const atingeMinimo = fr >= FATOR_R_MINIMO

  // Quanto falta para chegar em 28%
  const folhaMinima = (FATOR_R_MINIMO * projecao) / 12
  const falta = folhaMinima - folhaMensal

  const fillPct = Math.min((fr / 0.5) * 100, 100)
  // Position of 28% marker relative to 0–50% range
  const markerPct = (FATOR_R_MINIMO / 0.5) * 100 // = 56%

  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '28px 32px',
    }}>
      <Tooltip tip="Ajuste o pró-labore mensal e veja como o Fator R muda. O ponto de virada em 28% define qual Anexo se aplica.">
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Simulador Fator R</h3>
      </Tooltip>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
        Arraste a folha mensal e veja o impacto no regime.
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Folha mensal simulada</div>
          <MonoVal size={28}>{fmt(folhaMensal)}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text2)' }}>/mês</span></MonoVal>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Fator R resultante</div>
          <MonoVal size={28} color={atingeMinimo ? 'var(--lime)' : 'var(--orange)'}>
            {fmtPct(fr)}
          </MonoVal>
        </div>
      </div>

      <div style={{
        marginBottom: 18,
        padding: '10px 12px',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 12,
      }}>
        <span style={{ color: 'var(--text3)' }}>Folha mínima para Anexo III</span>
        <b style={{ color: 'var(--lime)', fontFamily: 'var(--mono)' }}>{fmt(folhaMinima)}/mês</b>
      </div>

      {/* Slider with 28% marker */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        <div style={{ position: 'relative' }}>
          {/* Filled track */}
          <div style={{
            position: 'absolute', top: '50%', left: 0,
            height: 6, borderRadius: 3,
            width: fillPct + '%',
            background: atingeMinimo ? 'var(--lime)' : 'var(--orange)',
            transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 0,
            transition: 'background .3s ease-out',
          }} />
          {/* 28% marker line */}
          <div style={{
            position: 'absolute', top: '50%', left: markerPct + '%',
            height: 20, width: 2, background: 'var(--text3)',
            transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2,
          }} />
          <input
            type="range" min={0} max={sliderMax} step={100}
            value={folhaMensal}
            onChange={e => {
              if (!trackedRef.current) {
                trackedRef.current = true
                captureProductEvent('fator_r_explored', {
                  projecao,
                })
              }
              setFolhaMensal(Number(e.target.value))
            }}
            style={{ position: 'relative', zIndex: 1, background: 'transparent' }}
            aria-label="Simular aumento de folha mensal"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>R$ 0</span>
          <span style={{
            fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)',
            position: 'absolute', left: markerPct + '%', transform: 'translateX(-50%)',
          }}>
            28%
          </span>
          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>50%</span>
        </div>
      </div>

      {/* Result callout */}
      <div style={{
        background: atingeMinimo ? 'rgba(200,241,53,0.07)' : 'rgba(255,122,26,0.08)',
        border: `1px solid ${atingeMinimo ? 'rgba(200,241,53,0.2)' : 'rgba(255,122,26,0.25)'}`,
        borderRadius: 'var(--radius)', padding: '14px 16px',
      }}>
        {atingeMinimo ? (
          <div style={{ fontSize: 13, color: 'var(--lime)', lineHeight: 1.5 }}>
            <b>Anexo III aplicável.</b> Você paga a alíquota menor.
            Economia estimada vs Anexo V:{' '}
            <b style={{ fontFamily: 'var(--mono)' }}>{fmt(economiaAnual)}/ano</b>.
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--orange)', lineHeight: 1.5 }}>
            <b>Anexo V aplicável.</b> Para atingir 28% (Anexo III), aumente a folha em{' '}
            <b style={{ fontFamily: 'var(--mono)' }}>{fmt(Math.max(0, falta))}/mês</b>.
          </div>
        )}
      </div>
    </div>
  )
}
