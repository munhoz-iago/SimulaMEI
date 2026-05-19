import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function signOut(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get('reason')
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: reason === 'inactive' ? 'local' : 'global' })

  const loginUrl = new URL('/auth/login', request.url)
  if (reason === 'inactive') {
    loginUrl.searchParams.set('reason', reason)
  }

  return NextResponse.redirect(loginUrl)
}

export async function POST(request: NextRequest) {
  return signOut(request)
}

export async function GET(request: NextRequest) {
  return signOut(request)
}
