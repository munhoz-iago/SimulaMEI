import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAccountantOffice } from '@/lib/accountant/server'
import {
  getSaoPauloDateKey,
  isTrialCheckinPainPoint,
  isTrialCheckinSatisfaction,
  TRIAL_CHECKIN_COLUMNS,
  type TrialCheckinRecord,
} from '@/lib/accountant/trial-checkins'

type CheckinAction = 'shown' | 'answer' | 'dismiss' | 'cta_clicked'

interface DbError {
  message: string
}

interface QueryResult<T> {
  data: T
  error: DbError | null
}

interface TrialCheckinMutation {
  select(columns: string): {
    single(): Promise<QueryResult<TrialCheckinRecord>>
  }
}

interface TrialCheckinsTable {
  upsert(payload: Record<string, unknown>, options: { onConflict: string }): TrialCheckinMutation
}

function isAction(value: unknown): value is CheckinAction {
  return value === 'shown' || value === 'answer' || value === 'dismiss' || value === 'cta_clicked'
}

function normalizeFreeText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 500) : null
}

function invalidCheckinResponse() {
  return NextResponse.json({ error: 'Resposta do check-in inválida.' }, { status: 400 })
}

function buildActionPayload(body: Record<string, unknown>, now: Date) {
  const action = body.action
  if (!isAction(action)) return null

  const nowIso = now.toISOString()

  if (action === 'shown') {
    return { shown_at: nowIso }
  }

  if (action === 'dismiss') {
    return { shown_at: nowIso, dismissed_at: nowIso }
  }

  if (action === 'cta_clicked') {
    return { shown_at: nowIso, cta_clicked_at: nowIso }
  }

  const satisfaction = body.satisfaction
  if (!isTrialCheckinSatisfaction(satisfaction)) return null

  const painPoint = body.painPoint
  if (painPoint != null && !isTrialCheckinPainPoint(painPoint)) return null

  return {
    shown_at: nowIso,
    answered_at: nowIso,
    satisfaction,
    pain_point: painPoint ?? null,
    free_text: normalizeFreeText(body.freeText),
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return invalidCheckinResponse()

  const now = new Date()
  const actionPayload = buildActionPayload(body, now)
  if (!actionPayload) return invalidCheckinResponse()

  const { office, error } = await getCurrentAccountantOffice(supabase, user.id, user.email)
  if (error) {
    console.error('[/api/accountant/trial-checkin] office query error:', error)
    return NextResponse.json({ error: 'Não foi possível carregar o escritório.' }, { status: 500 })
  }

  if (!office) {
    return NextResponse.json({ error: 'Escritório contador não configurado.' }, { status: 403 })
  }

  if (office.plan !== 'starter_trial') {
    return NextResponse.json({ error: 'Check-in disponível apenas durante o trial.' }, { status: 403 })
  }

  // RLS-enforced: server SSR client respeita policies de accountant_trial_checkins
  // (is_office_member + auth.uid() = user_id para INSERT/UPDATE).
  // Reusa `supabase` já criado para auth.getUser() acima — mesma sessão.
  const table = supabase.from('accountant_trial_checkins') as unknown as TrialCheckinsTable
  const result = await table
    .upsert({
      office_id: office.id,
      user_id: user.id,
      shown_on: getSaoPauloDateKey(now),
      ...actionPayload,
    }, { onConflict: 'office_id,user_id,shown_on' })
    .select(TRIAL_CHECKIN_COLUMNS)
    .single()

  if (result.error || !result.data) {
    console.error('[/api/accountant/trial-checkin] upsert error:', result.error?.message)
    return NextResponse.json({ error: 'Não foi possível salvar o check-in.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, checkin: result.data })
}
