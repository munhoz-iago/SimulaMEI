-- ============================================================
-- SimulaMEI — Migration 011: role hardening, quota RPCs and monitor batching
-- ============================================================

-- user_profiles.role must never be writable by the client. RLS keeps the
-- update scoped to the current row; column grants keep privileged fields out.
drop policy if exists "user_profiles: update own" on public.user_profiles;
drop policy if exists "user_profiles: update own profile fields" on public.user_profiles;

create policy "user_profiles: update own profile fields"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (
      select up.role
        from public.user_profiles up
       where up.id = auth.uid()
    )
  );

revoke update on public.user_profiles from anon, authenticated;

grant update (
  nome,
  nome_negocio,
  telefone,
  cnae_principal,
  tipo_mei,
  municipio,
  uf,
  faturamento_mensal_estimado,
  faturamento_acumulado_atual,
  folha_mensal,
  mes_atual,
  objetivo_principal,
  atividades_realizadas,
  onboarding_completed_at,
  calendario_fiscal_opt_in,
  alertas_email_ativos
) on public.user_profiles to authenticated;

create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_updated_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if p_role not in ('user', 'contador', 'admin') then
    raise exception 'Invalid role' using errcode = '22023';
  end if;

  select up.role
    into v_actor_role
    from public.user_profiles up
   where up.id = auth.uid();

  if v_actor_role <> 'admin' then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  update public.user_profiles
     set role = p_role
   where id = p_user_id
   returning id into v_updated_user_id;

  if v_updated_user_id is null then
    raise exception 'User profile not found' using errcode = 'P0002';
  end if;

  return v_updated_user_id;
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public;
grant execute on function public.set_user_role(uuid, text) to authenticated;

create or replace function public.increment_quota(p_api_key_id uuid)
returns table(requests_month integer, monthly_limit integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.api_keys ak
     set requests_month = coalesce(ak.requests_month, 0) + 1,
         last_used_at = now()
   where ak.id = p_api_key_id
     and ak.revoked_at is null
     and coalesce(ak.requests_month, 0) < case ak.tier
       when 'pro' then 500000
       else 1000
     end
   returning
     ak.requests_month,
     case ak.tier
       when 'pro' then 500000
       else 1000
     end;
end;
$$;

revoke all on function public.increment_quota(uuid) from public;
grant execute on function public.increment_quota(uuid) to service_role;

create index if not exists idx_office_simulations_office_client_created
  on public.office_simulations(office_id, client_id, created_at desc);

create or replace function public.get_latest_simulations_by_office(p_office_id uuid)
returns table(
  id uuid,
  office_id uuid,
  client_id uuid,
  performed_by uuid,
  entrada jsonb,
  resultado jsonb,
  tax_rule_version text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select distinct on (os.client_id)
    os.id,
    os.office_id,
    os.client_id,
    os.performed_by,
    os.entrada,
    os.resultado,
    os.tax_rule_version,
    os.created_at
  from public.office_simulations os
  where os.office_id = p_office_id
  order by os.client_id, os.created_at desc;
$$;

revoke all on function public.get_latest_simulations_by_office(uuid) from public;
grant execute on function public.get_latest_simulations_by_office(uuid) to service_role;

create index if not exists idx_accountant_leads_status_created
  on public.accountant_leads(status, created_at desc);

create index if not exists idx_accountant_leads_carteira_created
  on public.accountant_leads(carteira_range, created_at desc);

-- ROLLBACK:
-- drop index if exists public.idx_accountant_leads_carteira_created;
-- drop index if exists public.idx_accountant_leads_status_created;
-- drop function if exists public.get_latest_simulations_by_office(uuid);
-- drop index if exists public.idx_office_simulations_office_client_created;
-- drop function if exists public.increment_quota(uuid);
-- drop function if exists public.set_user_role(uuid, text);
-- drop policy if exists "user_profiles: update own profile fields" on public.user_profiles;
