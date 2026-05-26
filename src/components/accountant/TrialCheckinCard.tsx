'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { TrialCheckinPainPoint, TrialCheckinSatisfaction } from '@/lib/accountant/trial-checkins'

interface TrialCheckinCardProps {
  show: boolean
}

type ViewState = 'question' | 'pain' | 'satisfied' | 'saved' | 'hidden'

const PAIN_POINTS: Array<{ value: TrialCheckinPainPoint; label: string; helper: string }> = [
  { value: 'cadastro_clientes', label: 'Cadastro de clientes', helper: 'Dificuldade para montar a carteira inicial.' },
  { value: 'alertas', label: 'Alertas', helper: 'Preciso entender melhor quem exige atenção.' },
  { value: 'relatorio_pdf', label: 'Relatório PDF', helper: 'Quero transformar análise em material para o cliente.' },
  { value: 'fator_r', label: 'Fator R', helper: 'Minha dúvida é anexo III/V e folha.' },
  { value: 'importacao_planilha', label: 'Importação/planilha', helper: 'Já tenho uma base fora do SimulaMEI.' },
  { value: 'outro', label: 'Outro', helper: 'Tenho uma necessidade diferente.' },
]

async function postCheckin(payload: Record<string, unknown>): Promise<boolean> {
  try {
    const response = await fetch('/api/accountant/trial-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return response.ok
  } catch (error) {
    // Erro de rede (offline, DNS, etc.) — não estoura, retorna falha pro caller decidir.
    console.warn('[TrialCheckinCard] postCheckin network error:', error)
    return false
  }
}

export function TrialCheckinCard({ show }: TrialCheckinCardProps) {
  const [view, setView] = useState<ViewState>(show ? 'question' : 'hidden')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [freeText, setFreeText] = useState('')
  const [satisfaction, setSatisfaction] = useState<TrialCheckinSatisfaction>('pain')
  const shownRef = useRef(false)

  useEffect(() => {
    if (!show || shownRef.current) return
    shownRef.current = true
    // Fire-and-forget: shown é métrica, falha não bloqueia UX
    void postCheckin({ action: 'shown' })
  }, [show])

  if (!show || view === 'hidden') return null

  async function answerSatisfied() {
    setPending(true)
    setError(null)
    const ok = await postCheckin({ action: 'answer', satisfaction: 'satisfied' })
    setPending(false)
    if (!ok) {
      setError('Não foi possível salvar. Tente de novo em alguns segundos.')
      return
    }
    setView('satisfied')
  }

  async function dismissToday() {
    setPending(true)
    setError(null)
    // Best effort: se falhar, ainda assim escondemos hoje (próxima sessão re-aparece se preciso)
    await postCheckin({ action: 'dismiss' })
    setPending(false)
    setView('hidden')
  }

  async function answerPain(painPoint: TrialCheckinPainPoint) {
    setPending(true)
    setError(null)
    const ok = await postCheckin({
      action: 'answer',
      satisfaction,
      painPoint,
      freeText,
    })
    setPending(false)
    if (!ok) {
      setError('Não foi possível salvar sua resposta. Tente de novo.')
      return
    }
    setView('saved')
  }

  function openPainView(nextSatisfaction: TrialCheckinSatisfaction) {
    setSatisfaction(nextSatisfaction)
    setView('pain')
  }

  function trackPlanClick() {
    void postCheckin({ action: 'cta_clicked' })
  }

  return (
    <section
      aria-label="Check-in diário do trial"
      style={{
        border: '1px solid var(--tint-blue-border)',
        background: 'linear-gradient(135deg, var(--tint-blue), rgba(72, 156, 255, 0.04))',
        borderRadius: 'var(--radius-lg)',
        padding: 18,
        marginBottom: 18,
        display: 'grid',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 10,
            color: 'var(--blue)',
            fontWeight: 900,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Check-in do trial
          </div>
          <h2 style={{ fontSize: 17, margin: '0 0 4px', fontWeight: 800 }}>
            O SimulaMEI está ajudando sua rotina hoje?
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Responda em alguns segundos. Isso ajuda a ajustar o produto e, se já estiver funcionando, escolher o plano certo.
          </p>
        </div>
        <button
          type="button"
          onClick={dismissToday}
          disabled={pending}
          className="quiet-link"
          style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 12 }}
        >
          Agora não
        </button>
      </div>

      {view === 'question' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={answerSatisfied}
              disabled={pending}
              className="dashboard-action dashboard-primary-action"
              style={{ padding: '9px 13px', fontSize: 12, fontWeight: 800 }}
            >
              Sim, está ajudando
            </button>
            <button
              type="button"
              onClick={() => openPainView('not_yet')}
              disabled={pending}
              className="dashboard-action dashboard-secondary-action"
              style={{ padding: '9px 13px', fontSize: 12, fontWeight: 800 }}
            >
              Ainda não
            </button>
            <button
              type="button"
              onClick={() => openPainView('pain')}
              disabled={pending}
              className="dashboard-action dashboard-secondary-action"
              style={{ padding: '9px 13px', fontSize: 12, fontWeight: 800 }}
            >
              Tenho uma dor específica
            </button>
          </div>
          {error && (
            <p role="alert" style={{ margin: 0, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>
              {error}
            </p>
          )}
        </div>
      )}

      {view === 'pain' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 8 }}>
            {PAIN_POINTS.map(point => (
              <button
                key={point.value}
                type="button"
                onClick={() => answerPain(point.value)}
                disabled={pending}
                style={{
                  textAlign: 'left',
                  padding: 12,
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg1)',
                  color: 'var(--text1)',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{point.label}</strong>
                <span style={{ color: 'var(--text3)', fontSize: 11, lineHeight: 1.45 }}>{point.helper}</span>
              </button>
            ))}
          </div>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
            Quer detalhar?
            <textarea
              value={freeText}
              onChange={event => setFreeText(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ex: minha maior dor hoje é explicar Fator R para cliente de serviços..."
              style={{
                width: '100%',
                resize: 'vertical',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg1)',
                color: 'var(--text1)',
                padding: 10,
                font: 'inherit',
              }}
            />
          </label>
          {error && (
            <p role="alert" style={{ margin: 0, color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>
              {error}
            </p>
          )}
        </div>
      )}

      {view === 'satisfied' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, color: 'var(--text2)', fontSize: 13 }}>
            Ótimo. Para manter a carteira ativa após o trial, escolha o plano quando fizer sentido.
          </p>
          <Link
            href="/contador/assinatura?source=trial_checkin"
            onClick={trackPlanClick}
            className="dashboard-action dashboard-primary-action"
            style={{ padding: '9px 13px', fontSize: 12, fontWeight: 800 }}
          >
            Escolher plano
          </Link>
        </div>
      )}

      {view === 'saved' && (
        <p style={{ margin: 0, color: 'var(--text2)', fontSize: 13 }}>
          Registrado. Vou usar esse sinal para priorizar melhorias e atalhos no painel.
        </p>
      )}
    </section>
  )
}
