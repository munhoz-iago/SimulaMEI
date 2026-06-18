import { normalizeBoundedText } from '@/lib/validation'

export const ACCOUNTANT_OFFICE_PLANS = ['starter_trial', 'starter', 'pro', 'enterprise'] as const
export const ACCOUNTANT_MEMBER_ROLES = ['owner', 'admin', 'member'] as const

export type AccountantOfficePlan = typeof ACCOUNTANT_OFFICE_PLANS[number]
export type AccountantMemberRole = typeof ACCOUNTANT_MEMBER_ROLES[number]

export const ACCOUNTANT_PLAN_LIMITS: Record<AccountantOfficePlan, number> = {
  starter_trial: 30,
  starter: 30,
  pro: 150,
  enterprise: 10000,
}

/**
 * Duração padrão do trial do contador, em dias. Usado pelo onboarding ao criar
 * o escritório (trial_ends_at = created_at + ACCOUNTANT_TRIAL_DAYS) e como
 * fallback no display quando a duração real não pode ser derivada das datas.
 *
 * A UI NÃO deve hardcodar este número: a duração total é derivada de
 * (trial_ends_at - created_at) via getTrialProgress(). Esta constante existe só
 * como (1) fonte única para o onboarding e (2) fallback quando created_at está
 * ausente (ex.: office admin-fallback). Escritórios legados criados com 14 dias
 * continuam exibindo "X/14" corretamente porque a duração vem das próprias datas.
 */
const MS_PER_DAY = 1000 * 60 * 60 * 24
export const ACCOUNTANT_TRIAL_DAYS = 7

export interface TrialProgress {
  /** Dias restantes até trial_ends_at (>= 0, arredondado pra cima). */
  daysRemaining: number
  /** Duração total do trial em dias, derivada das datas quando possível. */
  totalDays: number
  /** Dias já decorridos do trial (totalDays - daysRemaining, clamp >= 0). */
  daysElapsed: number
  /** Fração decorrida [0, 1] — pronta pra largura da barra de progresso. */
  fractionElapsed: number
}

/**
 * Deriva o progresso do trial a partir das datas reais do escritório.
 *
 * - `totalDays`: round((trialEndsAt - createdAt) / dia). Cobre legados de 14d
 *   automaticamente. Se createdAt faltar ou a duração calculada for <= 0
 *   (clock skew, dados inconsistentes), cai em ACCOUNTANT_TRIAL_DAYS.
 * - `daysRemaining`: ceil((trialEndsAt - now) / dia), nunca negativo.
 *
 * Retorna null quando não há trialEndsAt (sem trial → sem barra).
 */
export function getTrialProgress(
  trialEndsAt: string | null,
  createdAt: string | null | undefined,
  now: Date = new Date(),
): TrialProgress | null {
  if (!trialEndsAt) return null

  const endMs = new Date(trialEndsAt).getTime()
  if (!Number.isFinite(endMs)) return null

  const nowMs = now.getTime()
  const daysRemaining = Math.max(0, Math.ceil((endMs - nowMs) / MS_PER_DAY))

  const startMs = createdAt ? new Date(createdAt).getTime() : NaN
  const derivedTotal = Number.isFinite(startMs)
    ? Math.round((endMs - startMs) / MS_PER_DAY)
    : NaN
  const totalDays = Number.isFinite(derivedTotal) && derivedTotal > 0
    ? derivedTotal
    : ACCOUNTANT_TRIAL_DAYS

  const daysElapsed = Math.min(totalDays, Math.max(0, totalDays - daysRemaining))
  const fractionElapsed = totalDays > 0 ? Math.min(1, Math.max(0, daysElapsed / totalDays)) : 0

  return { daysRemaining, totalDays, daysElapsed, fractionElapsed }
}

/**
 * Cor do indicador de trial conforme proximidade do fim, em PROPORÇÃO do total
 * (não em dias absolutos): verde no começo, amarelo passando da metade, vermelho
 * nos últimos ~20% ou nos últimos 2 dias (o que vier primeiro). Funciona para
 * qualquer duração (7d, 14d, etc.) sem números mágicos.
 */
export function getTrialUrgency(progress: TrialProgress): 'safe' | 'warning' | 'critical' {
  const { daysRemaining, totalDays, fractionElapsed } = progress
  const criticalDays = Math.min(2, Math.max(1, Math.ceil(totalDays * 0.2)))
  if (daysRemaining <= criticalDays || fractionElapsed >= 0.8) return 'critical'
  if (fractionElapsed >= 0.5) return 'warning'
  return 'safe'
}

export interface AccountantOfficeOnboardingPayload {
  nomeEscritorio?: unknown
  cnpj?: unknown
  telefone?: unknown
  carteiraRange?: unknown
  ferramentaAtual?: unknown
  objetivo?: unknown
}

export interface NormalizedAccountantOfficeOnboarding {
  nomeEscritorio: string
  cnpj: string | null
  telefone: string | null
  carteiraRange: string
  ferramentaAtual: string | null
  objetivo: string | null
}

export type AccountantOfficeOnboardingResult =
  | { ok: true; value: NormalizedAccountantOfficeOnboarding }
  | { ok: false; error: string }

const CNPJ_DIGITS_RE = /^\d{14}$/
const VALID_CLIENT_RANGES = new Set(['1-20', '21-50', '51-150', '150+'])

function normalizeCnpj(value: unknown) {
  if (typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  return CNPJ_DIGITS_RE.test(digits) ? digits : ''
}

export function normalizeAccountantOfficeOnboarding(
  payload: AccountantOfficeOnboardingPayload,
): AccountantOfficeOnboardingResult {
  const nomeEscritorio = normalizeBoundedText(payload.nomeEscritorio, 160)
  if (!nomeEscritorio) {
    return { ok: false, error: 'Informe o nome do escritório.' }
  }

  const cnpj = normalizeCnpj(payload.cnpj)
  if (cnpj === '') {
    return { ok: false, error: 'CNPJ deve conter 14 dígitos ou ficar em branco.' }
  }

  const carteiraRange = normalizeBoundedText(payload.carteiraRange, 16)
  if (!carteiraRange || !VALID_CLIENT_RANGES.has(carteiraRange)) {
    return { ok: false, error: 'Informe a faixa de clientes MEI gerenciados.' }
  }

  return {
    ok: true,
    value: {
      nomeEscritorio,
      cnpj,
      telefone: normalizeBoundedText(payload.telefone ?? '', 32),
      carteiraRange,
      ferramentaAtual: normalizeBoundedText(payload.ferramentaAtual ?? '', 80),
      objetivo: normalizeBoundedText(payload.objetivo ?? '', 160),
    },
  }
}

export function getAccountantPlanLimit(plan: AccountantOfficePlan | string | null | undefined) {
  if (plan && plan in ACCOUNTANT_PLAN_LIMITS) {
    return ACCOUNTANT_PLAN_LIMITS[plan as AccountantOfficePlan]
  }

  return ACCOUNTANT_PLAN_LIMITS.starter_trial
}
