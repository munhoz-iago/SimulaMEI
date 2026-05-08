import {
  buildOfficeAlertCandidate,
  getOfficeAlertMonthReference,
  shouldEmailOfficeAlert,
  type OfficeAlertCandidate,
  type OfficeAlertClientLike,
} from './alerts'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendOfficeAlertEmail } from '@/lib/resend'
import type { AccountantOfficePlan } from './office'
import type { ResultadoSimulacao } from '@/types/tributario'

interface DbError {
  code?: string
  message: string
}

interface QueryResult<T> {
  data: T
  error: DbError | null
}

interface Query<T> extends PromiseLike<QueryResult<T>> {
  eq(column: string, value: unknown): Query<T>
  in(column: string, values: unknown[]): Query<T>
  not(column: string, operator: string, value: unknown): Query<T>
  order(column: string, options?: { ascending?: boolean }): Query<T>
  limit(count: number): Promise<QueryResult<T>>
  range(from: number, to: number): Promise<QueryResult<T>>
}

interface InsertQuery<T> {
  select(columns: string): {
    single(): Promise<QueryResult<T>>
  }
}

interface UpdateQuery extends PromiseLike<QueryResult<unknown>> {
  eq(column: string, value: unknown): UpdateQuery
}

interface SupabaseAdminLike {
  from(table: string): unknown
  rpc?: unknown
}

interface OfficeMonitorOfficeRow {
  id: string
  name: string
  plan: AccountantOfficePlan
  max_clients: number
  trial_ends_at: string | null
  stripe_subscription_status: string | null
  current_period_end: string | null
}

interface OfficeMonitorClientRow extends OfficeAlertClientLike {
  id: string
  name: string
  cnae: string | null
  tipo_mei: string | null
}

interface OfficeMonitorSimulationRow {
  id: string
  client_id: string
  resultado: ResultadoSimulacao
  created_at: string
}

interface OfficeMonitorMemberRow {
  user_id: string
  role: 'owner' | 'admin' | 'member'
}

interface OfficeMonitorProfileRow {
  id: string
  email: string
  nome: string | null
}

interface OfficeAlertInsertRow {
  id: string
  office_id: string
  client_id: string
  tipo: string
  mes_referencia: string
  payload: Record<string, unknown>
  created_at: string
}

export interface OfficeAlertsMonitorSummary {
  officesScanned: number
  clientsScanned: number
  created: number
  duplicated: number
  skipped: number
  emailsSent: number
  emailsFailed: number
  errors: number
}

function isOfficeEligibleForAlerts(office: OfficeMonitorOfficeRow, now: Date) {
  if (office.plan === 'enterprise') return true
  if (office.plan === 'starter_trial') {
    if (!office.trial_ends_at) return true
    return new Date(office.trial_ends_at).getTime() >= now.getTime()
  }

  return office.stripe_subscription_status === 'active'
    || office.stripe_subscription_status === 'trialing'
}

