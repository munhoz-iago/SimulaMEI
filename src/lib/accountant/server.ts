import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/auth/admin-access'
import type { EntradaSimulacao, ResultadoSimulacao } from '@/types/tributario'
import {
  OFFICE_CLIENT_PAGE_SIZE,
  type OfficeClientStatusFilter,
} from './clients'
import { ACCOUNTANT_PLAN_LIMITS, type AccountantMemberRole, type AccountantOfficePlan } from './office'

export interface CurrentAccountantOffice {
  id: string
  name: string
  plan: AccountantOfficePlan
  max_clients: number
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_subscription_status: string | null
  current_period_end: string | null
  /** Início do trial (= criação do escritório). Usado para derivar a duração
   *  total do trial dinamicamente. Opcional: o office admin-fallback não tem. */
  created_at?: string | null
  role: AccountantMemberRole
  admin_access_fallback?: boolean
  admin_access_error?: string | null
}

export interface OfficeClientRecord {
  id: string
  name: string
  email: string | null
  cnae: string
  tipo_mei: string
  uf: string | null
  municipio: string | null
  observacoes: string | null
  ativo: boolean
  inactive_reason: 'manual' | 'plan_limit' | null
  disabled_by_plan_limit_at: string | null
  created_at: string
  updated_at: string
}

export interface OfficeClientStats {
  total: number
  active: number
  manualInactive: number
  planLimitInactive: number
}

export interface OfficeSimulationRecord {
  id: string
  office_id: string
  client_id: string
  performed_by: string | null
  entrada: EntradaSimulacao
  resultado: ResultadoSimulacao
  tax_rule_version: string | null
  created_at: string
}

export interface OfficeAlertPayloadRecord {
  title?: string
  body?: string
  severity?: 'info' | 'warn' | 'danger'
  clientName?: string
  [key: string]: unknown
}

