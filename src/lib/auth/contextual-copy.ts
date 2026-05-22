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
 *
 * Match order (more-specific first):
 *   1. `/upgrade/contador` + `?autocheckout=pro` → Pro plan copy
 *   2. `/upgrade/contador` + `?autocheckout=starter` → Starter plan copy
 *   3. `/dashboard/relatorio*` or `/relatorio*` → relatório preview
 *   4. `/dashboard/simular*` → simulator preview
 *   5. default → null (caller should use defaults)
 *
 * URL params are parsed via `new URL` (not substring `includes`) so that
 * `?autocheckout=prowler` or `?notautocheckout=pro` do NOT match. Malformed
 * `next` values fall through to null instead of throwing.
 */
export function getLoginContextCopy(next: string): LoginContextCopy | null {
  let url: URL
  try {
    url = new URL(next, 'http://x')
  } catch {
    return null
  }

  const pathname = url.pathname
  const autocheckout = url.searchParams.get('autocheckout')

  if (pathname.startsWith('/upgrade/contador') && autocheckout === 'pro') {
    return {
      title: 'Falta só entrar',
      subtitle: 'Você está a um clique do plano Pro (R$ 247/mês).',
    }
  }

  if (pathname.startsWith('/upgrade/contador') && autocheckout === 'starter') {
    return {
      title: 'Falta só entrar',
      subtitle: 'Você está a um clique do plano Starter (R$ 97/mês).',
    }
  }

  if (pathname.startsWith('/dashboard/relatorio') || pathname.startsWith('/relatorio')) {
    return {
      preview: {
        heading: 'Seu relatório fica pronto após o login',
        body: 'Comparativo dos 4 regimes tributários · score fiscal · PDF para o contador · histórico salvo. Sem custo, sem cartão.',
      },
    }
  }

  if (pathname.startsWith('/dashboard/simular')) {
    return {
      preview: {
        heading: '',
        body: 'Ao entrar você libera: histórico de simulações, relatório completo dos 4 regimes e alertas mensais. Sem custo, sem cartão.',
      },
    }
  }

  return null
}
