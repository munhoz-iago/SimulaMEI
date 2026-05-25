import { createClient } from '@/lib/supabase/server'
import type { CurrentAccountantOffice } from './server'

export type TrialCheckinSatisfaction = 'satisfied' | 'not_yet' | 'pain'

export type TrialCheckinPainPoint =
  | 'cadastro_clientes'
  | 'alertas'
  | 'relatorio_pdf'
  | 'fator_r'
  | 'importacao_planilha'
  | 'outro'

export interface TrialCheckinRecord {
  id: string
  office_id: string
  user_id: string
  shown_on: string
  shown_at: string
  answered_at: string | null
  satisfaction: TrialCheckinSatisfaction | null
  pain_point: TrialCheckinPainPoint | null
  free_text: string | null
  cta_clicked_at: string | null
  dismissed_at: string | null
  created_at: string
  updated_at: string
}

interface DbError {
  message: string
}

interface QueryResult<T> {
  data: T
  error: DbError | null
}

interface TrialCheckinQuery<T> {
  eq(column: string, value: unknown): TrialCheckinQuery<T>
  maybeSingle(): Promise<QueryResult<T | null>>
}

interface TrialCheckinsTable {
  select<T = TrialCheckinRecord>(columns: string): TrialCheckinQuery<T>
}

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo'
const TRIAL_CHECKIN_COLUMNS = [
  'id',
  'office_id',
  'user_id',
  'shown_on',
  'shown_at',
  'answered_at',
  'satisfaction',
  'pain_point',
  'free_text',
  'cta_clicked_at',
  'dismissed_at',
  'created_at',
  'updated_at',
].join(', ')

export const TRIAL_CHECKIN_SATISFACTIONS = ['satisfied', 'not_yet', 'pain'] as const
export const TRIAL_CHECKIN_PAIN_POINTS = [
  'cadastro_clientes',
  'alertas',
  'relatorio_pdf',
  'fator_r',
  'importacao_planilha',
  'outro',
] as const

export function getSaoPauloDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

function isTrialActive(office: CurrentAccountantOffice, now: Date) {
  if (office.plan !== 'starter_trial') return false
  if (!office.trial_ends_at) return true

  const timestamp = new Date(office.trial_ends_at).getTime()
  return Number.isFinite(timestamp) && timestamp >= now.getTime()
}

export function shouldShowTrialCheckin(
  office: CurrentAccountantOffice,
  todayCheckin: TrialCheckinRecord | null,
  now = new Date(),
) {
  if (!isTrialActive(office, now)) return false
  return todayCheckin?.shown_on !== getSaoPauloDateKey(now)
}

export function isTrialCheckinSatisfaction(value: unknown): value is TrialCheckinSatisfaction {
  return typeof value === 'string'
    && TRIAL_CHECKIN_SATISFACTIONS.includes(value as TrialCheckinSatisfaction)
}

export function isTrialCheckinPainPoint(value: unknown): value is TrialCheckinPainPoint {
  return typeof value === 'string'
    && TRIAL_CHECKIN_PAIN_POINTS.includes(value as TrialCheckinPainPoint)
}

export async function getTodayTrialCheckin(
  officeId: string,
  userId: string,
  now = new Date(),
) {
  // RLS-enforced: server SSR client respeita policies de accountant_trial_checkins
  // (is_office_member para SELECT). Vide spec 2026-05-25-accountant-rls-enforced-design.md.
  const supabase = await createClient()
  const table = supabase.from('accountant_trial_checkins') as unknown as TrialCheckinsTable
  const result = await table
    .select<TrialCheckinRecord>(TRIAL_CHECKIN_COLUMNS)
    .eq('office_id', officeId)
    .eq('user_id', userId)
    .eq('shown_on', getSaoPauloDateKey(now))
    .maybeSingle()

  if (result.error) {
    throw new Error(result.error.message)
  }

  return result.data
}

export { TRIAL_CHECKIN_COLUMNS }