export interface OfficeAlertRecord {
  id: string
  office_id: string
  client_id: string
  tipo: string
  mes_referencia: string
  payload: OfficeAlertPayloadRecord
  notificado_em: string | null
  resolved_at: string | null
  resolved_by: string | null
  resolved_by_label: string | null
  created_at: string
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

interface OfficeMemberJoinRow {
  role: AccountantMemberRole
  accountant_offices: {
    id: string
    name: string
    plan: AccountantOfficePlan
    max_clients: number
    trial_ends_at: string | null
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    stripe_subscription_status: string | null
    current_period_end: string | null
    created_at: string | null
  } | null
}

type AdminOfficeRow = OfficeMemberJoinRow['accountant_offices'] & { id: string }

interface DbError {
  message: string
}

interface QueryResult<T> {
  data: T
  error: DbError | null
  count?: number | null
}

interface OfficeClientQuery<T> extends PromiseLike<QueryResult<T>> {
  eq(column: string, value: unknown): OfficeClientQuery<T>
  order(column: string, options?: { ascending?: boolean }): OfficeClientQuery<T>
  range(from: number, to: number): Promise<QueryResult<T>>
  limit(count: number): OfficeClientQuery<T>
  maybeSingle(): Promise<QueryResult<T | null>>
}

interface OfficeClientsTable {
  select<T = OfficeClientRecord[]>(
    columns: string,
    options?: { count?: 'exact'; head?: boolean },
  ): OfficeClientQuery<T>
}

interface OfficeSimulationsTable {
  select<T = OfficeSimulationRecord[]>(columns: string): OfficeClientQuery<T>
}

interface OfficeAlertQuery<T> extends PromiseLike<QueryResult<T>> {
  eq(column: string, value: unknown): OfficeAlertQuery<T>
  is(column: string, value: unknown): OfficeAlertQuery<T>
  not(column: string, operator: string, value: unknown): OfficeAlertQuery<T>
  order(column: string, options?: { ascending?: boolean }): OfficeAlertQuery<T>
  limit(count: number): Promise<QueryResult<T>>
}

interface OfficeAlertsTable {
  select<T = OfficeAlertRecord[]>(columns: string): OfficeAlertQuery<T>
}

interface UserProfileQuery<T> extends PromiseLike<QueryResult<T>> {
  in(column: string, values: unknown[]): Promise<QueryResult<T>>
}

interface UserProfilesTable {
  select<T = Array<{ id: string; email: string; nome: string | null }>>(columns: string): UserProfileQuery<T>
}

const OFFICE_CLIENT_COLUMNS = 'id, name, email, cnae, tipo_mei, uf, municipio, observacoes, ativo, inactive_reason, disabled_by_plan_limit_at, created_at, updated_at'
const OFFICE_SIMULATION_COLUMNS = 'id, office_id, client_id, performed_by, entrada, resultado, tax_rule_version, created_at'
const OFFICE_ALERT_COLUMNS = 'id, office_id, client_id, tipo, mes_referencia, payload, notificado_em, resolved_at, resolved_by, created_at'
const ADMIN_FALLBACK_OFFICE_ID_PREFIX = 'admin-fallback:'

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

function createAdminFallbackOffice(userId: string, error: string): CurrentAccountantOffice {
  return {
    id: `${ADMIN_FALLBACK_OFFICE_ID_PREFIX}${userId}`,
    name: 'SimulaMEI Admin',
    plan: 'enterprise',
    max_clients: ACCOUNTANT_PLAN_LIMITS.enterprise,
    trial_ends_at: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_subscription_status: null,
    current_period_end: null,
    role: 'owner',
    admin_access_fallback: true,
    admin_access_error: error,
  }
}

export function isAdminAccessFallbackOffice(office: Pick<CurrentAccountantOffice, 'id'>) {
  return office.id.startsWith(ADMIN_FALLBACK_OFFICE_ID_PREFIX)
}

function toCurrentAccountantOffice(office: AdminOfficeRow, role: AccountantMemberRole): CurrentAccountantOffice {
  return {
    id: office.id,
    name: office.name,
    plan: office.plan,
    max_clients: office.max_clients,
    trial_ends_at: office.trial_ends_at,
    stripe_customer_id: office.stripe_customer_id,
    stripe_subscription_id: office.stripe_subscription_id,
    stripe_subscription_status: office.stripe_subscription_status,
    current_period_end: office.current_period_end,
    created_at: office.created_at,
    role,
  }
}

async function getOrCreateAdminAccountantOffice(userId: string, userEmail: string | null | undefined) {
  if (!isAdminEmail(userEmail)) {
    return { office: null, error: null }
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    return { office: createAdminFallbackOffice(userId, toErrorMessage(error)), error: null }
  }

  const officesTable = admin.from('accountant_offices') as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: AdminOfficeRow | null; error: { message: string } | null }>
      }
    }
    insert: (payload: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: AdminOfficeRow | null; error: { message: string } | null }>
      }
    }
  }
  const membersTable = admin.from('office_members') as unknown as {
    upsert: (
      payload: Record<string, unknown>,
      options: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>
  }

  const columns = 'id, name, plan, max_clients, trial_ends_at, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, current_period_end, created_at'
  const existing = await officesTable
    .select(columns)
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (existing.error) {
    return { office: createAdminFallbackOffice(userId, existing.error.message), error: null }
  }

  let office = existing.data

  if (!office) {
    const inserted = await officesTable.insert({
      owner_user_id: userId,
      name: 'SimulaMEI Admin',
      plan: 'enterprise',
      max_clients: ACCOUNTANT_PLAN_LIMITS.enterprise,
      trial_ends_at: null,
      white_label: {
        created_by: 'admin_full_access',
      },
    })
    .select(columns)
    .single()

    if (inserted.error) {
      return { office: createAdminFallbackOffice(userId, inserted.error.message), error: null }
    }

    office = inserted.data
  }

  if (!office) {
    return { office: null, error: 'Não foi possível criar o escritório admin.' }
  }

  const { error: memberError } = await membersTable
    .upsert({
      office_id: office.id,
      user_id: userId,
      role: 'owner',
      accepted_at: new Date().toISOString(),
    }, { onConflict: 'office_id,user_id' })

  if (memberError) {
    return { office: createAdminFallbackOffice(userId, memberError.message), error: null }
  }

  return {
    office: toCurrentAccountantOffice(office, 'owner'),
    error: null,
  }
}

export async function getCurrentAccountantOffice(
  supabase: SupabaseServerClient,
  userId: string,
  userEmail?: string | null,
): Promise<{ office: CurrentAccountantOffice | null; error: string | null }> {
  const { data, error } = await supabase
    .from('office_members')
    .select('role, accountant_offices(id, name, plan, max_clients, trial_ends_at, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, current_period_end, created_at)')
    .eq('user_id', userId)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { office: null, error: error.message }
  }

  const row = data as unknown as OfficeMemberJoinRow | null
  const office = row?.accountant_offices

  if (!row || !office) {
    return getOrCreateAdminAccountantOffice(userId, userEmail)
  }

  return {
    office: toCurrentAccountantOffice(office, row.role),
    error: null,
  }
}

async function getOfficeClientsTable() {
  const supabase = await createClient()
  return supabase.from('office_clients') as unknown as OfficeClientsTable
}

async function getOfficeSimulationsTable() {
  const supabase = await createClient()
  return supabase.from('office_simulations') as unknown as OfficeSimulationsTable
}

function getOfficeAlertsTable(supabase: SupabaseServerClient) {
  return supabase.from('office_alerts') as unknown as OfficeAlertsTable
}

function getUserProfilesTable(supabase: SupabaseServerClient) {
  return supabase.from('user_profiles') as unknown as UserProfilesTable
}

function applyStatusFilter<T>(
  query: OfficeClientQuery<T>,
  status: OfficeClientStatusFilter,
) {
  if (status === 'active') return query.eq('ativo', true)
  if (status === 'inactive') return query.eq('ativo', false)
  if (status === 'manual') return query.eq('inactive_reason', 'manual')
  if (status === 'plan_limit') return query.eq('inactive_reason', 'plan_limit')
  return query
}

