import { getAccountantPlanLimit, type AccountantOfficePlan } from './office'
import type { CurrentAccountantOffice } from './server'

export type AccountantBillingKind =
  | 'active'
  | 'trialing'
  | 'trial_expired'
  | 'pending'
  | 'past_due'
  | 'paused'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'setup_required'
  | 'enterprise'

export type AccountantBillingSeverity = 'ok' | 'info' | 'warn' | 'danger'

export interface AccountantBillingState {
  kind: AccountantBillingKind
  severity: AccountantBillingSeverity
  restricted: boolean
  plan: AccountantOfficePlan
  planLabel: string
  statusLabel: string
  headline: string
  description: string
  actionLabel: string
  actionHref: string
  clientLimit: number
  currentPeriodEnd: string | null
  trialEndsAt: string | null
}

const PLAN_LABELS: Record<AccountantOfficePlan, string> = {
  starter_trial: 'Trial Starter',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

const STATUS_LABELS: Record<AccountantBillingKind, string> = {
  active: 'Ativa',
  trialing: 'Trial ativo',
  trial_expired: 'Trial encerrado',
  pending: 'Checkout pendente',
  past_due: 'Pagamento pendente',
  paused: 'Assinatura pausada',
  unpaid: 'Pagamento vencido',
  canceled: 'Cancelada',
  incomplete: 'Pagamento incompleto',
  setup_required: 'Configuração pendente',
  enterprise: 'Contrato Enterprise',
}

function isPast(value: string | null, now: Date) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) && timestamp < now.getTime()
}

function normalizeStatus(status: string | null): AccountantBillingKind {
  if (status === 'active') return 'active'
  if (status === 'trialing') return 'trialing'
  if (status === 'past_due') return 'past_due'
  if (status === 'paused') return 'paused'
  if (status === 'unpaid') return 'unpaid'
  if (status === 'canceled') return 'canceled'
  if (status === 'incomplete' || status === 'incomplete_expired') return 'incomplete'
  if (status === 'pending') return 'pending'
  return 'setup_required'
}

export function getAccountantBillingState(
  office: CurrentAccountantOffice,
  now = new Date(),
): AccountantBillingState {
  const clientLimit = office.max_clients || getAccountantPlanLimit(office.plan)

  if (office.plan === 'enterprise') {
    return {
      kind: 'enterprise',
      severity: 'ok',
      restricted: false,
      plan: office.plan,
      planLabel: PLAN_LABELS.enterprise,
      statusLabel: STATUS_LABELS.enterprise,
      headline: 'Contrato Enterprise ativo',
      description: 'O escritório está fora do fluxo automático de cobrança e segue o contrato comercial.',
      actionLabel: 'Falar com comercial',
      actionHref: '/para-contadores',
      clientLimit,
      currentPeriodEnd: office.current_period_end,
      trialEndsAt: office.trial_ends_at,
    }
  }

  if (office.plan === 'starter_trial') {
    const expired = isPast(office.trial_ends_at, now)
    return {
      kind: expired ? 'trial_expired' : 'trialing',
      severity: expired ? 'danger' : 'warn',
      restricted: expired,
      plan: office.plan,
      planLabel: PLAN_LABELS.starter_trial,
      statusLabel: expired ? STATUS_LABELS.trial_expired : STATUS_LABELS.trialing,
      headline: expired ? 'Trial encerrado' : 'Trial do contador em andamento',
      description: expired
        ? 'Escolha um plano para continuar cadastrando clientes e registrando novas simulações.'
        : 'O escritório está em validação. Assine Starter ou Pro antes do fim do trial para manter a carteira ativa.',
      actionLabel: 'Escolher plano',
      actionHref: '/upgrade/contador',
      clientLimit,
      currentPeriodEnd: office.current_period_end,
      trialEndsAt: office.trial_ends_at,
    }
  }

  const kind = normalizeStatus(office.stripe_subscription_status)
  const restricted = kind === 'past_due'
    || kind === 'paused'
    || kind === 'unpaid'
    || kind === 'canceled'
    || kind === 'incomplete'
  const severity: AccountantBillingSeverity = restricted
    ? 'danger'
    : kind === 'active' || kind === 'trialing'
      ? 'ok'
      : 'warn'

  return {
    kind,
    severity,
    restricted,
    plan: office.plan,
    planLabel: PLAN_LABELS[office.plan],
    statusLabel: STATUS_LABELS[kind],
    headline: restricted ? 'Assinatura exige atenção' : 'Assinatura do escritório',
    description: restricted
      ? 'É preciso regularizar a assinatura no Stripe para continuar cadastrando clientes e registrando novas simulações.'
      : kind === 'setup_required'
        ? 'Configure o checkout recorrente para manter o plano do escritório sincronizado.'
        : 'O plano está sincronizado com a cobrança recorrente do escritório.',
    actionLabel: restricted ? 'Atualizar pagamento' : 'Gerenciar assinatura',
    actionHref: restricted ? '/contador/assinatura' : office.stripe_customer_id ? '/contador/assinatura' : '/upgrade/contador',
    clientLimit,
    currentPeriodEnd: office.current_period_end,
    trialEndsAt: office.trial_ends_at,
  }
}

export function isAccountantBillingRestricted(state: AccountantBillingState) {
  return state.restricted
}

export function getAccountantBillingRestrictionMessage(action: 'create_client' | 'simulate') {
  if (action === 'create_client') {
    return 'Regularize a assinatura do escritório para cadastrar novos clientes.'
  }

  return 'Regularize a assinatura do escritório para registrar novas simulações.'
}
