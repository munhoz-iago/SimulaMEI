'use client'

import type { ResultadoSimulacao } from '@/types/tributario'
import { fmt, fmtPct } from '@/lib/format'
import { TOLERANCIA_EXCESSO } from '@/lib/tributario/limitesMei'
import { calcFiscalScore, getFiscalScoreEstado } from '@/lib/tributario/fiscalScore'
import { Badge, MonoVal } from '@/components/ui'
import { ResultCard } from './ResultCard'
import { EmailGate } from './EmailGate'
import { ShareResultButton } from './ShareResultButton'
import { TaxSourceNote } from './TaxSourceNote'
import { FONTES_FISCAIS } from '@/lib/tributario/oportunidades/fontes'

interface PartialResultsProps {
  resultado: ResultadoSimulacao
  onUnlock: (email: string) => void
}

type UrgenciaKey = 'critico' | 'risco' | 'atencao' | 'ok'

const URGENCIA_CONFIG: Record<UrgenciaKey, {
  color: string
  bg: string
  border: string
  iconBg: string
  label: string
  icon: string
  getMsg: (projecao: number, teto: number, excesso: number) => string
}> = {
  critico: {
    color: 'var(--red)',
    bg: 'oklch(55% 0.22 25 / 0.07)',
    border: 'oklch(55% 0.22 25 / 0.22)',
    iconBg: 'oklch(55% 0.22 25 / 0.14)',
    label: 'CRÍTICO',
    icon: '✕',
    getMsg: (p, _t, exc) =>
      `Faturamento ${fmtPct(exc - 1)} acima do teto. Risco de tributação retroativa ao 1º dia do ano.`,
  },
  risco: {
    color: 'var(--orange)',
    bg: 'oklch(73% 0.18 52 / 0.07)',
    border: 'oklch(73% 0.18 52 / 0.22)',
    iconBg: 'oklch(73% 0.18 52 / 0.14)',
    label: 'ATENÇÃO',
    icon: '▲',
    getMsg: () =>
      `Dentro da margem de 20%, sem headroom. Qualquer receita extra compromete o regime.`,
  },
  atencao: {
    color: 'var(--yellow)',
    bg: 'oklch(82% 0.15 85 / 0.07)',
    border: 'oklch(82% 0.15 85 / 0.22)',
    iconBg: 'oklch(82% 0.15 85 / 0.14)',
    label: 'ALERTA',
    icon: '!',
    getMsg: (p, t) =>
      `Projeção de ${fmt(p)}/ano. Você usou ${fmtPct(p / t)} do teto. Monitore mensalmente.`,
  },
  ok: {
    color: 'var(--lime)',
    bg: 'oklch(88% 0.19 126 / 0.05)',
    border: 'oklch(88% 0.19 126 / 0.14)',
    iconBg: 'oklch(88% 0.19 126 / 0.12)',
    label: 'SAUDÁVEL',
    icon: '✓',
    getMsg: () =>
      `Projeção dentro do teto MEI. Continue monitorando conforme o faturamento cresce.`,
  },
}

function getUrgenciaKey(excesso: number): UrgenciaKey {
  if (excesso > 1 + TOLERANCIA_EXCESSO) return 'critico'
  if (excesso > 1.0) return 'risco'
  if (excesso > 0.85) return 'atencao'
  return 'ok'
}



