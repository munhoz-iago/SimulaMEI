'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { AuthAlert, AuthCard, AuthPage } from '@/components/auth/AuthScaffold'
import { createClient } from '@/lib/supabase/client'

type ResetState = 'idle' | 'loading' | 'sent' | 'error'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<ResetState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setState('loading')
    setErrorMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/atualizar-senha`,
    })

    if (error) {
      setErrorMessage(error.message)
      setState('error')
      return
    }

    setState('sent')
  }

  return (
    <AuthPage>
      <AuthCard>
        <Link href="/auth/login" className="auth-link">
          Voltar para entrar
        </Link>
        <h1 className="auth-title" style={{ marginTop: 22 }}>
          Recuperar senha
        </h1>
        <p className="auth-copy" style={{ marginBottom: 24 }}>
          Informe seu e-mail e enviaremos um link seguro para redefinir a senha da sua conta.
        </p>

        {state === 'sent' ? (
          <AuthAlert tone="success">
            Link enviado. Confira sua caixa de entrada e spam.
          </AuthAlert>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" style={{ gap: 14 }}>
            <div className="auth-field">
              <label htmlFor="recover-email" className="auth-label">
                E-mail
              </label>
              <input
                id="recover-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                placeholder="voce@email.com"
                className="auth-input"
              />
            </div>
            {state === 'error' && (
              <AuthAlert tone="error">
                {errorMessage}
              </AuthAlert>
            )}
            <button
              type="submit"
              disabled={state === 'loading'}
              className="auth-primary-button"
            >
              {state === 'loading' ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}
      </AuthCard>
    </AuthPage>
  )
}
