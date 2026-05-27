import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /auth/logout
 *
 * Encerra a sessão Supabase e redireciona para /auth/login.
 *
 * Aceita apenas POST por design: GET seria explorável via CSRF
 * (`<img src="https://simulamei.com.br/auth/logout">` num site 3rd-party
 * forçaria logout do usuário autenticado). Audit security 2026-05-26 P1.1.
 *
 * Query params:
 * - `reason=inactive` → signOut com escopo `local` (apenas o tab atual)
 *   e preserva o motivo na URL de login para a UI exibir o aviso.
 *   Sem o param → signOut global (revoga em todos os devices).
 */
export async function POST(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get('reason')
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: reason === 'inactive' ? 'local' : 'global' })

  const loginUrl = new URL('/auth/login', request.url)
  if (reason === 'inactive') {
    loginUrl.searchParams.set('reason', reason)
  }

  return NextResponse.redirect(loginUrl, { status: 303 })
}
