'use client'

import { useRef, useState, useMemo } from 'react'
import type { CnaeInfo, ResultadoSimulacao, TipoMei } from '@/types/tributario'
import { calcularFolhaFatorR, LIMITES_MEI, FATOR_R_MINIMO, TOLERANCIA_EXCESSO } from '@/lib/tributario'
import { captureProductEvent } from '@/lib/analytics/events'
import { fmt, fmtPct, MESES_ABREVIADOS } from '@/lib/format'
import { MonoVal, LoadSpinner } from '@/components/ui'
import { CnaeAutocomplete } from './CnaeAutocomplete'
import { LivePreviewPanel } from './LivePreviewPanel'
import { FieldLabel, Validation, SliderWithInput } from './FormPrimitives'
import type { ValidationMsg } from './FormPrimitives'

interface SimulatorSectionProps {
  onResults: (resultado: ResultadoSimulacao) => void
}

const FAT_SLIDER_MAX = 180000
const PROLABORE_SLIDER_MAX = 15000
const FOLHA_COMPLEMENTAR_SLIDER_MAX = 30000

export function SimulatorSection({ onResults }: SimulatorSectionProps) {
  const [fat, setFat] = useState(54000)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [cnae, setCnae] = useState<CnaeInfo | null>(null)
  const [prolabore, setProlabore] = useState(0)
  const [salariosClt, setSalariosClt] = useState(0)
  const [rpa, setRpa] = useState(0)
  const [beneficios, setBeneficios] = useState(0)
  const [temProlabore, setTemProlabore] = useState(false)
  const [usarFolhaDetalhada, setUsarFolhaDetalhada] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requestError, setRequestError] = useState('')
  const startedTrackedRef = useRef(false)

  const tipoMei: TipoMei = cnae?.cnae === '4930-2/02' ? 'caminhoneiro' : 'geral'
  const cnaePendente = cnae?.classificacaoTributaria === 'pendente'
  const teto = LIMITES_MEI[tipoMei].anual

  const projecao = mes > 0 ? (fat / mes) * 12 : fat
  const excesso = projecao / teto
  const folhaDetalhadaInput = useMemo(() => ({
    salariosClt,
    proLabore: prolabore,
    rpa,
    beneficios,
  }), [beneficios, prolabore, rpa, salariosClt])
  const folhaCalculada = useMemo(
    () => calcularFolhaFatorR(usarFolhaDetalhada ? folhaDetalhadaInput : undefined, temProlabore ? prolabore : 0),
    [folhaDetalhadaInput, prolabore, temProlabore, usarFolhaDetalhada],
  )
  const folhaMensalTotal = temProlabore ? folhaCalculada.totalMensal : 0
  const folhaMinimaMensal = (projecao * FATOR_R_MINIMO) / 12
  const faltaFolhaMensal = Math.max(0, folhaMinimaMensal - folhaMensalTotal)
  const fatorRVal = temProlabore && folhaMensalTotal > 0
    ? (folhaMensalTotal * 12) / projecao
    : 0

  const fatValidation = useMemo((): ValidationMsg | null => {
    if (fat === 0) return null
    if (excesso > 1 + TOLERANCIA_EXCESSO) return {
      msg: `Projeção ${fmt(projecao)} — excede o teto em ${fmtPct(excesso - 1)}`,
      type: 'error',
    }
    if (excesso > 1.0) return {
      msg: `Projeção ${fmt(projecao)} — dentro da tolerância de ${fmtPct(TOLERANCIA_EXCESSO)} acima do teto`,
      type: 'warn',
    }
    if (excesso > 0.85) return {
      msg: `Projeção ${fmt(projecao)} — atenção, próximo do teto`,
      type: 'warn',
    }
    return { msg: `Projeção anual: ${fmt(projecao)}`, type: 'ok' }
  }, [fat, projecao, excesso])

  const prolaboreValidation = useMemo((): ValidationMsg | null => {
    if (!temProlabore || folhaMensalTotal === 0) return null
    if (fatorRVal >= FATOR_R_MINIMO) return {
      msg: `Fator R ${fmtPct(fatorRVal)} ≥ ${fmtPct(FATOR_R_MINIMO)} — Anexo III (menor alíquota)`,
      type: 'ok',
    }
    return {
      msg: `Fator R ${fmtPct(fatorRVal)} < ${fmtPct(FATOR_R_MINIMO)} — faltam ${fmt(faltaFolhaMensal)}/mês de folha.`,
      type: 'warn',
    }
  }, [faltaFolhaMensal, folhaMensalTotal, temProlabore, fatorRVal])

  const sliderColor = excesso > 1 + TOLERANCIA_EXCESSO
    ? 'var(--red)'
    : excesso > 1.0
      ? 'var(--orange)'
      : excesso > 0.85
        ? 'var(--yellow)'
        : 'var(--lime)'

  const prolaboreColor = fatorRVal >= FATOR_R_MINIMO ? 'var(--lime)' : 'var(--yellow)'

  function trackSimulationStart() {
    if (startedTrackedRef.current) return
    startedTrackedRef.current = true
    captureProductEvent('simulation_started', { month: mes, hasPayroll: temProlabore })
  }

  async function handleSimular() {
    if (!cnae || cnaePendente) return
    setRequestError('')
    setLoading(true)
    trackSimulationStart()

    const response = await fetch('/api/simular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faturamentoAcumulado: fat,
        mesAtual: mes,
        cnae: cnae.cnae,
        folhaMensal: folhaMensalTotal,
        folhaDetalhada: temProlabore ? folhaDetalhadaInput : undefined,
        tipoMei,
      }),
    })

    const payload = await response.json().catch(() => null) as ResultadoSimulacao | { error?: string } | null

    if (!response.ok || !payload || !('entrada' in payload)) {
      setLoading(false)
      setRequestError((payload && 'error' in payload && payload.error) || 'Não foi possível processar a simulação agora.')
      return
    }

    captureProductEvent('simulation_completed', {
      cnae: payload.entrada.cnae,
      tipoMei: payload.entrada.tipoMei,
      anexoAtual: payload.anexoAtual,
      hasFatorR: Boolean(payload.fatorR),
      folhaMensal: folhaMensalTotal,
      cenarioTeto: payload.alertaTeto.cenario,
    })
    setLoading(false)
    onResults(payload)
  }

  return (
    <section id="simulador" style={{ padding: '92px 0 70px' }}>
      <div className="section-shell">
        <div className="im-section-header">
          <span className="im-section-number" data-reveal>01 / Simulador</span>
          <div data-reveal style={{ '--reveal-delay': '80' } as React.CSSProperties}>
            <h2 className="im-section-title">Entrada curta, leitura fiscal completa.</h2>
            <p className="im-section-lead">
              O formulário mantém só o que muda a decisão: faturamento, mês, atividade e folha. A prévia lateral transforma cada ajuste em consequência tributária.
            </p>
          </div>
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 60, alignItems: 'start' }}
          className="sim-grid"
        >
          {/* ── Left: form ───────────────────────────────────── */}
          <div className="instrument-panel" data-reveal style={{ '--reveal-delay': '140', padding: 28 } as React.CSSProperties}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 2, background: 'var(--lime)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Dados de entrada
              </span>
            </div>
            <h3 style={{ fontSize: 'clamp(22px, 2.4vw, 30px)', fontWeight: 850, lineHeight: 1.1, marginBottom: 8 }}>
              Simule com quatro decisões.
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 34 }}>
              Preencha os campos abaixo. Sem cadastro antes do resultado.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* 1. Faturamento */}
              <div>
                <FieldLabel tip="Faturamento acumulado desde janeiro deste ano (sem deduções).">
                  Faturamento acumulado no ano
                </FieldLabel>
                <div style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '16px 18px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                    <MonoVal size={32} color={sliderColor}>{fmt(fat)}</MonoVal>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>de {fmt(teto)} (teto)</span>
                  </div>
                  <SliderWithInput
                    value={fat} min={0} max={FAT_SLIDER_MAX} step={500}
                    onChange={v => { trackSimulationStart(); setFat(v) }}
                    sliderColor={sliderColor}
                    ariaLabel="Faturamento acumulado"
                    maxLabel="R$ 180k"
                  />
                </div>
                <Validation validation={fatValidation} />
              </div>

              {/* 2. Mês atual */}
              <div>
                <FieldLabel tip="Em qual mês estamos? Usado para projetar o faturamento anual com base no acumulado.">
                  Mês atual
                </FieldLabel>
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}
                  className="mes-grid"
                >
                  {MESES_ABREVIADOS.map((m, i) => {
                    const mesNum = i + 1
                    const ativo = mes === mesNum
                    return (
                      <button
                        key={mesNum}
                        type="button"
                        className="pressable"
                        onClick={() => { trackSimulationStart(); setMes(mesNum) }}
                        style={{
                          padding: '8px 4px', borderRadius: 'var(--radius)',
                          background: ativo ? 'var(--lime)' : 'var(--bg2)',
                          color: ativo ? 'var(--ink-on-accent)' : 'var(--text2)',
                          border: `1px solid ${ativo ? 'var(--lime)' : 'var(--border)'}`,
                          fontSize: 11, fontWeight: ativo ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {m}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 3. CNAE */}
              <div>
                <FieldLabel tip="O CNAE determina qual Anexo do Simples se aplica e afeta diretamente a alíquota.">
                  Atividade / CNAE
                </FieldLabel>
                <CnaeAutocomplete value={cnae} origin="/#simulador" onChange={value => {
                  trackSimulationStart()
                  setCnae(value)
                }} />
                {!cnae && (
                  <Validation validation={{ msg: 'Selecione a atividade para calcular o Anexo correto', type: 'warn' }} />
                )}
                {cnaePendente && (
                  <Validation validation={{ msg: 'CNAE oficial encontrado; falta curadoria tributária para calcular Anexo e Fator R', type: 'warn' }} />
                )}
              </div>

              {/* 4. Folha */}
              <div>
                <div className="prolabore-toggle-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                  <FieldLabel tip="Folha do Fator R pode incluir pró-labore, salários CLT, encargos, RPA e benefícios registrados.">
                    Pró-labore / folha mensal
                  </FieldLabel>
                  <label className="toggle-wrap" style={{ cursor: 'pointer' }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {temProlabore ? 'Ativo' : 'Não tenho'}
                    </span>
                    <div
                      className={`toggle ${temProlabore ? 'on' : ''}`}
                      onClick={() => { trackSimulationStart(); setTemProlabore(v => !v) }}
                    />
                  </label>
                </div>
                {temProlabore && (
                  <div style={{ animation: 'fadeUp .25s ease forwards' }}>
                    <div style={{
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', padding: '16px 18px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                        <MonoVal size={28}>
                          {fmt(folhaMensalTotal)}
                          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text2)' }}>/mês</span>
                        </MonoVal>
                        <span style={{ fontSize: 12, color: prolaboreColor }}>
                          Fator R: <b>{fmtPct(fatorRVal)}</b>
                        </span>
                      </div>
                      <div style={{
                        marginBottom: 12,
                        padding: '10px 12px',
                        background: 'var(--bg1)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        fontSize: 12,
                      }}>
                        <span style={{ color: 'var(--text3)' }}>Folha mínima para Anexo III</span>
                        <b style={{ color: faltaFolhaMensal > 0 ? 'var(--orange)' : 'var(--lime)', fontFamily: 'var(--mono)' }}>
                          {fmt(folhaMinimaMensal)}/mês
                        </b>
                      </div>
                      <SliderWithInput
                        value={prolabore} min={0} max={PROLABORE_SLIDER_MAX} step={200}
                        onChange={v => { trackSimulationStart(); setProlabore(v) }}
                        sliderColor={prolaboreColor}
                        ariaLabel="Pró-labore mensal"
                        maxLabel="R$ 15k"
                      />
                      <div style={{ marginTop: 14 }}>
                        <label className="toggle-wrap" style={{ justifyContent: 'flex-start', cursor: 'pointer' }}>
                          <div
                            className={`toggle ${usarFolhaDetalhada ? 'on' : ''}`}
                            onClick={() => { trackSimulationStart(); setUsarFolhaDetalhada(v => !v) }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                            Detalhar CLT, RPA e benefícios
                          </span>
                        </label>
                      </div>
                      {usarFolhaDetalhada && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr',
                          gap: 14,
                          marginTop: 14,
                          paddingTop: 14,
                          borderTop: '1px solid var(--border)',
                        }}>
                          <SliderWithInput
                            value={salariosClt} min={0} max={FOLHA_COMPLEMENTAR_SLIDER_MAX} step={200}
                            onChange={v => { trackSimulationStart(); setSalariosClt(v) }}
                            sliderColor="var(--blue)"
                            ariaLabel="Salários CLT mensais"
                            maxLabel="R$ 30k"
                          />
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: -10 }}>
                            Salários CLT: {fmt(salariosClt)} · INSS patronal auto {fmt(folhaCalculada.inssPatronal)} · FGTS auto {fmt(folhaCalculada.fgts)}
                          </div>
                          <SliderWithInput
                            value={rpa} min={0} max={FOLHA_COMPLEMENTAR_SLIDER_MAX} step={200}
                            onChange={v => { trackSimulationStart(); setRpa(v) }}
                            sliderColor="var(--yellow)"
                            ariaLabel="RPA mensal"
                            maxLabel="R$ 30k"
                          />
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: -10 }}>RPA: {fmt(rpa)}</div>
                          <SliderWithInput
                            value={beneficios} min={0} max={FOLHA_COMPLEMENTAR_SLIDER_MAX} step={200}
                            onChange={v => { trackSimulationStart(); setBeneficios(v) }}
                            sliderColor="var(--lime)"
                            ariaLabel="Benefícios mensais"
                            maxLabel="R$ 30k"
                          />
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: -10 }}>Benefícios registrados: {fmt(beneficios)}</div>
                        </div>
                      )}
                    </div>
                    <Validation validation={prolaboreValidation} />
                  </div>
                )}
              </div>
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
              <button
                type="button"
                className="pressable sim-cta-primary"
                onClick={handleSimular}
                disabled={!cnae || cnaePendente || loading}
                style={{
                  background: cnae && !cnaePendente ? 'var(--lime)' : 'var(--bg3)',
                  color: cnae && !cnaePendente ? 'var(--ink-on-accent)' : 'var(--text3)',
                }}
              >
                {loading ? (
                  <><LoadSpinner /> Calculando...</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    Ver resultado
                  </>
                )}
              </button>
              <a
                href="#como-calcula"
                className="pressable sim-cta-secondary"
              >
                Como calcula
              </a>
            </div>
            {requestError && (
              <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>
                {requestError}
              </div>
            )}
          </div>

          {/* ── Right: live preview panel ─────────────────────── */}
          <div className="desktop-only" data-reveal style={{ '--reveal-delay': '200' } as React.CSSProperties}>
            <LivePreviewPanel
              fat={fat}
              mes={mes}
              cnae={cnae}
              prolabore={folhaMensalTotal}
              projecao={projecao}
              excesso={excesso}
              fatorR={fatorRVal}
              teto={teto}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