async function countOfficeClients(
  officeId: string,
  filter?: (query: OfficeClientQuery<null>) => OfficeClientQuery<null>,
) {
  if (officeId.startsWith(ADMIN_FALLBACK_OFFICE_ID_PREFIX)) return 0

  const table = await getOfficeClientsTable()
  let query = table
    .select<null>('id', { count: 'exact', head: true })
    .eq('office_id', officeId)

  if (filter) {
    query = filter(query)
  }

  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function getOfficeClientStats(officeId: string): Promise<OfficeClientStats> {
  if (officeId.startsWith(ADMIN_FALLBACK_OFFICE_ID_PREFIX)) {
    return { total: 0, active: 0, manualInactive: 0, planLimitInactive: 0 }
  }

  const [total, active, manualInactive, planLimitInactive] = await Promise.all([
    countOfficeClients(officeId),
    countOfficeClients(officeId, query => query.eq('ativo', true)),
    countOfficeClients(officeId, query => query.eq('inactive_reason', 'manual')),
    countOfficeClients(officeId, query => query.eq('inactive_reason', 'plan_limit')),
  ])

  return { total, active, manualInactive, planLimitInactive }
}

export async function listOfficeClients(
  officeId: string,
  options?: { status?: OfficeClientStatusFilter; page?: number; pageSize?: number },
) {
  const page = options?.page && options.page > 0 ? options.page : 1
  const pageSize = options?.pageSize ?? OFFICE_CLIENT_PAGE_SIZE

  if (officeId.startsWith(ADMIN_FALLBACK_OFFICE_ID_PREFIX)) {
    return {
      clients: [],
      page,
      pageSize,
      total: 0,
    }
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const table = await getOfficeClientsTable()
  const query = applyStatusFilter(
    table
      .select<OfficeClientRecord[]>(OFFICE_CLIENT_COLUMNS, { count: 'exact' })
      .eq('office_id', officeId),
    options?.status ?? 'all',
  )

  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)

  return {
    clients: data ?? [],
    page,
    pageSize,
    total: count ?? 0,
  }
}

export async function getOfficeClientById(officeId: string, clientId: string) {
  if (officeId.startsWith(ADMIN_FALLBACK_OFFICE_ID_PREFIX)) return null

  const table = await getOfficeClientsTable()
  const { data, error } = await table
    .select<OfficeClientRecord>(OFFICE_CLIENT_COLUMNS)
    .eq('office_id', officeId)
    .eq('id', clientId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function listOfficeClientSimulations(
  officeId: string,
  clientId: string,
  limit = 8,
) {
  if (officeId.startsWith(ADMIN_FALLBACK_OFFICE_ID_PREFIX)) return []

  const table = await getOfficeSimulationsTable()
  const { data, error } = await table
    .select<OfficeSimulationRecord[]>(OFFICE_SIMULATION_COLUMNS)
    .eq('office_id', officeId)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listOfficeAlerts(
  officeId: string,
  options?: { status?: 'open' | 'resolved' | 'all'; limit?: number },
) {
  if (officeId.startsWith(ADMIN_FALLBACK_OFFICE_ID_PREFIX)) return []

  const status = options?.status ?? 'open'
  const limit = options?.limit ?? 6
  const supabase = await createClient()
  const table = getOfficeAlertsTable(supabase)
  let query = table
    .select<OfficeAlertRecord[]>(OFFICE_ALERT_COLUMNS)
    .eq('office_id', officeId)

  if (status === 'open') {
    query = query.is('resolved_at', null)
  }

  if (status === 'resolved') {
    query = query.not('resolved_at', 'is', null)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  const rows = data ?? []
  const resolverIds = Array.from(new Set(rows.map(row => row.resolved_by).filter(Boolean))) as string[]
  if (resolverIds.length === 0) {
    return rows.map(row => ({ ...row, resolved_by_label: null }))
  }

  // RLS de user_profiles é "select own" (migration 001) — só o próprio usuário
  // lê o próprio perfil. Para resolver labels de OUTROS membros do escritório
  // (quem resolveu o alerta), precisamos do admin client. Escopo: apenas IDs
  // que já apareceram como `resolved_by` em alertas DESTE office (resolverIds
  // vem do query anterior já filtrado por office_id). Dados expostos: id,
  // email, nome — informação operacional necessária para a UI, baixa sensibilidade.
  // Alternativa de longo prazo: policy "user_profiles: select office members"
  // (todos do mesmo escritório se enxergam). Spec separado.
  const admin = createAdminClient()
  const profilesTable = getUserProfilesTable(admin)
  const profilesResult = await profilesTable
    .select('id, email, nome')
    .in('id', resolverIds)

  if (profilesResult.error) throw new Error(profilesResult.error.message)

  const profileLabels = new Map(
    (profilesResult.data ?? []).map(profile => [
      profile.id,
      profile.nome || profile.email,
    ]),
  )

  return rows.map(row => ({
    ...row,
    resolved_by_label: row.resolved_by ? profileLabels.get(row.resolved_by) ?? row.resolved_by : null,
  }))
}
