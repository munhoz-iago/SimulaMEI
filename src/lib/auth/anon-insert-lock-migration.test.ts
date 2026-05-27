import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(process.cwd(), 'supabase', 'migrations', '014_anon_insert_user_id_lock.sql')

describe('migration 014: anon insert user_id lock', () => {
  const sql = readFileSync(migrationPath, 'utf8')

  it('splits leads insert into anon (user_id null) and authenticated (auth.uid = user_id)', () => {
    expect(sql).toContain('drop policy if exists "leads: insert anon" on public.leads')
    expect(sql).toMatch(/create policy "leads: insert anon"[\s\S]*?to anon[\s\S]*?with check \(user_id is null\)/i)
    expect(sql).toMatch(/create policy "leads: insert authenticated"[\s\S]*?to authenticated[\s\S]*?with check \(auth\.uid\(\) = user_id\)/i)
  })

  it('splits simulations insert into anon (user_id null) and authenticated (auth.uid = user_id)', () => {
    expect(sql).toContain('drop policy if exists "simulations: insert anon" on public.simulations')
    expect(sql).toMatch(/create policy "simulations: insert anon"[\s\S]*?to anon[\s\S]*?with check \(user_id is null\)/i)
    expect(sql).toMatch(/create policy "simulations: insert authenticated"[\s\S]*?to authenticated[\s\S]*?with check \(auth\.uid\(\) = user_id\)/i)
  })

  it('tightens accountant_leads select: contador SO ve leads atribuidos (contador_id = auth.uid())', () => {
    expect(sql).toContain('drop policy if exists "accountant_leads: select contador or admin" on public.accountant_leads')

    // Strip ROLLBACK section (comments) — soh queremos validar o SQL ativo.
    const activeSql = sql.split(/^--\s*ROLLBACK:/im)[0]

    // Garante que o is null permissive sumiu (qualquer contador via leads sem contador_id antes)
    expect(activeSql).not.toMatch(/contador_id is null or contador_id = auth\.uid\(\)/i)

    // Garante que o novo SELECT amarra contador estritamente em contador_id = auth.uid()
    expect(activeSql).toMatch(
      /create policy "accountant_leads: select contador or admin"[\s\S]*?current_user_profile_role\(\) = 'contador'[\s\S]*?contador_id = auth\.uid\(\)/i,
    )
  })
})
