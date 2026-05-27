import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ConsumeRateLimitParams {
  namespace: string
  subjectHash: string
  limit: number
  windowSeconds: number
}

interface RateLimitRow {
  allowed: boolean
  remaining: number
  reset_at: string
  hit_count: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: string
  hitCount: number
}

const FAIL_OPEN: RateLimitResult = {
  allowed: true,
  remaining: 99,
  resetAt: new Date(Date.now() + 60_000).toISOString(),
  hitCount: 0,
}

export async function consumeRateLimit({
  namespace,
  subjectHash,
  limit,
  windowSeconds,
}: ConsumeRateLimitParams): Promise<RateLimitResult> {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (err) {
    console.error('[rate-limit] Admin client unavailable, failing open:', err)
    return { ...FAIL_OPEN, resetAt: new Date(Date.now() + windowSeconds * 1000).toISOString() }
  }

  const adminRpc = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => {
      single: () => Promise<{
        data: unknown
        error: { message: string } | null
      }>
    }
  }

  const { data, error } = await adminRpc
    .rpc('consume_rate_limit', {
      p_namespace: namespace,
      p_subject_hash: subjectHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    .single()

  const row = data as RateLimitRow | null

  if (error || !row) {
    // Fail open: se o Supabase estiver indisponivel, nao derruba a API.
    // Loga o erro para monitoramento mas permite a requisicao prosseguir.
    console.error('[rate-limit] Supabase unavailable, failing open:', error?.message ?? 'empty response')
    return {
      allowed: true,
      remaining: 99,
      resetAt: new Date(Date.now() + windowSeconds * 1000).toISOString(),
      hitCount: 0,
    }
  }

  return {
    allowed: row.allowed,
    remaining: row.remaining,
    resetAt: row.reset_at,
    hitCount: row.hit_count,
  }
}

export function applyRateLimitHeaders(
  response: NextResponse,
  rateLimit: RateLimitResult,
  limit: number,
) {
  response.headers.set('X-RateLimit-Limit', String(limit))
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))
  response.headers.set('X-RateLimit-Reset', rateLimit.resetAt)
  // P2: clientes que recebem 429 precisam saber quando podem tentar de novo.
  // Retry-After em segundos (RFC 7231) — sempre >= 1 para garantir back-off.
  const resetMs = new Date(rateLimit.resetAt).getTime() - Date.now()
  const retryAfter = Math.max(1, Math.ceil(resetMs / 1000))
  response.headers.set('Retry-After', String(retryAfter))
  return response
}
