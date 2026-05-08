import { type NextRequest, NextResponse } from 'next/server'
import { canAccessAdminLeads, getProfileAccess } from '@/lib/auth/profile-access'
import { buildContentSecurityPolicy } from '@/lib/security/csp'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PATHS = ['/dashboard', '/onboarding', '/contador', '/admin', '/relatorio', '/upgrade', '/api/v1']
const AUTH_PATHS = ['/auth/login', '/auth/registro', '/auth/recuperar']

function matchesPrefix(pathname: string, paths: string[]) {
  return paths.some(path => pathname === path || pathname.startsWith(`${path}/`))
}

function createNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

function applyContentSecurityPolicy(response: NextResponse, nonce: string) {
  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce))
  return response
}

function redirectWithSessionCookies(
  request: NextRequest,
  supabaseResponse: NextResponse,
  path: string,
  nonce: string,
) {
  const url = new URL(path, request.url)
  const response = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
  return applyContentSecurityPolicy(response, nonce)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const nonce = createNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const { supabaseResponse, supabase, user } = await updateSession(request, requestHeaders)
  const isProtected = matchesPrefix(pathname, PROTECTED_PATHS)
  const isAuth = matchesPrefix(pathname, AUTH_PATHS)

  // Protege rotas privadas
  if (isProtected && !user) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    const response = NextResponse.redirect(loginUrl)
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    return applyContentSecurityPolicy(response, nonce)
  }

  if (!user || (!isProtected && !isAuth)) {
    return applyContentSecurityPolicy(supabaseResponse, nonce)
  }

  const access = await getProfileAccess(supabase, user)

  if (isAuth) {
    return redirectWithSessionCookies(request, supabaseResponse, access.isComplete ? '/dashboard' : '/onboarding', nonce)
  }

  if (pathname.startsWith('/admin/leads') && !canAccessAdminLeads(access.profile, user)) {
    return redirectWithSessionCookies(request, supabaseResponse, '/dashboard', nonce)
  }

  if (!pathname.startsWith('/onboarding') && !access.isComplete) {
    return redirectWithSessionCookies(request, supabaseResponse, '/onboarding', nonce)
  }

  return applyContentSecurityPolicy(supabaseResponse, nonce)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - arquivos com extensão (imagens, fontes, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
}
