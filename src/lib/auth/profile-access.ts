import type { User } from '@supabase/supabase-js'
import { isOnboardingComplete, type UserProfileOnboarding } from '@/lib/onboarding'
import { isAdminEmail } from './admin-access'

export type UserRole = 'user' | 'contador' | 'admin'

export type AccessProfile = Partial<UserProfileOnboarding> & {
  role?: UserRole | null
}

interface SupabaseProfileReader {
  // Supabase query builders are thenable Postgrest builders; keeping this
  // structural avoids leaking generated database types into middleware.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: 'user_profiles'): any
}

export function getProfileRole(profile: AccessProfile | null | undefined, user: User | null) {
  if (isAdminEmail(user?.email)) return 'admin'
  return profile?.role ?? 'user'
}

export function canAccessAdminLeads(profile: AccessProfile | null | undefined, user: User | null) {
  // P1 audit 2026-05-27: contador NAO acessa /admin/leads (pipeline comercial e admin-only).
  // Contadores tem seu proprio dashboard em /contador; /admin/* e reservado a admins.
  const role = getProfileRole(profile, user)
  return role === 'admin'
}

export function hasCompletedRequiredProfile(profile: AccessProfile | null | undefined, user: User | null) {
  if (isAdminEmail(user?.email)) return true
  return isOnboardingComplete(profile)
}

export async function getProfileAccess(supabase: SupabaseProfileReader, user: User) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return {
      profile: null,
      role: getProfileRole(null, user),
      isComplete: false,
      error: error.message,
    }
  }

  return {
    profile: data,
    role: getProfileRole(data, user),
    isComplete: hasCompletedRequiredProfile(data, user),
    error: null,
  }
}
