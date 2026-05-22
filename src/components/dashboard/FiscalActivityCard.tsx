'use client'

import { useId, useRef, useState } from 'react'
import type { UserProfileOnboarding } from '@/lib/onboarding'
import type { CnaeInfo, TipoMei } from '@/types/tributario'
import { getCnae } from '@/lib/tributario'
import { ONBOARDING_TEXT_LIMITS } from '@/lib/validation'
import { CnaeAutocomplete } from '@/components/simulador/CnaeAutocomplete'
import { ProfileEditCard } from './ProfileEditCard'

interface FiscalActivityCardProps {
  profile: Pick<UserProfileOnboarding, 'cnae_principal' | 'tipo_mei' | 'municipio' | 'uf'> | null
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text3)',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border2)',
  background: 'var(--bg2)',
  color: 'var(--text1)',
  fontSize: 14,
  fontFamily: 'var(--sans, inherit)',
}

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr',
  gap: 10,
  alignItems: 'baseline',
}

const rowLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text3)',
}

const rowValueStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text1)',
  wordBreak: 'break-word',
}

const TIPO_MEI_LABEL: Record<TipoMei, string> = {
  geral: 'MEI geral',
  caminhoneiro: 'MEI caminhoneiro',
}

export function FiscalActivityCard({ profile }: FiscalActivityCardProps) {
  const municipioId = useId()
  const ufId = useId()
  const tipoMeiName = useId()
  const cnaeInputId = useId()

  // Estado controlado pro CnaeAutocomplete (componente exige value/onChange).
  const initialCnae = profile?.cnae_principal ? getCnae(profile.cnae_principal) : null
  const [cnaeValue, setCnaeValue] = useState<CnaeInfo | null>(initialCnae ?? null)
  const [tipoMei, setTipoMei] = useState<TipoMei>(profile?.tipo_mei ?? 'geral')

  const municipioRef = useRef<HTMLInputElement>(null)
  const ufRef = useRef<HTMLInputElement>(null)

  const view = (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>CNAE</span>
        <span style={rowValueStyle}>
          {profile?.cnae_principal ?? '—'}
          {initialCnae && (
            <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text3)', marginTop: 2 }}>
              {initialCnae.descricao}
            </span>
          )}
        </span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Tipo MEI</span>
        <span style={rowValueStyle}>
          {profile?.tipo_mei ? TIPO_MEI_LABEL[profile.tipo_mei] : '—'}
        </span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Município</span>
        <span style={rowValueStyle}>{profile?.municipio ?? '—'}</span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>UF</span>
        <span style={rowValueStyle}>{profile?.uf ?? '—'}</span>
      </div>
    </div>
  )

  const edit = (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <label htmlFor={cnaeInputId} style={labelStyle}>CNAE principal</label>
        <CnaeAutocomplete
          value={cnaeValue}
          onChange={setCnaeValue}
          inputId={cnaeInputId}
          origin="/dashboard?aba=conta"
        />
      </div>

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ ...labelStyle, marginBottom: 8 }}>Tipo MEI</legend>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="radio"
              name={tipoMeiName}
              value="geral"
              checked={tipoMei === 'geral'}
              onChange={() => setTipoMei('geral')}
            />
            MEI geral
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="radio"
              name={tipoMeiName}
              value="caminhoneiro"
              checked={tipoMei === 'caminhoneiro'}
              onChange={() => setTipoMei('caminhoneiro')}
            />
            MEI caminhoneiro
          </label>
        </div>
      </fieldset>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
        <div>
          <label htmlFor={municipioId} style={labelStyle}>Município</label>
          <input
            ref={municipioRef}
            id={municipioId}
            type="text"
            defaultValue={profile?.municipio ?? ''}
            maxLength={ONBOARDING_TEXT_LIMITS.municipio}
            autoComplete="address-level2"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor={ufId} style={labelStyle}>UF</label>
          <input
            ref={ufRef}
            id={ufId}
            type="text"
            defaultValue={profile?.uf ?? ''}
            maxLength={2}
            autoComplete="address-level1"
            style={{ ...inputStyle, textTransform: 'uppercase' }}
            placeholder="SP"
          />
        </div>
      </div>
    </div>
  )

  function collectPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {}

    const newCnae = cnaeValue?.cnae ?? null
    if (newCnae && newCnae !== profile?.cnae_principal) {
      payload.cnaePrincipal = newCnae
    }

    if (tipoMei !== (profile?.tipo_mei ?? 'geral')) {
      payload.tipoMei = tipoMei
    }

    const municipio = municipioRef.current?.value.trim() ?? ''
    if (municipio !== (profile?.municipio ?? '')) {
      payload.municipio = municipio
    }

    const ufRaw = ufRef.current?.value.trim().toUpperCase() ?? ''
    if (ufRaw !== (profile?.uf ?? '')) {
      payload.uf = ufRaw
    }

    return payload
  }

  function validate(payload: Record<string, unknown>): string | null {
    if (Object.keys(payload).length === 0) {
      return 'Nenhuma alteração para salvar.'
    }
    if (payload.cnaePrincipal !== undefined && !cnaeValue) {
      return 'Selecione um CNAE válido na lista.'
    }
    if (payload.uf !== undefined) {
      const uf = String(payload.uf)
      if (!/^[A-Z]{2}$/.test(uf)) {
        return 'UF deve ter 2 letras.'
      }
    }
    if (payload.municipio !== undefined && (typeof payload.municipio !== 'string' || payload.municipio.length === 0)) {
      return 'Município não pode ficar em branco.'
    }
    return null
  }

  return (
    <ProfileEditCard
      title="Atividade fiscal"
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 9h6v6H9z" />
        </svg>
      }
      accentColor="var(--lime)"
      viewContent={view}
      editContent={edit}
      onCollectPayload={collectPayload}
      onValidate={validate}
      sectionKey="fiscal"
    />
  )
}
