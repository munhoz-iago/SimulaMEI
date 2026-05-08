// src/lib/supabase/middleware.ts
// Utilitário para renovar sessão Supabase em cada request

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const nextRequest = requestHeaders ? { headers: requestHeaders } : request
  let supabaseResponse = NextResponse.next({ request: nextRequest })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: Array<{
            name: string
            value: string
            options?: Parameters<typeof supabaseResponse.cookies.set>[2]
          }>,
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request: nextRequest })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Renova sessão — IMPORTANTE: não remover este await
  const { data: { user } } = await supabase.auth.getUser()

  return { supabaseResponse, supabase, user }
}
