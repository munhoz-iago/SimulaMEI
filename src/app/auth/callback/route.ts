import { NextRequest, NextResponse } from 'next/server'
import { getProfileAccess } from '@/lib/auth/profile-access'
import { sanitizeNextParam } from '@/lib/auth/safe-redirect'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextParam(searchParams.get('next'), '/')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const access = await getProfileAccess(supabase, user)
        return NextResponse.redirect(`${origin}${access.isComplete ? next : '/onboarding'}`)
      }

      return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_user_missing`)
    }
  }

  // Algo deu errado — redireciona para login com mensagem
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
