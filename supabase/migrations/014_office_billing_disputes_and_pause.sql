-- ============================================================
-- SimulaMEI - Migration 014: Disputes tracking + paused status
-- Suporte para 4 webhooks Stripe ausentes:
--   - invoice.payment_failed       -> status='past_due'
--   - customer.subscription.paused -> status='paused' (novo enum)
--   - charge.refunded              -> status='canceled' + revert plan
--   - charge.dispute.created       -> disputed_at flagged + email admin
-- ============================================================

-- 1) Adiciona 'paused' ao CHECK de office_subscriptions.status
--    O Stripe pode pausar uma subscription (ex: trial bypass payment failure)
--    e antes desta migration esse estado era mapeado pra 'past_due' (lossy).
alter table public.office_subscriptions
  drop constraint if exists office_subscriptions_status_check;

alter table public.office_subscriptions
  add constraint office_subscriptions_status_check
  check (status in ('pending', 'trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete', 'unpaid'));

-- 2) Coluna pra flag de dispute (chargeback) no escritorio.
--    Nao bloqueia uso imediato — disputas podem ser resolvidas a favor do
--    merchant — mas exige tracking pra dashboard admin e notificacao por email.
alter table public.accountant_offices
  add column if not exists disputed_at timestamptz;

create index if not exists idx_accountant_offices_disputed
  on public.accountant_offices(disputed_at)
  where disputed_at is not null;

comment on column public.accountant_offices.disputed_at is
  'Timestamp de chargeback aberto via charge.dispute.created. Limpa quando dispute eh resolvida.';

-- ROLLBACK:
-- drop index if exists idx_accountant_offices_disputed;
-- alter table public.accountant_offices drop column if exists disputed_at;
-- alter table public.office_subscriptions drop constraint if exists office_subscriptions_status_check;
-- alter table public.office_subscriptions
--   add constraint office_subscriptions_status_check
--   check (status in ('pending', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid'));
