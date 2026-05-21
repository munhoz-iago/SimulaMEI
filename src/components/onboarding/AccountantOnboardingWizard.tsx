'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACCOUNTANT_CLIENT_RANGES, ACCOUNTANT_TOOL_OPTIONS } from '@/lib/accountant/leads'
import type { AccountantPaidPlan } from '@/lib/accountant/billing'

type SaveState = 'idle' | 'saving' | 'error'

const inputStyle: React.CSSProperties = {
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
    <label htmlFor={htmlFor} style={{
      display: 'block',
      marginBottom: 7,
      color: 'var(--text2)',
      fontSize: 12,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: 0,
    }}>
      {children}
    </label>
  )
}

export function AccountantOnboardingWizard({
  email,
  plan,
}: {
  email: string
  plan?: AccountantPaidPlan | null
}) {
  const router = useRouter()
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nomeEscritorio: '',
    cnpj: '',
    telefone: '',
    carteiraRange: '21-50',
    ferramentaAtual: 'Planilha',
    objetivo: 'Monitorar teto e relatórios dos clientes MEI',
  })

  function setValue(name: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [name]: value }))
    setError('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setState('saving')
    setError('')

    const response = await fetch('/api/accountant/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (!response.ok) {
      setState('error')
      setError(payload?.error ?? 'Não foi possível criar o escritório.')
      return
    }

    if (plan) {
      router.push(`/upgrade/contador?autocheckout=${plan}&plan=${plan}`)
    } else {
      router.push('/contador')
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} style={{
      border: '1px solid var(--border)',
      background: 'var(--bg1)',
      borderRadius: 'var(--radius-lg)',
      padding: 24,
      display: 'grid',
      gap: 16,
      maxWidth: 720,
    }}>
      <div style={{ color: 'var(--text3)', fontSize: 13 }}>
        Conta: <span style={{ color: 'var(--text2)' }}>{email}</span>
      </div>

      <div>
        <Label htmlFor="office-name">Nome do escritório</Label>
        <input
          id="office-name"
          value={form.nomeEscritorio}
          onChange={event => setValue('nomeEscritorio', event.target.value)}
          placeholder="Ex.: Prime Contabilidade"
          required
          style={inputStyle}
        />
      </div>

      <div className="accountant-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label htmlFor="office-cnpj">CNPJ opcional</Label>
          <input
            id="office-cnpj"
            value={form.cnpj}
            onChange={event => setValue('cnpj', event.target.value)}
            placeholder="00.000.000/0001-00"
            style={inputStyle}
          />
        </div>
        <div>
          <Label htmlFor="office-phone">WhatsApp</Label>
          <input
            id="office-phone"
            value={form.telefone}
            onChange={event => setValue('telefone', event.target.value)}
            placeholder="(11) 99999-9999"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="accountant-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label htmlFor="office-range">Clientes MEI gerenciados</Label>
          <select
            id="office-range"
            value={form.carteiraRange}
            onChange={event => setValue('carteiraRange', event.target.value)}
            style={inputStyle}
          >
            {ACCOUNTANT_CLIENT_RANGES.map(range => (
              <option key={range} value={range}>{range} clientes</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="office-tool">Controle atual</Label>
          <select
            id="office-tool"
            value={form.ferramentaAtual}
            onChange={event => setValue('ferramentaAtual', event.target.value)}
            style={inputStyle}
          >
            {ACCOUNTANT_TOOL_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="office-goal">Objetivo principal</Label>
        <input
          id="office-goal"
          value={form.objetivo}
          onChange={event => setValue('objetivo', event.target.value)}
          style={inputStyle}
        />
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}

      <button
        type="submit"
        disabled={state === 'saving'}
        style={{
          minHeight: 48,
          borderRadius: 'var(--radius)',
          background: 'var(--lime)',
          color: 'var(--ink-on-accent)',
          fontWeight: 900,
          opacity: state === 'saving' ? 0.72 : 1,
        }}
      >
        {state === 'saving' ? 'Criando escritório...' : 'Criar escritório contador'}
      </button>
    </form>
  )
}
