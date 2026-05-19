'use client'

import { useState } from 'react'
import type { ResultadoSimulacao } from '@/types/tributario'
import { captureProductEvent, buildEmailCapturedProps, type LeadSaveStatus } from '@/lib/analytics/events'
import { LoadSpinner } from '@/components/ui'
import { normalizeEmail } from '@/lib/validation'
import { getLegalIdentity } from '@/constants/site'
import { RegimePreviewLocked } from './RegimePreviewLocked'

interface EmailGateProps {
  onUnlock: (email: string) => void
  resultado: ResultadoSimulacao
}

const GATE_FEATURES = [
  'Gráfico comparativo dos 4 regimes',
  'Score de Saúde Fiscal 0–100',
  'Simulador interativo do Fator R',
  'Relatório para compartilhar com contador',
]

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

export function EmailGate({ onUnlock, resultado }: EmailGateProps) {
  const [email, setEmail] = useState('')
  const [consentimentoLgpd, setConsentimentoLgpd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const emailInputId = 'email-gate-email'
  const consentInputId = 'email-gate-consent'
  const legal = getLegalIdentity()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) { setError('E-mail inválido'); return }
    if (!consentimentoLgpd) {
      setError('Você precisa aceitar a política de privacidade para liberar a análise completa.')
      return
    }
    setError('')
    setLoading(true)

    let leadSaveStatus: LeadSaveStatus = 'failed'
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          consentimentoLgpd,
          faturamentoAcumulado: resultado.entrada.faturamentoAcumulado,
          faturamentoAnual: resultado.alertaTeto.projecaoAnual,
          cnae: resultado.entrada.cnae,
          mesAtual: resultado.entrada.mesAtual,
          anexoAtual: resultado.anexoAtual,
          alertaCenario: resultado.alertaTeto.cenario,
          taxRuleVersion: resultado.taxRuleVersion,
        }),
      })
      leadSaveStatus = response.ok ? 'saved' : 'failed'
    } catch {
      // Non-blocking: proceed even if lead save fails
    } finally {
      setLoading(false)
      captureProductEvent('email_captured', buildEmailCapturedProps(resultado, leadSaveStatus))
      onUnlock(normalizedEmail)
    }
  }

  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--bg1), rgba(75,158,255,0.05))',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-lg)', padding: '36px 40px',
        display: 'grid', gridTemplateColumns: '1fr 380px', gap: 40, alignItems: 'center',
      }}
      className="gate-grid"
    >
      {/* Accent line gradiente azul → lima */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, var(--blue), var(--lime))',
      }} />

      {/* Left: pitch */}
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.2)',
          borderRadius: 4, padding: '3px 10px', marginBottom: 16,
        }}>
          <span style={{ color: 'var(--lime)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
            Análise completa gratuita
          </span>
        </div>
        <h3 style={{
          fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 800,
          marginBottom: 10, lineHeight: 1.2,
        }}>
          Veja o comparativo de 4 regimes tributários + Fator R interativo
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 20 }}>
          Cenário mais vantajoso destacado, score fiscal e relatório para seu contador — grátis.
        </p>
        <RegimePreviewLocked comparativo={resultado.comparativo} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 14 }}>
          {GATE_FEATURES.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
              <span style={{ color: 'var(--lime)', display: 'flex', flexShrink: 0 }}><CheckIcon /></span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor={emailInputId} style={{
            fontSize: 12, color: 'var(--text2)', fontWeight: 600,
            display: 'block', marginBottom: 6,
          }}>
            SEU E-MAIL
          </label>
          <input
            id={emailInputId}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="voce@empresa.com.br"
            className={`auth-input ${error ? 'auth-input-error' : ''}`}
            style={{
              padding: '13px 16px',
            }}
          />
        </div>
        <label htmlFor={consentInputId} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12, cursor: 'pointer' }}>
          <input
            id={consentInputId}
            type="checkbox"
            checked={consentimentoLgpd}
            onChange={e => { setConsentimentoLgpd(e.target.checked); setError('') }}
            style={{ marginTop: 2 }}
          />
          <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
            Concordo com a <a href="/privacidade" style={{ color: 'var(--lime)' }}>política de privacidade</a> e autorizo o uso do meu e-mail para liberar a análise e receber comunicações do SimulaMEI.
          </span>
        </label>
        {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{error}</div>}
        <button
          type="submit"
          className="dashboard-action dashboard-primary-action"
          style={{
            width: '100%', padding: '14px',
            fontSize: 15,
          }}
        >
          {loading ? (
            <><LoadSpinner /> Liberando...</>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Ver análise completa →
          </>
        )}
        </button>
        <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
          Sem spam. Sua simulação é liberada com consentimento explícito.
        </p>
        <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 4 }}>
          {legal.line}{legal.contactEmail ? ` · ${legal.contactEmail}` : ''}
        </p>
      </form>
    </div>
  )
}
