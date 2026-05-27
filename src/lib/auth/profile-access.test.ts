import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { canAccessAdminLeads, getProfileRole } from './profile-access'

function makeUser(email: string | null = null): User {
  return {
    id: 'user-1',
    email: email ?? undefined,
  } as User
}

describe('profile-access', () => {
  beforeEach(() => {
    process.env.ADMIN_EMAILS = ''
    process.env.ADMIN_EMAIL = ''
  })

  describe('getProfileRole', () => {
    it('promotes any user whose email is in ADMIN_EMAILS to admin', () => {
      process.env.ADMIN_EMAILS = 'owner@simulamei.com.br'
      expect(getProfileRole({ role: 'user' }, makeUser('owner@simulamei.com.br'))).toBe('admin')
    })

    it('falls back to profile.role when email is not admin', () => {
      expect(getProfileRole({ role: 'contador' }, makeUser('contador@example.com'))).toBe('contador')
      expect(getProfileRole({ role: 'user' }, makeUser('user@example.com'))).toBe('user')
    })

    it('defaults to user when profile has no role', () => {
      expect(getProfileRole(null, makeUser('a@b.com'))).toBe('user')
      expect(getProfileRole({}, makeUser('a@b.com'))).toBe('user')
    })
  })

  describe('canAccessAdminLeads', () => {
    it('grants access to admins', () => {
      expect(canAccessAdminLeads({ role: 'admin' }, makeUser('a@b.com'))).toBe(true)
    })

    it('grants access via admin email even when profile.role is user', () => {
      process.env.ADMIN_EMAIL = 'owner@simulamei.com.br'
      expect(canAccessAdminLeads({ role: 'user' }, makeUser('owner@simulamei.com.br'))).toBe(true)
    })

    it('denies access to contador (P1 audit 2026-05-27: pipeline comercial e admin-only)', () => {
      expect(canAccessAdminLeads({ role: 'contador' }, makeUser('contador@example.com'))).toBe(false)
    })

    it('denies access to user', () => {
      expect(canAccessAdminLeads({ role: 'user' }, makeUser('user@example.com'))).toBe(false)
    })

    it('denies access to unauthenticated users', () => {
      expect(canAccessAdminLeads(null, null)).toBe(false)
    })
  })
})
