'use client'

import { FormEvent, Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AuthAlert, AuthCard, AuthPage } from '@/components/auth/AuthScaffold'
import { createClient } from '@/lib/supabase/client'
import { getAuthCallbackOrigin } from '@/lib/auth/origin'

type ResetState = 'idle' | 'loading' | 'sent' | 'error'

function RecuperarSenhaForm() {
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'
  const [email, setEmail] = useState('')
  const [state, setState] = useState<ResetState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setState('loading')
    setErrorMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAuthCallbackOrigin()}/auth/atualizar-senha?next=${encodeURIComponent(next)}`,
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
        <Link href={next === '/dashboard' ? '/auth/login' : `/auth/login?next=${encodeURIComponent(next)}`} className="auth-link">
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

export default function RecuperarSenhaPage() {
  return (
    <Suspense fallback={
      <main className="auth-page">
        <span className="auth-copy">Carregando...</span>
      </main>
    }>
      <RecuperarSenhaForm />
    </Suspense>
  )
}
