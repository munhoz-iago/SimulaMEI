export interface LoginErrorFeedback {
  message: string
  allowResendConfirmation?: boolean
}

export interface SignupSubmissionFeedback {
  status: 'success' | 'error'
  message: string
}

const GENERIC_SIGNUP_MESSAGE = 'Se este e-mail for válido, você receberá as instruções.'

export function getLoginErrorFeedback(rawMessage?: string | null): LoginErrorFeedback {
  if (!rawMessage) {
    return { message: 'Não foi possível entrar agora. Tente novamente.' }
  }

  if (rawMessage === 'Invalid login credentials') {
    return { message: 'E-mail ou senha incorretos.' }
  }

  if (rawMessage === 'Email not confirmed') {
    return {
      message: 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.',
      allowResendConfirmation: true,
    }
  }

  return { message: rawMessage }
}

export function getLoginQueryFeedback(errorCode?: string | null): string | null {
  if (errorCode === 'auth_callback_failed') {
    return 'Não foi possível concluir a autenticação. Tente novamente.'
  }

  return null
}

export function getLoginReasonFeedback(reasonCode?: string | null): string | null {
  if (reasonCode === 'inactive') {
    return 'Sua sessão expirou por inatividade. Entre novamente para continuar.'
  }

  return null
}

export function getSignupSubmissionFeedback(rawMessage?: string | null): SignupSubmissionFeedback {
  if (!rawMessage || rawMessage === 'User already registered') {
    return {
      status: 'success',
      message: GENERIC_SIGNUP_MESSAGE,
    }
  }

  return {
    status: 'error',
    message: rawMessage,
  }
}

export function getOAuthErrorMessage(rawMessage?: string | null): string {
  return rawMessage?.trim() || 'Não foi possível iniciar a autenticação com Google.'
}
