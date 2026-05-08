import { createHmac } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCnae, normalizeCnaeCode, simular } from '@/lib/tributario'
import type { EntradaSimulacao } from '@/types/tributario'

interface ApiKeyRow {
  id: string
  user_id: string
  tier: 'free' | 'pro'
  revoked_at: string | null
}

interface QuotaRow {
  requests_month: number
  monthly_limit: number
}

const TIER_MONTHLY_LIMIT: Record<ApiKeyRow['tier'], number> = {
  free: 1000,
  pro: 500000,
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') ?? ''
  const [scheme, token] = header.split(/\s+/, 2)

  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token.trim()
}

function hashApiKey(key: string, secret: string) {
  return createHmac('sha256', secret).update(key).digest('hex')
}

function parseNumberParam(request: NextRequest, name: string) {
  const raw = request.nextUrl.searchParams.get(name)
  if (raw == null) return null

  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function parseTipoMei(value: string | null): EntradaSimulacao['tipoMei'] | null {
  if (value === 'geral' || value === 'caminhoneiro') return value
  return null
}

export async function GET(request: NextRequest) {
  const secret = process.env.SIMULAMEI_API_KEY_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Configuração interna ausente.' }, { status: 500 })
  }

  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Authorization Bearer obrigatório.' }, { status: 401 })
  }

  const keyHash = hashApiKey(token, secret)

  const admin = createAdminClient()
  const { data: apiKey, error: apiKeyError } = await admin
    .from('api_keys')
    .select('id,user_id,tier,revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (apiKeyError) {
    console.error('[/api/contadores/simulate] api key query error:', apiKeyError.message)
    return NextResponse.json({ error: 'Não foi possível validar a chave.' }, { status: 500 })
  }

  const key = apiKey as ApiKeyRow | null
  if (!key || key.revoked_at) {
    return NextResponse.json({ error: 'Chave inválida ou revogada.' }, { status: 401 })
  }

  const faturamentoAcumulado = parseNumberParam(request, 'faturamentoAcumulado')
  const mesAtual = parseNumberParam(request, 'mesAtual')
  const folhaMensal = parseNumberParam(request, 'folhaMensal')
  const cnae = request.nextUrl.searchParams.get('cnae')
  const tipoMei = parseTipoMei(request.nextUrl.searchParams.get('tipoMei') ?? 'geral')

  if (
    faturamentoAcumulado == null ||
    mesAtual == null ||
    folhaMensal == null ||
    !Number.isInteger(mesAtual) ||
    mesAtual < 1 ||
    mesAtual > 12 ||
    !cnae ||
    !tipoMei
  ) {
    return NextResponse.json(
      { error: 'Parâmetros obrigatórios: faturamentoAcumulado, mesAtual, cnae, folhaMensal, tipoMei.' },
      { status: 400 },
    )
  }

  const normalizedCnae = normalizeCnaeCode(cnae)
  if (!getCnae(normalizedCnae)) {
    return NextResponse.json({ error: 'CNAE não reconhecido.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quotaData, error: quotaError } = await (admin as any)
    .rpc('increment_quota', { p_api_key_id: key.id })

  if (quotaError) {
    console.error('[/api/contadores/simulate] quota rpc error:', quotaError.message)
    return NextResponse.json({ error: 'Não foi possível contabilizar o uso da chave.' }, { status: 500 })
  }

  const quota = (Array.isArray(quotaData) ? quotaData[0] : quotaData) as QuotaRow | undefined
  if (!quota) {
    return NextResponse.json(
      {
        error: 'Limite mensal da API atingido.',
        limit: TIER_MONTHLY_LIMIT[key.tier] ?? TIER_MONTHLY_LIMIT.free,
      },
      { status: 429 },
    )
  }

  const entrada: EntradaSimulacao = {
    faturamentoAcumulado,
    mesAtual,
    cnae: normalizedCnae,
    folhaMensal,
    tipoMei,
  }
  const resultado = simular(entrada)

  return NextResponse.json({
    ok: true,
    usage: {
      used: quota.requests_month,
      limit: quota.monthly_limit,
    },
    resultado,
  })
}
