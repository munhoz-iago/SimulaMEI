'use client'

import { useState, type ReactNode, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Panel } from './Panel'
import { captureProductEvent } from '@/lib/analytics/events'

type Mode = 'view' | 'editing' | 'saving' | 'error'

export interface ProfileEditCardProps {
  /** Label all-caps que vira o eyebrow do painel. */
  title: string
  /** SVG icon renderizado dentro do quadradinho colorido. */
  icon: ReactNode
  /** CSS variable (ex.: 'var(--lime)') usada no badge e no botão Salvar. */
  accentColor: string
  /** Conteúdo do modo view — texto plano dos campos. */
  viewContent: ReactNode
  /** Conteúdo do modo editing — form com inputs/selects. */
  editContent: ReactNode
  /** Coleta os valores dos inputs e retorna payload. Campos undefined são ignorados. */
  onCollectPayload: () => Record<string, unknown>
  /** Valida localmente antes do PATCH. Return string com erro ou null pra prosseguir. */
  onValidate?: (payload: Record<string, unknown>) => string | null
  /** Telemetria — slug pro evento `profile_field_updated`. */
  sectionKey: 'identity' | 'fiscal' | 'operations'
}

/**
 * Wrapper genérico para painéis de edição na aba Conta. Implementa state machine
 * `view → editing → saving → error → view` com PATCH /api/profile.
 *
 * Não conhece os campos — recebe `viewContent` e `editContent` prontos do componente
 * específico, que também provê `onCollectPayload` (callback de coleta). Após save
 * bem-sucedido, dispara `router.refresh()` pra que o Server Component re-execute
 * com o profile atualizado.
 */
export function ProfileEditCard({
  title,
  icon,
  accentColor,
  viewContent,
  editContent,
  onCollectPayload,
  onValidate,
  sectionKey,
}: ProfileEditCardProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('view')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    const payload = onCollectPayload()
    const localError = onValidate?.(payload)
    if (localError) {
      setErrorMessage(localError)
      setMode('error')
      return
    }

    setMode('saving')
    setErrorMessage('')

    let response: Response
    try {
      response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      setErrorMessage('Falha de conexão. Verifique a internet e tente novamente.')
      setMode('error')
      return
    }

    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null
      setErrorMessage(data?.error ?? 'Não foi possível salvar agora.')
      setMode('error')
      return
    }

    const fieldsChanged = Object.keys(payload).filter(k => payload[k] !== undefined)
    captureProductEvent('profile_field_updated', {
      section: sectionKey,
      fields_changed: fieldsChanged,
    })

    setMode('view')
    router.refresh()
  }

  function startEdit() {
    setErrorMessage('')
    setMode('editing')
  }

  function cancelEdit() {
    if (mode === 'saving') return
    setErrorMessage('')
    setMode('view')
  }

  const isFormOpen = mode === 'editing' || mode === 'saving' || mode === 'error'

  return (
    <Panel style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: `${accentColor}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text3)',
            }}
          >
            {title}
          </div>
        </div>
        {mode === 'view' && (
          <button
            type="button"
            onClick={startEdit}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border2)',
              background: 'var(--bg2)',
              color: 'var(--text1)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Editar
          </button>
        )}
      </div>

      {mode === 'view' && viewContent}

      {isFormOpen && (
        <form onSubmit={handleSave}>
          {editContent}
          {mode === 'error' && errorMessage && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                background: 'rgba(255,74,74,0.08)',
                border: '1px solid rgba(255,74,74,0.2)',
                borderRadius: 'var(--radius)',
                color: 'var(--red)',
                fontSize: 13,
                marginTop: 12,
              }}
            >
              {errorMessage}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={mode === 'saving'}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border2)',
                background: 'transparent',
                color: 'var(--text1)',
                fontSize: 13,
                fontWeight: 700,
                cursor: mode === 'saving' ? 'not-allowed' : 'pointer',
                opacity: mode === 'saving' ? 0.6 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mode === 'saving'}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius)',
                border: '1px solid transparent',
                background: accentColor,
                color: 'var(--ink-on-accent, #0b0b0b)',
                fontSize: 13,
                fontWeight: 800,
                cursor: mode === 'saving' ? 'wait' : 'pointer',
                opacity: mode === 'saving' ? 0.85 : 1,
              }}
            >
              {mode === 'saving' ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </Panel>
  )
}
