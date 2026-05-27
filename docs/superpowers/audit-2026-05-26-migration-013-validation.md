# Validação Migration 013 — WITH CHECK + trigger imutabilidade

**Audit ref**: P1.4 / multiagent scan 2026-05-26
**Migration**: `supabase/migrations/013_rls_with_check_immutable_columns.sql`
**Aplicação**: manual via Supabase Dashboard SQL Editor (mesmo fluxo da migration 012)

## Vulnerabilidades cobertas

### V1 — `office_members.role` mass assignment
- **Antes**: UPDATE policy só tinha `USING (is_office_admin(office_id))`, sem `WITH CHECK`.
- **Exploit**: admin (não owner) podia executar `UPDATE office_members SET role='owner' WHERE id=<x>` ou trocar `office_id` pra sequestrar membership de outro tenant.
- **Fix**: `WITH CHECK (is_office_admin(office_id) and role in ('admin', 'member'))` rejeita promoção a `owner` e exige que `office_id` final ainda seja admin pelo caller.

### V2 — `accountant_offices.owner_user_id` mass assignment
- **Antes**: UPDATE policy só tinha `USING (is_office_admin(id))`, sem `WITH CHECK`.
- **Exploit**: admin podia executar `UPDATE accountant_offices SET owner_user_id=<UUID arbitrário> WHERE id=<x>` — transferência de ownership não-autorizada.
- **Fix**: trigger `BEFORE UPDATE` em `accountant_offices` que `raise exception` quando `NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id`. RLS WITH CHECK sozinho não resolve porque não compara OLD vs NEW.

## Queries de validação manual (executar em staging)

Pré-requisito: existir um office com pelo menos 2 membros (owner + admin), e estar autenticado como **admin** (não owner) via Supabase Dashboard ou JWT de teste.

```sql
-- Setup: pegar IDs reais pra testar
select id, owner_user_id, name from accountant_offices limit 1;
-- => office_id=<X>, owner_user_id=<OWNER>

select id, user_id, role from office_members where office_id='<X>' order by role;
-- => esperado: 1 owner, N admins/members
```

### Validation 1 — `office_members` WITH CHECK rejeita `role='owner'`

```sql
-- Como admin, tentar se promover (ou promover qualquer member) a owner:
update office_members
   set role = 'owner'
 where office_id = '<X>'
   and user_id = '<UM_MEMBER>';

-- Esperado: ERROR 42501 (new row violates row-level security policy)
--           ou "0 rows affected" dependendo do client.
-- Antes do fix: succeeded silently (privilege escalation).
```

### Validation 2 — trigger bloqueia troca de `owner_user_id`

```sql
-- Como admin, tentar trocar owner do office:
update accountant_offices
   set owner_user_id = '00000000-0000-0000-0000-000000000000'
 where id = '<X>';

-- Esperado: ERROR 42501 — "owner_user_id é imutável via UPDATE
--           (use fluxo de transferência separado)"
-- Antes do fix: succeeded — ownership sequestrada.
```

### Validation 3 — updates legítimos continuam funcionando

```sql
-- Como admin, mudar nome do office (campo permitido):
update accountant_offices
   set name = 'Novo Nome Escritório'
 where id = '<X>';
-- Esperado: 1 row affected.

-- Como admin, mudar role de member pra admin (transição válida):
update office_members
   set role = 'admin'
 where office_id = '<X>'
   and user_id = '<UM_MEMBER>'
   and role = 'member';
-- Esperado: 1 row affected.

-- Como admin, mudar role de admin pra member (rebaixamento válido):
update office_members
   set role = 'member'
 where office_id = '<X>'
   and user_id = '<UM_ADMIN>'
   and role = 'admin';
-- Esperado: 1 row affected.
```

### Validation 4 — owner consegue manter owner_user_id em UPDATEs idempotentes

```sql
-- Como owner, atualizar campo benigno (owner_user_id no SET com mesmo valor):
update accountant_offices
   set name = 'Escritório do Owner',
       owner_user_id = owner_user_id  -- no-op
 where id = '<X>';
-- Esperado: 1 row affected. Trigger só bloqueia mudança real (IS DISTINCT FROM).
```

## Plano de aplicação em produção

1. Abrir Supabase Dashboard → SQL Editor → New query.
2. Colar conteúdo de `013_rls_with_check_immutable_columns.sql`.
3. Executar e confirmar que retorna `Success. No rows returned.`.
4. Rodar Validations 1–4 acima em sequência num office de teste.
5. Logar resultado no checklist de migration deploys.

## Riscos de rollback

- **Rollback é seguro**: drops idempotentes recriam as policies originais sem dados perdidos (DDL puro, sem mutação de rows).
- Bloco de ROLLBACK no fim do SQL inclui re-criação das policies originais (sem WITH CHECK) caso seja necessário reverter rapidamente.
- **Importante**: enquanto migration 013 estiver ativa, qualquer endpoint que precise legitimamente transferir ownership de office (UI futura) precisa rodar via `service_role` (bypassa RLS+trigger) com validação de aplicação.

## Conformidade com migrations anteriores

- `is_office_admin()` (definido em migration 008) continua sendo a única função de autorização — não duplicamos lógica.
- Trigger usa `SECURITY DEFINER` + `SET search_path = public, pg_temp` consistente com outras funções do projeto.
- `errcode = '42501'` (insufficient_privilege) é o mesmo código usado por RLS — clients que já tratam erros de RLS pegam isto sem mudanças.