export function PartialResults({ resultado, onUnlock }: PartialResultsProps) {
  const { alertaTeto, fatorR, anexoAtual, entrada, comparativo } = resultado
  const { projecaoAnual: projecao, tetoAnual: teto } = alertaTeto
  const excesso = projecao / teto

  const urgenciaKey = getUrgenciaKey(excesso)
  const u = URGENCIA_CONFIG[urgenciaKey]
  const msg = u.getMsg(projecao, teto, excesso)
  const score = calcFiscalScore(resultado)
  const scoreEstado = getFiscalScoreEstado(score)
  const year = new Date().getFullYear()

  const aliqEfetiva = comparativo.simplesAnexoAtual.aliquotaEfetiva
  const impostoAnual = comparativo.simplesAnexoAtual.dasAnual
  const cnaeDescricao = entrada.cnae

  return (
    <section id="resultado" style={{ padding: '0 0 60px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>

        {/* Alert banner */}
        <div
          className="fade-up alert-banner"
          style={{
            background: u.bg,
            border: `1px solid ${u.border}`,
            borderTop: `2px solid ${u.color}`,
            borderRadius: 'var(--radius-lg)', padding: '20px 24px',
            marginBottom: 32, display: 'flex', gap: 16, alignItems: 'flex-start',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius)',
            background: u.iconBg, color: u.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, flexShrink: 0,
          }}>
            {u.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Badge color={u.color}>{u.label}</Badge>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>
                MEI {year}
              </span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text1)', lineHeight: 1.5 }}>{msg}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Projeção 12m</div>
            <MonoVal size={22} color={u.color}>{fmt(projecao)}</MonoVal>
          </div>
        </div>

        {/* 3 result cards */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}
          className="fade-up-2 res-grid"
        >
          <ResultCard
            label="Regime provável"
            value={`Simples — Anexo ${anexoAtual}`}
            sub={cnaeDescricao ? cnaeDescricao.slice(0, 45) + '…' : 'CNAE não informado'}
            color="var(--blue)"
            tip="Baseado na atividade e Fator R informados."
          />
          <ResultCard
            label="Alíquota efetiva estimada"
            value={fmtPct(aliqEfetiva)}
            sub={`Imposto est. ${fmt(impostoAnual)}/ano`}
            color="var(--lime)"
            tip="Calculada sobre a faixa de faturamento projetado, com deduções da tabela vigente."
          />
          <ResultCard
            label="Score de Saúde Fiscal"
            value={`${score}/100`}
            sub={scoreEstado.label}
            color={scoreEstado.color}
            tip="Pontuação baseada em uso do teto, Fator R e completude dos dados."
          />
        </div>

        {/* Fator R preview (serviços elegíveis) */}
        {fatorR && (
          <div
            className="fade-up-2"
            style={{
              background: 'var(--bg1)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 32,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Fator R</h3>
                <p style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 360 }}>
                  O ponto de virada está em 28%. Abaixo disso, você paga mais pelo Anexo V.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>Seu Fator R atual</div>
                <MonoVal
                  size={32}
                  color={fatorR.atingeMinimo ? 'var(--lime)' : entrada.folhaMensal > 0 ? 'var(--orange)' : 'var(--text3)'}
                >
                  {entrada.folhaMensal > 0 ? fmtPct(fatorR.fatorR) : '—'}
                </MonoVal>
              </div>
            </div>

            <div style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }} className="res-grid">
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Folha mínima para Anexo III</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 800, color: 'var(--lime)' }}>
                  {fmt(fatorR.folhaMinimaMensal)}/mês
                </div>
              </div>
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Falta de folha</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 800, color: fatorR.aumentoFolhaMensalNecessario > 0 ? 'var(--orange)' : 'var(--lime)' }}>
                  {fmt(fatorR.aumentoFolhaMensalNecessario)}/mês
                </div>
              </div>
              <div style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Economia III vs V</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 800, color: 'var(--blue)' }}>
                  {fmt(fatorR.economiaAnual)}/ano
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, position: 'relative' }}>
              <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '28%', top: -4, bottom: -4,
                  width: 2, background: 'var(--text3)', zIndex: 2,
                }} />
                <div style={{
                  position: 'absolute', left: '28%', top: -20,
                  fontSize: 10, color: 'var(--text3)',
                  transform: 'translateX(-50%)', whiteSpace: 'nowrap',
                }}>
                  28% (virada)
                </div>
                {entrada.folhaMensal > 0 && (
                  <div style={{
                    position: 'absolute', top: 0, height: '100%',
                    width: Math.min(fatorR.fatorR * 100, 100) + '%',
                    background: fatorR.atingeMinimo ? 'var(--lime)' : 'var(--orange)',
                    borderRadius: 4,
                    transition: 'background .3s ease-out',
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>0% — Anexo V</span>
                <span style={{ fontSize: 11, color: 'var(--lime)', fontFamily: 'var(--mono)' }}>≥28% — Anexo III ✓</span>
              </div>
            </div>

            {fatorR.alertaProLabore && (
              <div style={{
                marginTop: 18,
                background: 'oklch(82% 0.15 85 / 0.08)',
                border: '1px solid oklch(82% 0.15 85 / 0.26)',
                borderRadius: 'var(--radius)',
                padding: '12px 14px',
                color: 'var(--yellow)',
                fontSize: 13,
                lineHeight: 1.5,
              }}>
                <b>Pró-labore concentrado.</b> Pró-labore de {fmt(fatorR.alertaProLabore.proLaboreMensal)} gera INSS pessoal estimado de{' '}
                <b style={{ fontFamily: 'var(--mono)' }}>{fmt(fatorR.alertaProLabore.inssPessoalEstimado)}/mês</b> (11%, limitado ao teto previdenciário).
                Verifique se a economia no DAS supera esse custo.
              </div>
            )}

            <details style={{ marginTop: 18 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text2)', fontSize: 13, fontWeight: 700 }}>
                Como calculamos a economia
              </summary>
              <div style={{
                marginTop: 10,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                fontSize: 12,
              }}>
                {[
                  ['Alíquota efetiva Anexo V', fmtPct(fatorR.memoriaCalculo.aliquotaEfetivaAnexoV)],
                  ['Alíquota efetiva Anexo III', fmtPct(fatorR.memoriaCalculo.aliquotaEfetivaAnexoIII)],
                  ['RBT12 projetado', fmt(fatorR.memoriaCalculo.rbt12Projetado)],
                  ['Diferença x RBT12', `${fmtPct(fatorR.memoriaCalculo.diferencaAliquota)} × ${fmt(fatorR.memoriaCalculo.rbt12Projetado)} = ${fmt(fatorR.memoriaCalculo.economiaAnual)}`],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '9px 12px',
                    borderTop: label === 'Alíquota efetiva Anexo V' ? 'none' : '1px solid var(--border)',
                    background: 'var(--bg2)',
                  }}>
                    <span style={{ color: 'var(--text3)' }}>{label}</span>
                    <b style={{ color: 'var(--text1)', fontFamily: 'var(--mono)', textAlign: 'right' }}>{value}</b>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* Share button */}
        <div className="fade-up-3">
          <ShareResultButton resultado={resultado} />
        </div>

        {/* Legal disclaimer */}
        <div className="fade-up-3" style={{
          padding: '12px 16px',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text3)',
          marginBottom: 32, display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ color: 'var(--blue)', flexShrink: 0 }}>ℹ</span>
          Estimativa com base nas regras vigentes em {year}. A simulação não substitui a análise de um
          contador credenciado. Confirme a decisão final com um profissional habilitado antes de alterar
          seu regime tributário.
        </div>

        {/* Fonte normativa + versão do motor (auditabilidade) */}
        <TaxSourceNote
          className="fade-up-3"
          taxRuleVersion={resultado.taxRuleVersion}
          mapeamento={[
            { valores: 'Anexo, alíquota e DAS', fonte: FONTES_FISCAIS.resolucaoCgsn140 },
            { valores: 'Teto MEI', fonte: FONTES_FISCAIS.simplesNacionalLegislacao },
          ]}
          style={{ marginBottom: 32 }}
        />

        {/* Email gate */}
        <div className="fade-up-4">
          <EmailGate onUnlock={onUnlock} resultado={resultado} />
        </div>
      </div>
    </section>
  )
}
