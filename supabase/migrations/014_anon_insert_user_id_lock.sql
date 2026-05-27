-- ============================================================
-- SimulaMEI - Migration 014: lock user_id em INSERT (anon vs authenticated)
-- Fecha mass assignment em leads/simulations onde anon podia spoofar user_id
-- e enriquecer historico de outro usuario. Tambem estreita accountant_leads
-- pra contadores so verem leads atribuidos a eles (admin ve tudo).
-- Audit P1 secundario / 2026-05-27.
-- ============================================================

-- ------------------------------------------------------------
-- 1) leads.insert: split anon (sem user_id) vs authenticated (auth.uid())
-- ------------------------------------------------------------
drop policy if exists "leads: insert anon" on public.leads;

create policy "leads: insert anon"
  on public.leads for insert
  to anon
  with check (user_id is null);

create policy "leads: insert authenticated"
  on public.leads for insert
  to authenticated
  with check (auth.uid() = user_id);

comment on policy "leads: insert anon" on public.leads is
  'P1 audit 2026-05-27: anon nunca pode setar user_id em lead (mass assignment).';
comment on policy "leads: insert authenticated" on public.leads is
  'P1 audit 2026-05-27: authenticated obrigado a usar o proprio auth.uid() como user_id.';

-- ------------------------------------------------------------
-- 2) simulations.insert: mesmo split anon vs authenticated
-- ------------------------------------------------------------
drop policy if exists "simulations: insert anon" on public.simulations;

create policy "simulations: insert anon"
  on public.simulations for insert
  to anon
  with check (user_id is null);

create policy "simulations: insert authenticated"
  on public.simulations for insert
  to authenticated
  with check (auth.uid() = user_id);

comment on policy "simulations: insert anon" on public.simulations is
  'P1 audit 2026-05-27: anon nao pode atribuir simulacao a outro user_id.';
comment on policy "simulations: insert authenticated" on public.simulations is
  'P1 audit 2026-05-27: authenticated obrigado a usar o proprio auth.uid() como user_id.';

-- ------------------------------------------------------------
-- 3) accountant_leads.select: estreitar pra contador ver SO o que e dele
--    Antes: contador via leads sem contador_id (pipeline comercial exposto).
--    Depois: contador ve so contador_id = auth.uid(); admin ve tudo.
--    Admin decide distribuicao por dashboard separado.
-- ------------------------------------------------------------
drop policy if exists "accountant_leads: select contador or admin" on public.accountant_leads;

create policy "accountant_leads: select contador or admin"
  on public.accountant_leads for select
  using (
    public.current_user_profile_role() = 'admin'
    or (
      public.current_user_profile_role() = 'contador'
      and contador_id = auth.uid()
    )
  );

comment on policy "accountant_leads: select contador or admin" on public.accountant_leads is
  'P1 audit 2026-05-27: contador ve SOMENTE leads atribuidos via contador_id; admin ve tudo. Leads sem contador_id ficam restritos a admin (fila de distribuicao).';

-- ROLLBACK:
-- drop policy if exists "accountant_leads: select contador or admin" on public.accountant_leads;
-- create policy "accountant_leads: select contador or admin"
--   on public.accountant_leads for select
--   using (
--     public.current_user_profile_role() = 'admin'
--     or (
--       public.current_user_profile_role() = 'contador'
--       and (contador_id is null or contador_id = auth.uid())
--     )
--   );
-- drop policy if exists "simulations: insert authenticated" on public.simulations;
-- drop policy if exists "simulations: insert anon" on public.simulations;
-- create policy "simulations: insert anon"
--   on public.simulations for insert
--   with check (true);
-- drop policy if exists "leads: insert authenticated" on public.leads;
-- drop policy if exists "leads: insert anon" on public.leads;
-- create policy "leads: insert anon"
--   on public.leads for insert
--   with check (true);
