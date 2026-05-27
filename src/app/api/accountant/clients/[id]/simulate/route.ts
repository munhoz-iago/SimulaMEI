import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAccountantOffice, type CurrentAccountantOffice } from '@/lib/accountant/server'
import {
  getAccountantBillingRestrictionMessage,
  getAccountantBillingState,
  isAccountantBillingRestricted,
} from '@/lib/accountant/billing-state'
import { normalizeOfficeClientSimulation } from '@/lib/accountant/simulations'
import { simular } from '@/lib/tributario'

type SupabaseLike = Awaited<ReturnType<typeof createClient>>

interface DbError {
  message: string
}

interface User {
  id: string
}

interface OfficeClientRow {
  id: string
  name: string
  cnae: string | null
  tipo_mei: string | null
  ativo: boolean
}

interface OfficeSimulationRow {
  id: string
  office_id: string
  client_id: string
  created_at: string
}

interface QueryResult<T> {
  data: T
  error: DbError | null
}

interface SupabaseQuery<T> extends PromiseLike<QueryResult<T>> {
  eq(column: string, value: unknown): SupabaseQuery<T>
  select(columns: string): SupabaseQuery<T>
  maybeSingle(): Promise<QueryResult<T | null>>
  single(): Promise<QueryResult<T>>
}

interface OfficeClientsTable {
  select<T = OfficeClientRow>(columns: string): SupabaseQuery<T>
}

interface OfficeSimulationsTable {
  insert(payload: Record<string, unknown>): SupabaseQuery<OfficeSimulationRow>
}

interface RouteContext {
  params: Promise<{ id: string }> | { id: string }
}

function getTables(supabase: SupabaseLike) {
  return {
    clients: supabase.from('office_clients') as unknown as OfficeClientsTable,
    simulations: supabase.from('office_simulations') as unknown as OfficeSimulationsTable,
  }
}

async function getClientId(context: RouteContext) {
  const params = await context.params
  return params.id
}

async function getAuthenticatedOffice(): Promise<
  | { ok: true; office: CurrentAccountantOffice; user: User; supabase: SupabaseLike }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 }) }
  }

  const { office, error } = await getCurrentAccountantOffice(supabase, user.id, user.email)
  if (error) {
    console.error('[/api/accountant/clients/[id]/simulate] office query error:', error)
    return { ok: false, response: NextResponse.json({ error: 'Não foi possível carregar o escritório.' }, { status: 500 }) }
  }

  if (!office) {
    return { ok: false, response: NextResponse.json({ error: 'Escritório contador não configurado.' }, { status: 403 }) }
  }

  return { ok: true, office, user, supabase }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedOffice()
    if (!auth.ok) return auth.response

    // P1.3: simulação consome quota faturada → exige role=owner.
    if (auth.office.role !== 'owner') {
      return NextResponse.json({
        error: 'Apenas o owner do escritório pode executar simulações.',
      }, { status: 403 })
    }

    const billing = getAccountantBillingState(auth.office)
    if (isAccountantBillingRestricted(billing)) {
      return NextResponse.json({
        error: getAccountantBillingRestrictionMessage('simulate'),
        billing,
      }, { status: 402 })
    }

    const clientId = await getClientId(context)
    // P1.6: read/write em office_clients e office_simulations via cliente SSR
    // (RLS-enforced via is_office_member). .eq('office_id') como defesa em profundidade.
    const { clients, simulations } = getTables(auth.supabase)
    const clientResult = await clients
      .select<OfficeClientRow>('id, name, cnae, tipo_mei, ativo')
      .eq('office_id', auth.office.id)
      .eq('id', clientId)
      .maybeSingle()

    if (clientResult.error) {
      console.error('[/api/accountant/clients/[id]/simulate] client query error:', clientResult.error.message)
      return NextResponse.json({ error: 'Não foi possível carregar o cliente.' }, { status: 500 })
    }

    if (!clientResult.data) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
    }

    if (!clientResult.data.ativo) {
      return NextResponse.json({ error: 'Cliente pausado não pode receber nova simulação.' }, { status: 409 })
    }

    const body = await request.json()
    const parsed = normalizeOfficeClientSimulation(body, clientResult.data)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const entrada = parsed.value
    const resultado = simular(entrada)
    const insertResult = await simulations
      .insert({
        office_id: auth.office.id,
        client_id: clientResult.data.id,
        performed_by: auth.user.id,
        entrada,
        resultado,
        tax_rule_version: resultado.taxRuleVersion,
      })
      .select('id, office_id, client_id, created_at')
      .single()

    if (insertResult.error || !insertResult.data) {
      console.error('[/api/accountant/clients/[id]/simulate] insert error:', insertResult.error?.message)
      return NextResponse.json({ error: 'Não foi possível salvar a simulação do cliente.' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      simulation: insertResult.data,
      resultado,
    })
  } catch (error) {
    console.error('[/api/accountant/clients/[id]/simulate] POST error:', error)
    return NextResponse.json({ error: 'Erro interno ao simular cliente.' }, { status: 500 })
  }
}
