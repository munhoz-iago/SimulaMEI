'use client'

import { useState, FormEvent, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthAlert, AuthCard, AuthDivider, AuthPage, GoogleIcon } from '@/components/auth/AuthScaffold'
import { createClient } from '@/lib/supabase/client'
import {
  getLoginErrorFeedback,
  getLoginQueryFeedback,
  getLoginReasonFeedback,
  getOAuthErrorMessage,
} from '@/lib/auth/messages'

type AuthStep = 'idle' | 'loading' | 'error' | 'success'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? '/dashboard'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'
  const queryErrorMessage = getLoginQueryFeedback(searchParams.get('error'))
  const queryReasonMessage = getLoginReasonFeedback(searchParams.get('reason'))

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [step, setStep] = useState<AuthStep>('idle')
  const [erro, setErro] = useState('')
  const [allowResendConfirmation, setAllowResendConfirmation] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false)
  const visibleError = erro || (step === 'idle' ? queryErrorMessage ?? '' : '')
  const isBusy = step === 'loading' || step === 'success' || isGoogleLoading

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStep('loading')
    setErro('')
    setInfoMessage('')
    setAllowResendConfirmation(false)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      const feedback = getLoginErrorFeedback(error.message)
      setErro(feedback.message)
      setAllowResendConfirmation(Boolean(feedback.allowResendConfirmation))
      setStep('error')
      return
    }

    setStep('success')
    router.push(next)
    router.refresh()
  }

  async function handleGoogleLogin() {
    setErro('')
    setInfoMessage('')
    setAllowResendConfirmation(false)
    setStep('loading')
    setIsGoogleLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })

    if (error) {
      setErro(getOAuthErrorMessage(error.message))
      setStep('error')
      setIsGoogleLoading(false)
    }
  }

  async function handleResendConfirmation() {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setErro('Informe o e-mail para reenviar a confirmação.')
      setStep('error')
      return
    }

    setIsResendingConfirmation(true)
    setInfoMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setErro('Não foi possível reenviar a confirmação agora. Tente novamente em instantes.')
      setStep('error')
      setIsResendingConfirmation(false)
      return
    }

    setInfoMessage('Se este e-mail estiver aguardando confirmação, um novo link foi enviado.')
    setIsResendingConfirmation(false)
  }

  return (
    <AuthPage>
      <AuthCard>
        <h1 className="auth-title">Entrar</h1>
        <p className="auth-copy" style={{ marginBottom: 28 }}>
          Acesse seu histórico de simulações e relatórios.
        </p>

        {(next.startsWith('/dashboard/simular') || next.startsWith('/dashboard/relatorio') || next === '/relatorio') && (
          <div style={{
            background: 'rgba(200,241,53,0.06)',
            border: '1px solid rgba(200,241,53,0.18)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            marginBottom: 20,
            fontSize: 13,
            color: 'var(--text2)',
            lineHeight: 1.55,
          }}>
            {next.startsWith('/dashboard/relatorio') || next === '/relatorio' ? (
              <>
                <strong style={{ color: 'var(--text1)', display: 'block', marginBottom: 6 }}>
                  Seu relatório fica pronto após o login
                </strong>
                Comparativo dos 4 regimes tributários &middot; score fiscal &middot; PDF para o contador &middot; histórico salvo.
                Sem custo, sem cartão.
              </>
            ) : (
              <>Ao entrar você libera: histórico de simulações, relatório completo dos 4 regimes e alertas mensais. Sem custo, sem cartão.</>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isBusy}
          className="auth-oauth-button"
        >
          <GoogleIcon />
          {isGoogleLoading ? 'Redirecionando...' : 'Continuar com Google'}
        </button>

        <AuthDivider />

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="login-email" className="auth-label">
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="voce@email.com"
              className={`auth-input ${visibleError ? 'auth-input-error' : ''}`}
            />
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="login-password" className="auth-label">
                Senha
              </label>
              <Link href={next === '/dashboard' ? '/auth/recuperar' : `/auth/recuperar?next=${encodeURIComponent(next)}`} className="auth-link">
                Esqueci a senha
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              placeholder="••••••••"
              className={`auth-input ${visibleError ? 'auth-input-error' : ''}`}
            />
          </div>

          {visibleError && (
            <AuthAlert tone="error">
              <div>{visibleError}</div>
              {allowResendConfirmation && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isResendingConfirmation}
                  className="auth-link"
                  style={{ marginTop: 10, opacity: isResendingConfirmation ? 0.7 : 1 }}
                >
                  {isResendingConfirmation ? 'Reenviando...' : 'Reenviar confirmação'}
                </button>
              )}
            </AuthAlert>
          )}

          {!visibleError && queryReasonMessage && (
            <AuthAlert tone="neutral">
              {queryReasonMessage}
            </AuthAlert>
          )}

          {infoMessage && (
            <AuthAlert tone="success">
              {infoMessage}
            </AuthAlert>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="auth-primary-button"
          >
            {step === 'loading' ? 'Entrando...' : step === 'success' ? 'Redirecionando...' : 'Entrar'}
          </button>
        </form>

        <p className="auth-footer">
          Não tem conta?{' '}
          <Link href="/auth/registro">
            Criar conta grátis
          </Link>
        </p>
      </AuthCard>
    </AuthPage>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="auth-page">
        <span className="auth-copy">Carregando...</span>
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}
