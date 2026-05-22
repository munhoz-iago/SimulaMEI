'use client'

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DELETE_CONFIRMATION, isDeleteInputValid } from './delete-account-validation'

type Mode = 'idle' | 'confirming' | 'loading'

export function DeleteAccountSection() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('idle')
  const [typed, setTyped] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const canConfirm = isDeleteInputValid(typed)

  function openConfirm() {
    setTyped('')
    setErrorMessage('')
    setMode('confirming')
  }

  function closeConfirm() {
    if (mode === 'loading') return
    setMode('idle')
    setTyped('')
    setErrorMessage('')
  }

  useEffect(() => {
    if (mode === 'confirming') {
      inputRef.current?.focus()
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'confirming') return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMode('idle')
        setTyped('')
        setErrorMessage('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  async function handleDelete() {
    if (!canConfirm) return
    setMode('loading')
    setErrorMessage('')

    const response = await fetch('/api/account/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmation: DELETE_CONFIRMATION }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null
      setErrorMessage(payload?.error ?? 'Não foi possível excluir a conta agora.')
      setMode('confirming')
      return
    }

    await createClient().auth.signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
        Exclui o perfil, simulações salvas, API keys e leads vinculados ao seu e-mail.
      </p>

      <button
        type="button"
        onClick={openConfirm}
        disabled={mode === 'loading'}
        style={{
          justifySelf: 'start',
          padding: '11px 14px',
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(255,74,74,0.28)',
          background: 'rgba(255,74,74,0.08)',
          color: 'var(--red)',
          fontSize: 13,
          fontWeight: 800,
          cursor: mode === 'loading' ? 'wait' : 'pointer',
          opacity: mode === 'loading' ? 0.7 : 1,
        }}
      >
        {mode === 'loading' ? 'Excluindo conta...' : 'Excluir conta'}
      </button>

      {mode !== 'idle' && (
        <DeleteAccountModal
          typed={typed}
          onTypedChange={setTyped}
          canConfirm={canConfirm}
          loading={mode === 'loading'}
          errorMessage={errorMessage}
          onConfirm={handleDelete}
          onCancel={closeConfirm}
          inputRef={inputRef}
        />
      )}
    </div>
  )
}

function DeleteAccountModal({
  typed,
  onTypedChange,
  canConfirm,
  loading,
  errorMessage,
  onConfirm,
  onCancel,
  inputRef,
}: {
  typed: string
  onTypedChange: (v: string) => void
  canConfirm: boolean
  loading: boolean
  errorMessage: string
  onConfirm: () => void
  onCancel: () => void
  inputRef: RefObject<HTMLInputElement | null>
}) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 100,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: 460,
          width: '90vw',
          background: 'var(--bg1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          zIndex: 101,
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="delete-account-title"
          style={{ color: 'var(--red)', fontSize: 18, margin: '0 0 8px' }}
        >
          Excluir conta
        </h3>
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
          Isso remove sua conta, chaves de API, simulações salvas e vínculos de leads.{' '}
          <strong>Esta ação não pode ser desfeita.</strong>
        </p>
        <label
          htmlFor="delete-confirm-input"
          style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}
        >
          Digite{' '}
          <code style={{ background: 'var(--bg2)', padding: '1px 6px', borderRadius: 3 }}>
            {DELETE_CONFIRMATION}
          </code>{' '}
          para confirmar:
        </label>
        <input
          ref={inputRef}
          id="delete-confirm-input"
          type="text"
          value={typed}
          onChange={(e) => onTypedChange(e.target.value)}
          disabled={loading}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border2)',
            background: 'var(--bg2)',
            color: 'var(--text1)',
            fontSize: 14,
            marginBottom: 16,
          }}
        />
        {errorMessage && (
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(255,74,74,0.08)',
              border: '1px solid rgba(255,74,74,0.2)',
              borderRadius: 'var(--radius)',
              color: 'var(--red)',
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {errorMessage}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border2)',
              background: 'transparent',
              color: 'var(--text1)',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || loading}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--red)',
              background: canConfirm ? 'var(--red)' : 'rgba(255,74,74,0.2)',
              color: canConfirm ? 'white' : 'var(--text3)',
              fontSize: 13,
              fontWeight: 800,
              cursor: canConfirm && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Excluindo...' : 'Excluir conta'}
          </button>
        </div>
      </div>
    </>
  )
}
