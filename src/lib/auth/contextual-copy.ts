export interface LoginContextCopy {
  /** Optional title override (else default "Entrar"). */
  title?: string
  /** Optional subtitle/description override (else default "Acesse seu histórico de simulações e relatórios."). */
  subtitle?: string
  /** Optional preview block: when present, render the existing benefit preview UI with this content. */
  preview?: {
    heading: string
    body: string
  }
}

/**
 * Returns context-aware copy for the login page based on `next`.
 * Returns null when `next` doesn't match any known context — caller should use defaults.
 */
export function getLoginContextCopy(next: string): LoginContextCopy | null {
  if (next.startsWith('/upgrade/contador') && next.includes('autocheckout=pro')) {
    return {
      title: 'Falta só entrar',
      subtitle: 'Você está a um clique do plano Pro (R$ 247/mês).',
    }
  }

  if (next.startsWith('/upgrade/contador') && next.includes('autocheckout=starter')) {
    return {
      title: 'Falta só entrar',
      subtitle: 'Você está a um clique do plano Starter (R$ 97/mês).',
    }
  }

  if (next.startsWith('/dashboard/relatorio') || next === '/relatorio') {
    return {
      preview: {
        heading: 'Seu relatório fica pronto após o login',
        body: 'Comparativo dos 4 regimes tributários · score fiscal · PDF para o contador · histórico salvo. Sem custo, sem cartão.',
      },
    }
  }

  if (next.startsWith('/dashboard/simular')) {
    return {
      preview: {
        heading: '',
        body: 'Ao entrar você libera: histórico de simulações, relatório completo dos 4 regimes e alertas mensais. Sem custo, sem cartão.',
      },
    }
  }

  return null
}
