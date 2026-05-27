'use client'

import { useState, FormEvent, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthAlert, AuthCard, AuthDivider, AuthPage, GoogleIcon } from '@/components/auth/AuthScaffold'
import { createClient } from '@/lib/supabase/client'
import { getOAuthErrorMessage, getSignupSubmissionFeedback } from '@/lib/auth/messages'
import { getAuthCallbackOrigin } from '@/lib/auth/origin'
import { sanitizeNextParam } from '@/lib/auth/safe-redirect'

type AuthStep = 'idle' | 'loading' | 'error' | 'success'

function RegistroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = sanitizeNextParam(searchParams.get('next'), '/')

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [step, setStep] = useState<AuthStep>('idle')
  const [erro, setErro] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const passwordsMismatch = Boolean(confirmar && confirmar !== senha)
  const isBusy = step === 'loading' || isGoogleLoading

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setSuccessMessage('')

    if (senha !== confirmar) {
      setErro('As senhas não coincidem.')
      setStep('error')
      return
    }
    if (senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.')
      setStep('error')
      return
    }

    setStep('loading')
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${getAuthCallbackOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (data.session) {
      router.push(next)
      router.refresh()
      return
    }

    const feedback = getSignupSubmissionFeedback(error?.message)
    if (feedback.status === 'error') {
      setErro(feedback.message)
      setStep('error')
      return
    }

    setSuccessMessage(feedback.message)
    setStep('success')
  }

  async function handleGoogleLogin() {
    setErro('')
    setSuccessMessage('')
    setStep('loading')
    setIsGoogleLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${getAuthCallbackOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
    })

    if (error) {
      setErro(getOAuthErrorMessage(error.message))
      setStep('error')
      setIsGoogleLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <AuthPage>
        <AuthCard>
          <div style={{ textAlign: 'center' }}>
            <div className="auth-success-mark" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="auth-title">Verifique seu e-mail</h1>
            <p className="auth-copy" style={{ marginBottom: 12 }}>
              {successMessage}
            </p>
            <p className="auth-copy" style={{ color: 'var(--text3)', marginBottom: 28 }}>
              Confira sua caixa de entrada e a pasta de spam para concluir o acesso.
            </p>
            <Link href="/auth/login" className="auth-secondary-button">
              Voltar ao início
            </Link>
          </div>
        </AuthCard>
      </AuthPage>
    )
  }

  return (
    <AuthPage>
      <AuthCard>
        <h1 className="auth-title">Criar conta grátis</h1>
        <p className="auth-copy" style={{ marginBottom: 28 }}>
          Salve suas simulações e acesse relatórios completos.
        </p>

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
            <label htmlFor="register-email" className="auth-label">
              E-mail
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="voce@email.com"
              className="auth-input"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-password" className="auth-label">
              Senha
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              placeholder="Mínimo 8 caracteres"
              className="auth-input"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="register-password-confirm" className="auth-label">
              Confirmar senha
            </label>
            <input
              id="register-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              required
              placeholder="••••••••"
              className={`auth-input ${passwordsMismatch ? 'auth-input-error' : ''}`}
            />
            {passwordsMismatch && (
              <p className="auth-password-hint">Senhas não coincidem</p>
            )}
          </div>

          {step === 'error' && erro && (
            <AuthAlert tone="error">
              {erro}
            </AuthAlert>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="auth-primary-button"
          >
            {step === 'loading' ? 'Criando conta...' : 'Criar conta grátis'}
          </button>
        </form>

        <p className="auth-footer" style={{ fontSize: 12, marginTop: 20 }}>
          Ao criar uma conta, você concorda com os{' '}
          <Link href="/termos" style={{ color: 'var(--text2)' }}>Termos de Uso</Link>
          {' '}e a{' '}
          <Link href="/privacidade" style={{ color: 'var(--text2)' }}>Política de Privacidade</Link>.
        </p>

        <p className="auth-footer" style={{ marginTop: 16 }}>
          Já tem conta?{' '}
          <Link href={next === '/dashboard' ? '/auth/login' : `/auth/login?next=${encodeURIComponent(next)}`}>
            Entrar
          </Link>
        </p>
      </AuthCard>
    </AuthPage>
  )
}

export default function RegistroPage() {
  return (
    <Suspense fallback={
      <main className="auth-page">
        <span className="auth-copy">Carregando...</span>
      </main>
    }>
      <RegistroForm />
    </Suspense>
  )
}
