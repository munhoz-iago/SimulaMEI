'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { calcularFatorR, calcularSimples } from '@/lib/tributario'
import { FATOR_R_MINIMO } from '@/lib/tributario/fatorR'
import { captureProductEvent } from '@/lib/analytics/events'
import { fmt, fmtPct } from '@/lib/format'
import { MonoVal, Tooltip } from '@/components/ui'
import { FolhaInput } from '@/components/dashboard/FolhaInput'
import {
  useDebouncedAutoSave,
  type AutoSaveStatus,
} from '@/components/dashboard/use-debounced-auto-save'

interface FatorRInterativoProps {
  projecao: number
  fatorRInicial: number
  /** Ano da competência para persistência. Sem ele, auto-save desabilita. */
  ano?: number
  /** Mês (1-12) da competência para persistência. */
  mes?: number
  /** CNAE oficial — obrigatório no payload. */
  cnae?: string
  /** Tipo MEI — obrigatório no payload. */
  tipoMei?: 'geral' | 'caminhoneiro'
}

const STATUS_LABEL: Record<AutoSaveStatus, string> = {
  idle: '',
  saving: 'Salvando...',
  saved: '✓ Salvo',
  failed: 'Falha — tente de novo',
}

export function FatorRInterativo({
  projecao,
  fatorRInicial,
  ano,
  mes,
  cnae,
  tipoMei,
}: FatorRInterativoProps) {
  const trackedRef = useRef(false)
  const [folhaMensal, setFolhaMensal] = useState(
    Math.max((projecao * fatorRInicial) / 12, 0)
  )

  // Persistência só ativa quando todo o contexto está presente. Sem ele,
  // o componente segue como calculadora efêmera (sem indicador).
  const persistenceEnabled =
    typeof ano === 'number' &&
    typeof mes === 'number' &&
    typeof cnae === 'string' &&
    cnae.length > 0 &&
    (tipoMei === 'geral' || tipoMei === 'caminhoneiro') &&
    Number.isFinite(projecao) &&
    projecao > 0

  const saveFolha = useCallback(
    async (folha: number) => {
      if (!persistenceEnabled) return
      // Não enviamos faturamentoMes — o endpoint preserva o faturamento_mes
      // existente pra não sobrescrever simulações reais com projecao/12.
      // Sem row pré-existente o endpoint retorna 400, comportamento aceitável
      // (auto-save só dispara após uma simulação ter sido salva).
      const response = await fetch('/api/monthly-inputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ano,
          mes,
          folhaMes: folha,
          cnae,
          tipoMei,
        }),
      })
      if (!response.ok) {
        throw new Error(`save failed: ${response.status}`)
      }
    },
    [persistenceEnabled, ano, mes, cnae, tipoMei],
  )

  const { status: saveStatus } = useDebouncedAutoSave({
    value: folhaMensal,
    onSave: saveFolha,
    delay: 1500,
    enabled: persistenceEnabled,
  })

  // Defesa: sem projeção válida, o componente fica inerte e enganador.
  // Mostra um placeholder pedindo simulação real ao invés de R$ 0 em tudo.
  if (!Number.isFinite(projecao) || projecao <= 0) {
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

  // Economia anual III vs V
  const economiaAnual = useMemo(
    () => calcularSimples(projecao, 'V').dasAnual - calcularSimples(projecao, 'III').dasAnual,
    [projecao],
  )

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>Folha mensal simulada</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <FolhaInput
              value={folhaMensal}
              onChange={next => {
                if (!trackedRef.current) {
                  trackedRef.current = true
                  captureProductEvent('fator_r_explored', { projecao })
                }
                setFolhaMensal(next)
              }}
              ariaLabel="Folha mensal em reais"
            />
            {persistenceEnabled && (
              <span
                aria-live="polite"
                style={{
                  fontSize: 11,
                  color: saveStatus === 'failed' ? 'var(--red)' : 'var(--text3)',
                  minHeight: 14,
                  minWidth: 80,
                }}
              >
                {STATUS_LABEL[saveStatus]}
              </span>
            )}
          </div>
          <MonoVal size={20}>
            {fmt(folhaMensal)}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text2)' }}>/mês</span>
          </MonoVal>
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
