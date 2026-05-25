-- ============================================================
-- SimulaMEI - Migration 012: Accountant trial check-ins
-- Registra o aviso diario in-app do trial contador.
-- ============================================================

create table if not exists public.accountant_trial_checkins (
  id             uuid primary key default uuid_generate_v4(),
  office_id      uuid not null references public.accountant_offices(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  shown_on       date not null,
  shown_at       timestamptz not null default now(),
  answered_at    timestamptz,
  satisfaction   text check (satisfaction in ('satisfied', 'not_yet', 'pain')),
  pain_point     text check (pain_point in ('cadastro_clientes', 'alertas', 'relatorio_pdf', 'fator_r', 'importacao_planilha', 'outro')),
  free_text      text check (free_text is null or char_length(free_text) <= 500),
  cta_clicked_at timestamptz,
  dismissed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (office_id, user_id, shown_on)
);

drop trigger if exists on_accountant_trial_checkins_updated on public.accountant_trial_checkins;
create trigger on_accountant_trial_checkins_updated
  before update on public.accountant_trial_checkins
  for each row execute procedure public.handle_updated_at();

create index if not exists idx_accountant_trial_checkins_office_shown
  on public.accountant_trial_checkins(office_id, shown_on desc);

create index if not exists idx_accountant_trial_checkins_user_shown
  on public.accountant_trial_checkins(user_id, shown_on desc);

create index if not exists idx_accountant_trial_checkins_answered
  on public.accountant_trial_checkins(office_id, answered_at desc)
  where answered_at is not null;

alter table public.accountant_trial_checkins enable row level security;

drop policy if exists "accountant_trial_checkins: select member" on public.accountant_trial_checkins;
create policy "accountant_trial_checkins: select member"
  on public.accountant_trial_checkins for select
  using (public.is_office_member(office_id));

drop policy if exists "accountant_trial_checkins: insert own member" on public.accountant_trial_checkins;
create policy "accountant_trial_checkins: insert own member"
  on public.accountant_trial_checkins for insert
  with check (
    public.is_office_member(office_id)
    and auth.uid() = user_id
  );

drop policy if exists "accountant_trial_checkins: update own member" on public.accountant_trial_checkins;
create policy "accountant_trial_checkins: update own member"
  on public.accountant_trial_checkins for update
  using (
    public.is_office_member(office_id)
    and auth.uid() = user_id
  )
  with check (
    public.is_office_member(office_id)
    and auth.uid() = user_id
  );

comment on table public.accountant_trial_checkins is
  'Respostas diarias do check-in in-app exibido para escritorios contadores em trial.';

comment on column public.accountant_trial_checkins.shown_on is
  'Dia local America/Sao_Paulo usado para limitar uma exibicao por usuario e escritorio.';

-- ROLLBACK:
-- drop policy if exists "accountant_trial_checkins: update own member" on public.accountant_trial_checkins;
-- drop policy if exists "accountant_trial_checkins: insert own member" on public.accountant_trial_checkins;
-- drop policy if exists "accountant_trial_checkins: select member" on public.accountant_trial_checkins;
-- drop table if exists public.accountant_trial_checkins;
