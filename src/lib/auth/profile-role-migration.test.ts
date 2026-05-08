import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(process.cwd(), 'supabase', 'migrations', '011_role_security_and_quota_rpcs.sql')

describe('role hardening migration', () => {
  it('locks profile role updates behind grants and an admin-only RPC', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('drop policy if exists "user_profiles: update own"')
    expect(sql).toContain('revoke update on public.user_profiles from anon, authenticated')
    expect(sql).toContain('create or replace function public.set_user_role')
    expect(sql).toContain("v_actor_role <> 'admin'")

    const grantUpdateMatch = sql.match(/grant update \(([\s\S]+?)\) on public\.user_profiles to authenticated;/i)
    expect(grantUpdateMatch?.[1]).toBeDefined()
    expect(grantUpdateMatch?.[1]).not.toMatch(/\brole\b/i)
  })
})
