'use client'

import { useState } from 'react'

interface FolhaInputProps {
  value: number
  onChange: (next: number) => void
  disabled?: boolean
  ariaLabel?: string
}

interface InputState {
  text: string
  syncedValue: number
  focused: boolean
}

/**
 * Numeric input formatado em pt-BR (BRL sem símbolo) com parse no blur.
 * Sincroniza bidirecional via prop value/onChange — se o pai mudar `value`
 * (por exemplo via slider), o texto exibido reflete o novo valor.
 *
 * Comportamento de blur:
 *   - parse válido (>= 0, finito) → commit via onChange + re-formata
 *   - inválido (NaN, negativo) → revert pra `value` atual
 */
export function FolhaInput({ value, onChange, disabled, ariaLabel }: FolhaInputProps) {
  const [state, setState] = useState<InputState>(() => ({
    text: formatBRL(value),
    syncedValue: value,
    focused: false,
  }))

  // "Derived state" pattern (React docs): se o `value` externo mudou e o
  // usuário não está editando, re-deriva o texto durante o render — sem
  // useEffect e sem cascading renders.
  if (!state.focused && !Object.is(value, state.syncedValue)) {
    setState({ text: formatBRL(value), syncedValue: value, focused: false })
  }

  function handleBlur() {
    const parsed = parseBRL(state.text)
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChange(parsed)
      setState({ text: formatBRL(parsed), syncedValue: parsed, focused: false })
    } else {
      setState({ text: formatBRL(value), syncedValue: value, focused: false })
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ color: 'var(--text2)', fontSize: 14 }}>R$</span>
      <input
        type="text"
        inputMode="decimal"
        value={state.text}
        onChange={e => setState(s => ({ ...s, text: e.target.value }))}
        onFocus={() => setState(s => ({ ...s, focused: true }))}
        onBlur={handleBlur}
        disabled={disabled}
        aria-label={ariaLabel ?? 'Folha mensal em reais'}
        style={{
          width: 130,
          padding: '8px 10px',
          textAlign: 'right',
          fontSize: 18,
          fontWeight: 700,
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text1)',
          fontFamily: 'var(--mono)',
        }}
      />
      <span style={{ color: 'var(--text3)', fontSize: 12 }}>/mês</span>
    </div>
  )
}

function formatBRL(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

/**
 * Parse pt-BR number string: "1.234,56" → 1234.56.
 * Retorna NaN em entrada inválida ou negativa.
 */
export function parseBRL(s: string): number {
  if (typeof s !== 'string' || s.trim() === '') return NaN
  const cleaned = s.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return NaN
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : NaN
}
