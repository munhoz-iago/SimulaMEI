'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ACCOUNTANT_CLIENT_RANGES, ACCOUNTANT_TOOL_OPTIONS } from '@/lib/accountant/leads'
import { captureProductEvent } from '@/lib/analytics/events'

type FormState = 'idle' | 'submitting' | 'sent'

export type AccountantLeadIntent = 'waitlist' | 'enterprise'

export interface AccountantLeadIntentConfig {
  submitLabel: string
  submittingLabel: string
  defaultCarteiraRange: typeof ACCOUNTANT_CLIENT_RANGES[number]
  sentTitle: string
  sentMessage: string
}

// Variantes de copy + pré-seleção por intenção. Mantida como função pura
// pra cobertura por teste unitário (não depende de DOM/sessionStorage).
export function getAccountantLeadIntentConfig(intent: AccountantLeadIntent): AccountantLeadIntentConfig {
  if (intent === 'enterprise') {
    return {
      submitLabel: 'Falar com nosso comercial',
      submittingLabel: 'Enviando...',
      defaultCarteiraRange: '150+',
      sentTitle: 'Contato recebido!',
      sentMessage: 'Recebemos seu contato. Nosso comercial responde em até 1 dia útil (carteiras 150+ entram em fila prioritária).',
    }
  }
  return {
    submitLabel: 'Entrar na lista de acesso antecipado',
    submittingLabel: 'Registrando...',
    defaultCarteiraRange: '21-50',
    sentTitle: 'Cadastro recebido!',
    sentMessage: 'Recebemos seu cadastro. Contato em até 48h conforme a faixa de carteira.',
  }
}

const ALLOWED_RANGES = new Set(ACCOUNTANT_CLIENT_RANGES)

const fieldStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '11px 12px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border2)',
  background: 'var(--bg2)',
  color: 'var(--text1)',
  outline: 'none',
  fontSize: 14,
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        marginBottom: 7,
        color: 'var(--text2)',
        fontSize: 12,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0,
      }}
    >
      {children}
    </label>
  )
}

export function AccountantLeadForm({
  source = 'para-contadores',
  intent = 'waitlist',
}: {
  source?: string
  intent?: AccountantLeadIntent
}) {
  const intentConfig = getAccountantLeadIntentConfig(intent)
  const [state, setState] = useState<FormState>('idle')
  const [error, setError] = useState('')
  const [preselectedPlan, setPreselectedPlan] = useState<string | null>(null)
  const [form, setForm] = useState({
    nomeEscritorio: '',
    email: '',
    telefone: '',
    carteiraRange: intentConfig.defaultCarteiraRange as string,
    ferramentaAtual: 'Planilha',
    consentimentoLgpd: false,
  })

  // Pré-seleção via clique nos planos da ContadoresSection.
  // sessionStorage só existe no client, então usamos useEffect ao montar.
  // A regra react-hooks/set-state-in-effect é suprimida porque a leitura
  // depende de API do browser indisponível durante SSR — usar lazy init do
  // useState criaria mismatch de hidratação entre server e client.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('accountantPreselect')
      if (!raw) return
      const parsed = JSON.parse(raw) as { plan?: string; carteiraRange?: string }
      if (parsed.carteiraRange && ALLOWED_RANGES.has(parsed.carteiraRange as typeof ACCOUNTANT_CLIENT_RANGES[number])) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm(current => ({ ...current, carteiraRange: parsed.carteiraRange! }))
      }
      if (parsed.plan) setPreselectedPlan(parsed.plan)
      sessionStorage.removeItem('accountantPreselect')
    } catch {}
  }, [])

  function setValue(name: keyof typeof form, value: string | boolean) {
    setForm(current => ({ ...current, [name]: value }))
    setError('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setState('submitting')

    const response = await fetch('/api/accountant-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setState('idle')
      setError(payload?.error ?? 'Não foi possível registrar o interesse agora.')
      return
    }

    captureProductEvent('accountant_signup_interest', {
      source,
      carteira_range: form.carteiraRange,
      ferramenta_atual: form.ferramentaAtual,
      plano_interesse: preselectedPlan ?? null,
    })
    setState('sent')
  }

  if (state === 'sent') {
    return (
      <div style={{
        border: '1px solid var(--tint-lime-border)',
        background: 'var(--tint-lime)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
      }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>✓</div>
        <div style={{ color: 'var(--lime)', fontWeight: 800, marginBottom: 6 }}>
          {intentConfig.sentTitle}
        </div>
        <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>
          {intentConfig.sentMessage}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
      {preselectedPlan && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px',
          background: 'var(--tint-orange)',
          border: '1px solid var(--tint-orange-strong)',
          borderRadius: 'var(--radius)',
          fontSize: 12, color: 'var(--orange)',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Plano selecionado: <strong>{preselectedPlan}</strong></span>
        </div>
      )}

      <div>
        <Label htmlFor="accountant-office-name">Nome do escritório</Label>
        <input
          id="accountant-office-name"
          value={form.nomeEscritorio}
          onChange={event => setValue('nomeEscritorio', event.target.value)}
          placeholder="Ex.: Prime Contabilidade"
          required
          style={fieldStyle}
        />
      </div>

      <div>
        <Label htmlFor="accountant-email">E-mail profissional</Label>
        <input
          id="accountant-email"
          type="email"
          value={form.email}
          onChange={event => setValue('email', event.target.value)}
          placeholder="contato@escritorio.com.br"
          required
          style={fieldStyle}
        />
      </div>

      <div>
        <Label htmlFor="accountant-phone">WhatsApp</Label>
        <input
          id="accountant-phone"
          value={form.telefone}
          onChange={event => setValue('telefone', event.target.value)}
          placeholder="(11) 99999-9999"
          style={fieldStyle}
        />
      </div>

      <div className="accountant-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label htmlFor="accountant-client-range">Carteira MEI</Label>
          <select
            id="accountant-client-range"
            value={form.carteiraRange}
            onChange={event => setValue('carteiraRange', event.target.value)}
            style={fieldStyle}
          >
            {ACCOUNTANT_CLIENT_RANGES.map(range => (
              <option key={range} value={range}>{range} clientes</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="accountant-tool">Controle atual</Label>
          <select
            id="accountant-tool"
            value={form.ferramentaAtual}
            onChange={event => setValue('ferramentaAtual', event.target.value)}
            style={fieldStyle}
          >
            {ACCOUNTANT_TOOL_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <label htmlFor="accountant-consent" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input
          id="accountant-consent"
          type="checkbox"
          checked={form.consentimentoLgpd}
          onChange={event => setValue('consentimentoLgpd', event.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
          Concordo com a <a href="/privacidade" style={{ color: 'var(--lime)' }}>política de privacidade</a> e autorizo contato comercial sobre o plano contador.
        </span>
      </label>

      {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}

      <button
        type="submit"
        disabled={state === 'submitting'}
        style={{
          minHeight: 48,
          borderRadius: 'var(--radius)',
          background: 'var(--lime)',
          color: 'var(--ink-on-accent)',
          fontSize: 14,
          fontWeight: 900,
          opacity: state === 'submitting' ? 0.72 : 1,
        }}
      >
        {state === 'submitting' ? intentConfig.submittingLabel : intentConfig.submitLabel}
      </button>
    </form>
  )
}
