import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAccountantOffice } from '@/lib/accountant/server'

interface RouteContext {
  params: Promise<{ id: string }> | { id: string }
}

interface DbError {
  message: string
}

interface QueryResult<T> {
  data: T
  error: DbError | null
}

interface ResolveAlertQuery<T> {
  eq(column: string, value: unknown): ResolveAlertQuery<T>
  is(column: string, value: unknown): ResolveAlertQuery<T>
  select(columns: string): ResolveAlertQuery<T>
  single(): Promise<QueryResult<T>>
}

interface OfficeAlertsTable {
  update(payload: Record<string, unknown>): ResolveAlertQuery<Record<string, unknown>>
}

async function getAlertId(context: RouteContext) {
  const params = await context.params
  return params.id
}

export async function PATCH(_request: Request, context: RouteContext) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
  }

  const { office, error } = await getCurrentAccountantOffice(supabase, user.id, user.email)
  if (error) {
    console.error('[/api/accountant/alerts/[id]/resolve] office query error:', error)
    return NextResponse.json({ error: 'Não foi possível carregar o escritório.' }, { status: 500 })
  }

  if (!office) {
    return NextResponse.json({ error: 'Escritório contador não configurado.' }, { status: 403 })
  }

  // P1.3: resolver alerta NÃO é destrutivo de billing/carteira — qualquer member pode marcar como visto.
  // P1.6: usa cliente SSR. Policy "office_alerts: all member" autoriza update por membros.
  const alertId = await getAlertId(context)
  const table = supabase.from('office_alerts') as unknown as OfficeAlertsTable
  const result = await table
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', alertId)
    .eq('office_id', office.id)
    .is('resolved_at', null)
    .select('id, office_id, resolved_by, resolved_at')
    .single()

  if (result.error || !result.data) {
    console.error('[/api/accountant/alerts/[id]/resolve] update error:', result.error?.message)
    return NextResponse.json({ error: 'Não foi possível resolver o alerta.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, alert: result.data })
}
