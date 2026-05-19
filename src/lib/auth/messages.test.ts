import { describe, expect, it } from 'vitest'
import {
  getLoginErrorFeedback,
  getLoginQueryFeedback,
  getLoginReasonFeedback,
  getOAuthErrorMessage,
  getSignupSubmissionFeedback,
} from './messages'

describe('auth messages', () => {
  it('maps unconfirmed email login errors to actionable feedback', () => {
    expect(getLoginErrorFeedback('Email not confirmed')).toEqual({
      message: 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.',
      allowResendConfirmation: true,
    })
  })

  it('keeps signup feedback generic for already registered users', () => {
    expect(getSignupSubmissionFeedback('User already registered')).toEqual({
      status: 'success',
      message: 'Se este e-mail for válido, você receberá as instruções.',
    })
  })

  it('maps auth callback query errors to a friendly login message', () => {
    expect(getLoginQueryFeedback('auth_callback_failed')).toBe(
      'Não foi possível concluir a autenticação. Tente novamente.',
    )
  })

  it('maps inactive session reasons to a neutral login message', () => {
    expect(getLoginReasonFeedback('inactive')).toBe(
      'Sua sessão expirou por inatividade. Entre novamente para continuar.',
    )
  })

  it('uses a generic OAuth failure message when Supabase returns none', () => {
    expect(getOAuthErrorMessage()).toBe('Não foi possível iniciar a autenticação com Google.')
  })
})
