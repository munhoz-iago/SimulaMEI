'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BRAZIL_UF_OPTIONS } from '@/constants/onboarding'
import { CnaeAutocomplete } from '@/components/simulador/CnaeAutocomplete'
import { getCnae } from '@/lib/tributario'
import type { CnaeInfo } from '@/types/tributario'
import type { OfficeClientRecord } from '@/lib/accountant/server'

interface OfficeClientFormProps {
  mode: 'create' | 'edit'
  client?: OfficeClientRecord
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

const inputStyle = {
  width: '100%',
  height: 44,
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--bg2)',
  color: 'var(--text1)',
  padding: '0 12px',
  outline: 'none',
} as const

const labelStyle = {
  display: 'grid',
  gap: 7,
  color: 'var(--text2)',
  fontSize: 13,
  fontWeight: 800,
} as const

export function OfficeClientForm({ mode, client }: OfficeClientFormProps) {
  const router = useRouter()
  const [nome, setNome] = useState(client?.name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  // CNAE agora vem do autocomplete — pre-popula em edição via getCnae()
  const initialCnae = client?.cnae ? getCnae(client.cnae) ?? null : null
  const [cnaeInfo, setCnaeInfo] = useState<CnaeInfo | null>(initialCnae)
  const cnae = cnaeInfo?.cnae ?? ''
  const [tipoMei, setTipoMei] = useState(client?.tipo_mei ?? 'geral')
  const [uf, setUf] = useState(client?.uf ?? '')
  const [municipio, setMunicipio] = useState(client?.municipio ?? '')
  const [observacoes, setObservacoes] = useState(client?.observacoes ?? '')
  const [state, setState] = useState<SubmitState>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cnae) {
      setError('Selecione um CNAE da lista para continuar.')
      setState('error')
      return
    }
    setState('loading')
    setError('')

    const endpoint = mode === 'create'
      ? '/api/accountant/clients'
      : `/api/accountant/clients/${client?.id}`

    const response = await fetch(endpoint, {
      method: mode === 'create' ? 'POST' : 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nome,
        email,
        cnae,
        tipoMei,
        uf,
        municipio,
        observacoes,
      }),
    })
    const data = await response.json()

    if (!response.ok) {
      setState('error')
      setError(data.error ?? 'Não foi possível salvar o cliente.')
      return
    }

    setState('success')
    router.push(`/contador/clientes/${data.client.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
      <div className="accountant-form-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
        <label htmlFor="office-client-name" style={labelStyle}>
          Nome do cliente
          <input id="office-client-name" value={nome} onChange={event => setNome(event.target.value)} required maxLength={160} style={inputStyle} />
        </label>
        <label htmlFor="office-client-email" style={labelStyle}>
          E-mail
          <input id="office-client-email" type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} style={inputStyle} />
        </label>
      </div>

      <div style={labelStyle}>
        <label htmlFor="office-client-cnae">CNAE</label>
        <CnaeAutocomplete
          inputId="office-client-cnae"
          value={cnaeInfo}
          onChange={(next) => {
            setCnaeInfo(next)
            // Auto-detecta MEI caminhoneiro pelo código
            if (next?.cnae === '4930-2/02') setTipoMei('caminhoneiro')
            else if (cnaeInfo?.cnae === '4930-2/02' && next?.cnae !== '4930-2/02') setTipoMei('geral')
          }}
          origin="contador-clientes-novo"
        />
        <p style={{ fontSize: 11, color: 'var(--text3)', margin: '4px 0 0', fontWeight: 500 }}>
          Busque pelo código (ex: 6201-5/01) ou descrição da atividade. 1.331 CNAEs oficiais cadastrados.
        </p>
      </div>

      <div className="accountant-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <label htmlFor="office-client-tipo" style={labelStyle}>
          Tipo de MEI
          <select id="office-client-tipo" value={tipoMei} onChange={event => setTipoMei(event.target.value)} style={inputStyle}>
            <option value="geral">MEI geral</option>
            <option value="caminhoneiro">MEI caminhoneiro</option>
          </select>
        </label>
        <label htmlFor="office-client-uf" style={labelStyle}>
          UF
          <select id="office-client-uf" value={uf} onChange={event => setUf(event.target.value)} style={inputStyle}>
            <option value="">Selecione</option>
            {BRAZIL_UF_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      <label htmlFor="office-client-city" style={labelStyle}>
        Município
        <input id="office-client-city" value={municipio} onChange={event => setMunicipio(event.target.value)} maxLength={120} style={inputStyle} />
      </label>

      <label htmlFor="office-client-notes" style={labelStyle}>
        Observações
        <textarea
          id="office-client-notes"
          value={observacoes}
          onChange={event => setObservacoes(event.target.value)}
          maxLength={600}
          rows={4}
          style={{ ...inputStyle, height: 'auto', paddingTop: 11, resize: 'vertical' }}
        />
      </label>

      {error ? (
        <div role="alert" style={{ border: '1px solid rgba(255, 91, 91, .35)', background: 'rgba(255, 91, 91, .1)', color: '#ffb4b4', borderRadius: 'var(--radius)', padding: 12, fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="submit"
          disabled={state === 'loading'}
          style={{
            border: 0,
            borderRadius: 'var(--radius)',
            background: 'var(--lime)',
            color: 'var(--ink-on-accent)',
            padding: '11px 15px',
            fontWeight: 950,
            cursor: state === 'loading' ? 'wait' : 'pointer',
          }}
        >
          {state === 'loading' ? 'Salvando...' : mode === 'create' ? 'Cadastrar cliente' : 'Salvar alterações'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/contador/clientes')}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--bg2)',
            color: 'var(--text1)',
            padding: '11px 15px',
            fontWeight: 850,
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
