import { NextResponse } from 'next/server'

/**
 * GET /api/health
 *
 * Verifica se todas as env vars críticas estão configuradas no ambiente.
 * Útil para detectar deploys quebrados ANTES do usuário encontrar um 500.
 *
 * Status:
 * - 200 ok       → todas as env vars críticas presentes
 * - 503 degraded → uma ou mais env vars críticas faltando (lista no response)
 *
 * IMPORTANTE: nunca retorna o VALOR das env vars, só presença/ausência.
 */

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_HASH_SECRET',
] as const

const OPTIONAL_VARS = [
  'NEXT_PUBLIC_APP_URL',
  'ADMIN_EMAIL',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_POSTHOG_KEY',
] as const

export async function GET() {
  const missing = REQUIRED_VARS.filter(name => !process.env[name]?.trim())
  const optionalMissing = OPTIONAL_VARS.filter(name => !process.env[name]?.trim())

  const status = missing.length === 0 ? 'ok' : 'degraded'
  const httpStatus = missing.length === 0 ? 200 : 503

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        required: {
          total: REQUIRED_VARS.length,
          present: REQUIRED_VARS.length - missing.length,
          missing,
        },
        optional: {
          total: OPTIONAL_VARS.length,
          missing: optionalMissing,
        },
      },
    },
    { status: httpStatus },
  )
}
