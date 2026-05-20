'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthAlert, AuthCard, AuthPage } from '@/components/auth/AuthScaffold'
import { createClient } from '@/lib/supabase/client'

type UpdateState = 'checking' | 'idle' | 'loading' | 'success' | 'error'

function AtualizarSenhaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [state, setState] = useState<UpdateState>('checking')
  const [errorMessage, setErrorMessage] = useState('')
  const recoveryLinkInvalid =
    errorMessage === 'O link de recuperação expirou ou já foi utilizado.' ||
    errorMessage === 'Abra o link de recuperação enviado por e-mail para definir uma nova senha.'

  useEffect(() => {
    let active = true

    async function prepareRecoverySession() {
      const supabase = createClient()
      const code = searchParams.get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!active) return

        if (error) {
          setErrorMessage('O link de recuperação expirou ou já foi utilizado.')
          setState('error')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return

      if (!session) {
        setErrorMessage('Abra o link de recuperação enviado por e-mail para definir uma nova senha.')
        setState('error')
        return
      }

      setState('idle')
    }

    prepareRecoverySession()

    return () => {
      active = false
    }
  }, [searchParams])

  useEffect(() => {
    if (state !== 'success') return

    const timeoutId = window.setTimeout(() => {
      router.replace(next)
      router.refresh()
    }, 1200)

    return () => window.clearTimeout(timeoutId)
  }, [next, router, state])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorMessage('')

    if (senha.length < 8) {
      setErrorMessage('Use uma senha com pelo menos 8 caracteres.')
      setState('error')
      return
    }

    if (senha !== confirmacao) {
      setErrorMessage('As senhas informadas não conferem.')
      setState('error')
      return
    }

    setState('loading')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: senha })

    if (error) {
      setErrorMessage(error.message)
      setState('error')
      return
    }

    setState('success')
  }

  return (
    <AuthPage>
      <AuthCard maxWidth={440}>
        <Link href={next === '/dashboard' ? '/auth/login' : `/auth/login?next=${encodeURIComponent(next)}`} className="auth-link">
          Voltar para entrar
        </Link>
        <h1 className="auth-title" style={{ marginTop: 22 }}>
          Definir nova senha
        </h1>
        <p className="auth-copy" style={{ marginBottom: 24 }}>
          Crie uma senha forte para proteger seu histórico de simulações e relatórios fiscais.
        </p>

        {state === 'checking' && (
          <AuthAlert tone="neutral">
            Validando link seguro...
          </AuthAlert>
        )}

        {state === 'success' ? (
          <div className="auth-form">
            <AuthAlert tone="success">
              Senha atualizada com sucesso. Redirecionando...
            </AuthAlert>
            <Link href={next} className="auth-primary-button">
              {next === '/dashboard' ? 'Ir para o painel' : 'Ir para seu destino'}
            </Link>
          </div>
        ) : recoveryLinkInvalid ? (
          <div className="auth-form">
            <AuthAlert tone="error">
              {errorMessage}
            </AuthAlert>
            <Link href="/auth/recuperar" className="auth-secondary-button">
              Solicitar novo link
            </Link>
          </div>
        ) : state !== 'checking' && (
          <form onSubmit={handleSubmit} className="auth-form" style={{ gap: 14 }}>
            <div className="auth-field">
              <label htmlFor="update-password-new" className="auth-label">
                Nova senha
              </label>
              <input
                id="update-password-new"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={event => setSenha(event.target.value)}
                required
                minLength={8}
                placeholder="Mínimo de 8 caracteres"
                className="auth-input"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="update-password-confirm" className="auth-label">
                Confirmar senha
              </label>
              <input
                id="update-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={event => setConfirmacao(event.target.value)}
                required
                minLength={8}
                placeholder="Repita a nova senha"
                className="auth-input"
              />
            </div>

            {state === 'error' && errorMessage && (
              <AuthAlert tone="error">
                {errorMessage}
              </AuthAlert>
            )}

            <button
              type="submit"
              disabled={state === 'loading'}
              className="auth-primary-button"
            >
              {state === 'loading' ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        )}
      </AuthCard>
    </AuthPage>
  )
}

export default function AtualizarSenhaPage() {
  return (
    <Suspense fallback={
      <main className="auth-page">
        <span className="auth-copy">Carregando...</span>
      </main>
    }>
      <AtualizarSenhaForm />
    </Suspense>
  )
}
