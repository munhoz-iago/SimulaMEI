'use client'

import { useId, useRef, useState } from 'react'
import type { UserProfileOnboarding } from '@/lib/onboarding'
import { ONBOARDING_TEXT_LIMITS } from '@/lib/validation'
import { ProfileEditCard } from './ProfileEditCard'

interface OperationsCardProps {
  profile: Pick<
    UserProfileOnboarding,
    'faturamento_mensal_estimado' | 'faturamento_acumulado_atual' | 'folha_mensal' | 'mes_atual' | 'objetivo_principal'
  > | null
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
  gridTemplateColumns: '170px 1fr',
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

const MES_LABELS: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
  7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
}

function fmtBRL(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function parseNumberInput(raw: string | undefined): number | null {
  if (raw === undefined) return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  // Aceita "1.234,56" (BR) e "1234.56" (legacy)
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export function OperationsCard({ profile }: OperationsCardProps) {
  const fatMensalId = useId()
  const fatAcumId = useId()
  const folhaId = useId()
  const mesId = useId()
  const objetivoId = useId()

  const fatMensalRef = useRef<HTMLInputElement>(null)
  const fatAcumRef = useRef<HTMLInputElement>(null)
  const folhaRef = useRef<HTMLInputElement>(null)
  const objetivoRef = useRef<HTMLInputElement>(null)
  const [mesAtual, setMesAtual] = useState<number>(profile?.mes_atual ?? new Date().getMonth() + 1)

  const view = (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Faturamento mês</span>
        <span style={rowValueStyle}>{fmtBRL(profile?.faturamento_mensal_estimado)}</span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Acumulado ano</span>
        <span style={rowValueStyle}>{fmtBRL(profile?.faturamento_acumulado_atual)}</span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Folha mensal</span>
        <span style={rowValueStyle}>{fmtBRL(profile?.folha_mensal)}</span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Mês de referência</span>
        <span style={rowValueStyle}>
          {profile?.mes_atual ? MES_LABELS[profile.mes_atual] : '—'}
        </span>
      </div>
      <div style={rowStyle}>
        <span style={rowLabelStyle}>Objetivo</span>
        <span style={rowValueStyle}>{profile?.objetivo_principal ?? '—'}</span>
      </div>
    </div>
  )

  const edit = (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <label htmlFor={fatMensalId} style={labelStyle}>Faturamento mensal estimado (R$)</label>
        <input
          ref={fatMensalRef}
          id={fatMensalId}
          type="text"
          inputMode="decimal"
          defaultValue={profile?.faturamento_mensal_estimado?.toString() ?? ''}
          style={inputStyle}
          placeholder="0"
        />
      </div>
      <div>
        <label htmlFor={fatAcumId} style={labelStyle}>Faturamento acumulado no ano (R$)</label>
        <input
          ref={fatAcumRef}
          id={fatAcumId}
          type="text"
          inputMode="decimal"
          defaultValue={profile?.faturamento_acumulado_atual?.toString() ?? ''}
          style={inputStyle}
          placeholder="0"
        />
      </div>
      <div>
        <label htmlFor={folhaId} style={labelStyle}>Folha mensal (R$)</label>
        <input
          ref={folhaRef}
          id={folhaId}
          type="text"
          inputMode="decimal"
          defaultValue={profile?.folha_mensal?.toString() ?? ''}
          style={inputStyle}
          placeholder="0"
        />
      </div>
      <div>
        <label htmlFor={mesId} style={labelStyle}>Mês de referência</label>
        <select
          id={mesId}
          value={mesAtual}
          onChange={e => setMesAtual(Number(e.target.value))}
          style={inputStyle}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{MES_LABELS[m]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={objetivoId} style={labelStyle}>Objetivo principal</label>
        <input
          ref={objetivoRef}
          id={objetivoId}
          type="text"
          defaultValue={profile?.objetivo_principal ?? ''}
          maxLength={ONBOARDING_TEXT_LIMITS.objetivoPrincipal}
          style={inputStyle}
        />
      </div>
    </div>
  )

  function collectPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {}

    const fatMensal = parseNumberInput(fatMensalRef.current?.value)
    if (fatMensal !== null && fatMensal !== (profile?.faturamento_mensal_estimado ?? null)) {
      payload.faturamentoMensalEstimado = fatMensal
    }

    const fatAcum = parseNumberInput(fatAcumRef.current?.value)
    if (fatAcum !== null && fatAcum !== (profile?.faturamento_acumulado_atual ?? null)) {
      payload.faturamentoAcumuladoAtual = fatAcum
    }

    const folha = parseNumberInput(folhaRef.current?.value)
    if (folha !== null && folha !== (profile?.folha_mensal ?? null)) {
      payload.folhaMensal = folha
    }

    if (mesAtual !== (profile?.mes_atual ?? null)) {
      payload.mesAtual = mesAtual
    }

    const objetivo = objetivoRef.current?.value.trim() ?? ''
    if (objetivo !== (profile?.objetivo_principal ?? '')) {
      payload.objetivoPrincipal = objetivo
    }

    return payload
  }

  function validate(payload: Record<string, unknown>): string | null {
    if (Object.keys(payload).length === 0) {
      return 'Nenhuma alteração para salvar.'
    }
    const numericFields: Array<keyof typeof payload> = [
      'faturamentoMensalEstimado',
      'faturamentoAcumuladoAtual',
      'folhaMensal',
    ]
    for (const field of numericFields) {
      const v = payload[field]
      if (v !== undefined) {
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
          return 'Valores monetários devem ser números maiores ou iguais a zero.'
        }
      }
    }
    if (payload.objetivoPrincipal !== undefined && (typeof payload.objetivoPrincipal !== 'string' || payload.objetivoPrincipal.length === 0)) {
      return 'Objetivo não pode ficar em branco.'
    }
    return null
  }

  return (
    <ProfileEditCard
      title="Operação"
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      }
      accentColor="var(--yellow)"
      viewContent={view}
      editContent={edit}
      onCollectPayload={collectPayload}
      onValidate={validate}
      sectionKey="operations"
    />
  )
}
