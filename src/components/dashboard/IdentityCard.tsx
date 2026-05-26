'use client'

import { useId, useRef } from 'react'
import type { UserProfileOnboarding } from '@/lib/onboarding'
import { ONBOARDING_TEXT_LIMITS } from '@/lib/validation'
import { ProfileEditCard } from './ProfileEditCard'
import {
  profileCardInput as inputStyle,
  profileCardLabel as labelStyle,
  profileCardRow,
  profileCardRowLabel as rowLabelStyle,
  profileCardRowValue as rowValueStyle,
} from './profile-card-styles'

interface IdentityCardProps {
  profile: Pick<UserProfileOnboarding, 'nome' | 'nome_negocio' | 'telefone'> | null
  /** Email do auth — read-only, exibido apenas com nota informativa. */
  email: string
}

const rowStyle: React.CSSProperties = {
  ...profileCardRow('120px'),
  fontSize: 13,
  color: 'var(--text2)',
}

export function IdentityCard({ profile, email }: IdentityCardProps) {
  const nomeId = useId()
  const negocioId = useId()
  const telefoneId = useId()

  const nomeRef = useRef<HTMLInputElement>(null)
  const negocioRef = useRef<HTMLInputElement>(null)
  const telefoneRef = useRef<HTMLInputElement>(null)

  const view = (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Nome</span>
        <span style={rowValueStyle}>{profile?.nome ?? '—'}</span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Negócio</span>
        <span style={rowValueStyle}>{profile?.nome_negocio ?? '—'}</span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Telefone</span>
        <span style={rowValueStyle}>{profile?.telefone ?? '—'}</span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>E-mail</span>
        <span style={{ ...rowValueStyle, color: 'var(--text2)' }}>{email}</span>
      </div>
    </div>
  )

  const edit = (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <label htmlFor={nomeId} style={labelStyle}>Nome</label>
        <input
          ref={nomeRef}
          id={nomeId}
          type="text"
          defaultValue={profile?.nome ?? ''}
          maxLength={ONBOARDING_TEXT_LIMITS.nome}
          autoComplete="name"
          style={inputStyle}
        />
      </div>
      <div>
        <label htmlFor={negocioId} style={labelStyle}>Nome do negócio</label>
        <input
          ref={negocioRef}
          id={negocioId}
          type="text"
          defaultValue={profile?.nome_negocio ?? ''}
          maxLength={ONBOARDING_TEXT_LIMITS.nomeNegocio}
          autoComplete="organization"
          style={inputStyle}
        />
      </div>
      <div>
        <label htmlFor={telefoneId} style={labelStyle}>Telefone</label>
        <input
          ref={telefoneRef}
          id={telefoneId}
          type="tel"
          defaultValue={profile?.telefone ?? ''}
          maxLength={ONBOARDING_TEXT_LIMITS.telefone}
          autoComplete="tel"
          inputMode="tel"
          style={inputStyle}
        />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
        E-mail (<strong style={{ color: 'var(--text2)' }}>{email}</strong>) só pode ser alterado
        pelo suporte — escreva pra iagomunhoz48@gmail.com.
      </div>
    </div>
  )

  function collectPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    const nome = nomeRef.current?.value.trim()
    const negocio = negocioRef.current?.value.trim()
    const telefone = telefoneRef.current?.value.trim()

    // Só envia campos que mudaram em relação ao profile carregado.
    if (nome !== undefined && nome !== (profile?.nome ?? '')) payload.nome = nome
    if (negocio !== undefined && negocio !== (profile?.nome_negocio ?? '')) payload.nomeNegocio = negocio
    if (telefone !== undefined && telefone !== (profile?.telefone ?? '')) payload.telefone = telefone

    return payload
  }

  function validate(payload: Record<string, unknown>): string | null {
    if (Object.keys(payload).length === 0) {
      return 'Nenhuma alteração para salvar.'
    }
    if (payload.nome !== undefined && (typeof payload.nome !== 'string' || payload.nome.length === 0)) {
      return 'Nome não pode ficar em branco.'
    }
    if (payload.telefone !== undefined && (typeof payload.telefone !== 'string' || payload.telefone.length < 8)) {
      return 'Telefone deve ter pelo menos 8 caracteres.'
    }
    return null
  }

  return (
    <ProfileEditCard
      title="Identidade"
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      }
      accentColor="var(--blue)"
      viewContent={view}
      editContent={edit}
      onCollectPayload={collectPayload}
      onValidate={validate}
      sectionKey="identity"
    />
  )
}
