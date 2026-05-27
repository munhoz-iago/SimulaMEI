-- ============================================================
-- SimulaMEI - Migration 013: WITH CHECK em UPDATE policies
-- Fecha mass assignment em office_members.role/office_id e
-- accountant_offices.owner_user_id.
-- Audit P1.4 / 2026-05-26.
-- ============================================================

-- office_members: admin pode atualizar registro do escritório,
-- mas NÃO pode mudar office_id nem promover pra 'owner' (role
-- 'owner' só é setada na criação inicial do office).
drop policy if exists "office_members: update admin" on public.office_members;
create policy "office_members: update admin"
  on public.office_members for update
  using (public.is_office_admin(office_id))
  with check (
    public.is_office_admin(office_id)
    and role in ('admin', 'member')
    -- role='owner' explicitamente excluído: ownership não-transferível por UPDATE
  );

-- accountant_offices: admin pode atualizar settings do office,
-- mas owner_user_id é imutável (transferência de ownership
-- exige fluxo separado de validação).
drop policy if exists "accountant_offices: update admin" on public.accountant_offices;
create policy "accountant_offices: update admin"
  on public.accountant_offices for update
  using (public.is_office_admin(id))
  with check (
    public.is_office_admin(id)
    -- owner_user_id imutável: WITH CHECK compara com row existente.
    -- Postgres avalia WITH CHECK no NOVO valor; pra travar imutabilidade,
    -- usamos trigger BEFORE UPDATE.
  );

-- Trigger BEFORE UPDATE pra travar owner_user_id imutável
-- (RLS WITH CHECK não consegue comparar OLD vs NEW; trigger sim).
create or replace function public.prevent_owner_user_id_change()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'owner_user_id é imutável via UPDATE (use fluxo de transferência separado)'
      using errcode = '42501';  -- insufficient_privilege
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_owner_change on public.accountant_offices;
create trigger prevent_owner_change
  before update on public.accountant_offices
  for each row execute procedure public.prevent_owner_user_id_change();

comment on function public.prevent_owner_user_id_change() is
  'P1.4 audit 2026-05-26: bloqueia mass assignment de owner_user_id via UPDATE.';

-- ROLLBACK:
-- drop trigger if exists prevent_owner_change on public.accountant_offices;
-- drop function if exists public.prevent_owner_user_id_change();
-- drop policy if exists "office_members: update admin" on public.office_members;
-- drop policy if exists "accountant_offices: update admin" on public.accountant_offices;
-- create policy "office_members: update admin"
--   on public.office_members for update
--   using (public.is_office_admin(office_id));
-- create policy "accountant_offices: update admin"
--   on public.accountant_offices for update
--   using (public.is_office_admin(id));
