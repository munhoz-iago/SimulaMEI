import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ACCOUNTANT_PLAN_LIMITS, normalizeAccountantOfficeOnboarding } from '@/lib/accountant/office'
import { applyRateLimitHeaders, consumeRateLimit } from '@/lib/security/rate-limit'

// P2: criar escritório é operação rara (1x na vida do user). 3/h cobre
// 2 tentativas legítimas (erro de digitação, retry após network blip) e
// trava bot que tenta criar offices em loop pra fuzz CNPJ.
const ONBOARDING_RATE_LIMIT = 3

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
    }

    const rateLimit = await consumeRateLimit({
      namespace: 'accountant_onboarding',
      subjectHash: user.id,
      limit: ONBOARDING_RATE_LIMIT,
      windowSeconds: 60 * 60,
    })

    if (!rateLimit.allowed) {
      return applyRateLimitHeaders(
        NextResponse.json({ error: 'Limite de tentativas de onboarding atingido. Tente novamente em uma hora.' }, { status: 429 }),
        rateLimit,
        ONBOARDING_RATE_LIMIT,
      )
    }

    const body = await request.json()
    const parsed = normalizeAccountantOfficeOnboarding(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    // P1.6 (justificado): este endpoint MANTÉM createAdminClient porque o usuário
    // ainda NÃO é membro de nenhum escritório no momento do onboarding. As policies
    // de accountant_offices/office_members usam is_office_member/is_office_admin,
    // que só passam quando a row em office_members JÁ existe — e ainda não existe.
    // Como o onboarding cria simultaneamente o office E a membership owner,
    // precisamos do admin client para furar a RLS no insert inicial.
    // Segurança preservada por:
    //   1) owner_user_id = user.id (extraído do JWT validado, NÃO do payload do cliente)
    //   2) unique(owner_user_id) em accountant_offices impede duplicação
    //   3) plan='starter_trial' e max_clients hardcoded no servidor (não vem do body)
    //   4) role='owner' fixo no servidor para o membership inicial
    const admin = createAdminClient()
    const officesTable = admin.from('accountant_offices') as unknown as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>
        }
      }
      insert: (payload: Record<string, unknown>) => {
        select: (columns: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string; code?: string } | null }>
        }
      }
    }
    const membersTable = admin.from('office_members') as unknown as {
      upsert: (
        payload: Record<string, unknown>,
        options: { onConflict: string },
      ) => Promise<{ error: { message: string } | null }>
    }

    const existing = await officesTable
      .select('id')
      .eq('owner_user_id', user.id)
      .maybeSingle()

    if (existing.error) {
      console.error('[/api/accountant/onboarding] existing office error:', existing.error.message)
      return NextResponse.json({ error: 'Não foi possível verificar o escritório atual.' }, { status: 500 })
    }

    if (existing.data?.id) {
      return NextResponse.json({ ok: true, officeId: existing.data.id, alreadyExists: true })
    }

    const input = parsed.value
    // Trial: 7 dias (mudou de 14 para 7 com o redesign Mercury; só afeta novos onboardings)
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const officeResult = await officesTable
      .insert({
        owner_user_id: user.id,
        name: input.nomeEscritorio,
        cnpj: input.cnpj,
        telefone: input.telefone,
        plan: 'starter_trial',
        max_clients: ACCOUNTANT_PLAN_LIMITS.starter_trial,
        trial_ends_at: trialEndsAt,
        white_label: {
          carteira_range: input.carteiraRange,
          ferramenta_atual: input.ferramentaAtual,
          objetivo: input.objetivo,
        },
      })
      .select('id')
      .single()

    if (officeResult.error || !officeResult.data) {
      console.error('[/api/accountant/onboarding] office insert error:', officeResult.error?.message)
      return NextResponse.json({ error: 'Não foi possível criar o escritório.' }, { status: 500 })
    }

    const { error: memberError } = await membersTable
      .upsert({
        office_id: officeResult.data.id,
        user_id: user.id,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      }, { onConflict: 'office_id,user_id' })

    if (memberError) {
      console.error('[/api/accountant/onboarding] member upsert error:', memberError.message)
      return NextResponse.json({ error: 'Não foi possível vincular o usuário ao escritório.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, officeId: officeResult.data.id })
  } catch (error) {
    console.error('[/api/accountant/onboarding] Error:', error)
    return NextResponse.json({ error: 'Erro interno no onboarding contador.' }, { status: 500 })
  }
}