async function listMonitorOffices(admin: SupabaseAdminLike) {
  const PAGE_SIZE = 500
  const all: OfficeMonitorOfficeRow[] = []
  let offset = 0

  while (true) {
    const table = admin.from('accountant_offices') as { select(columns: string): Query<OfficeMonitorOfficeRow[]> }
    const { data, error } = await table
      .select('id, name, plan, max_clients, trial_ends_at, stripe_subscription_status, current_period_end')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return all
}

async function listActiveOfficeClients(admin: SupabaseAdminLike, officeId: string) {
  const PAGE_SIZE = 1000
  const all: OfficeMonitorClientRow[] = []
  let offset = 0

  while (true) {
    const table = admin.from('office_clients') as { select(columns: string): Query<OfficeMonitorClientRow[]> }
    const { data, error } = await table
      .select('id, name, cnae, tipo_mei')
      .eq('office_id', officeId)
      .eq('ativo', true)
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return all
}

async function listLatestClientSimulationsByOffice(admin: SupabaseAdminLike, officeId: string) {
  if (typeof admin.rpc !== 'function') {
    throw new Error('Supabase admin client does not support RPC calls.')
  }

  const rpc = admin.rpc as (fn: string, args: Record<string, unknown>) => PromiseLike<QueryResult<unknown>>
  const { data, error } = await rpc('get_latest_simulations_by_office', {
    p_office_id: officeId,
  })

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as OfficeMonitorSimulationRow[]
  return new Map(rows.map(row => [row.client_id, row]))
}

async function listOfficeAlertRecipients(admin: SupabaseAdminLike, officeId: string) {
  const membersTable = admin.from('office_members') as {
    select(columns: string): Query<OfficeMonitorMemberRow[]>
  }
  const membersResult = await membersTable
    .select('user_id, role')
    .eq('office_id', officeId)
    .in('role', ['owner', 'admin'])
    .not('accepted_at', 'is', null)
    .limit(20)

  if (membersResult.error) throw new Error(membersResult.error.message)
  const userIds = (membersResult.data ?? []).map(member => member.user_id)
  if (userIds.length === 0) return []

  const profilesTable = admin.from('user_profiles') as {
    select(columns: string): Query<OfficeMonitorProfileRow[]>
  }
  const profilesResult = await profilesTable
    .select('id, email, nome')
    .in('id', userIds)

  if (profilesResult.error) throw new Error(profilesResult.error.message)

  return (profilesResult.data ?? [])
    .filter(profile => profile.email)
    .map(profile => ({
      email: profile.email,
      nome: profile.nome ?? profile.email,
    }))
}

async function insertOfficeAlert(
  admin: SupabaseAdminLike,
  candidate: OfficeAlertCandidate,
) {
  const table = admin.from('office_alerts') as {
    insert(payload: OfficeAlertCandidate): InsertQuery<OfficeAlertInsertRow>
  }
  return table
    .insert(candidate)
    .select('id, office_id, client_id, tipo, mes_referencia, payload, created_at')
    .single()
}

async function markOfficeAlertNotified(admin: SupabaseAdminLike, alertId: string, notifiedAt: string) {
  const table = admin.from('office_alerts') as {
    update(payload: Record<string, unknown>): UpdateQuery
  }
  const { error } = await table
    .update({ notificado_em: notifiedAt })
    .eq('id', alertId)

  if (error) throw new Error(error.message)
}

export async function runOfficeAlertsMonitor({
  admin = createAdminClient(),
  sendEmail = sendOfficeAlertEmail,
  now = new Date(),
}: {
  admin?: SupabaseAdminLike
  sendEmail?: typeof sendOfficeAlertEmail
  now?: Date
} = {}): Promise<OfficeAlertsMonitorSummary> {
  const summary: OfficeAlertsMonitorSummary = {
    officesScanned: 0,
    clientsScanned: 0,
    created: 0,
    duplicated: 0,
    skipped: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: 0,
  }
  const mesReferencia = getOfficeAlertMonthReference(now)
  const offices = await listMonitorOffices(admin)

  for (const office of offices) {
    if (!isOfficeEligibleForAlerts(office, now)) {
      summary.skipped += 1
      continue
    }

    summary.officesScanned += 1
    const [clients, recipients, simulationsByClientId] = await Promise.all([
      listActiveOfficeClients(admin, office.id),
      listOfficeAlertRecipients(admin, office.id),
      listLatestClientSimulationsByOffice(admin, office.id),
    ])

    for (const client of clients) {
      summary.clientsScanned += 1
      try {
        const simulation = simulationsByClientId.get(client.id) ?? null
        const candidate = buildOfficeAlertCandidate({
          officeId: office.id,
          client,
          simulation,
          mesReferencia,
        })

        if (!candidate) {
          summary.skipped += 1
          continue
        }

        const insertResult = await insertOfficeAlert(admin, candidate)
        if (insertResult.error) {
          if (insertResult.error.code === '23505') {
            summary.duplicated += 1
            continue
          }

          summary.errors += 1
          console.error('[office-alerts] insert error:', insertResult.error.message)
          continue
        }

        summary.created += 1
        if (!shouldEmailOfficeAlert(candidate.tipo) || recipients.length === 0) {
          continue
        }

        let anySent = false
        for (const recipient of recipients) {
          try {
            const result = await sendEmail({
              to: recipient.email,
              nome: recipient.nome,
              officeName: office.name,
              clientName: client.name,
              title: candidate.payload.title,
              body: candidate.payload.body,
            })

            if (!(result as { skipped?: boolean }).skipped) {
              anySent = true
              summary.emailsSent += 1
            }
          } catch (error) {
            summary.emailsFailed += 1
            console.error('[office-alerts] email error:', error)
          }
        }

        if (anySent) {
          await markOfficeAlertNotified(admin, insertResult.data.id, now.toISOString())
        }
      } catch (error) {
        summary.errors += 1
        console.error('[office-alerts] client monitor error:', error)
      }
    }
  }

  return summary
}
