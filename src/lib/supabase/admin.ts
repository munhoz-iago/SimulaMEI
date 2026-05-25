import 'server-only'
import { createClient } from '@supabase/supabase-js'

let adminClient: ReturnType<typeof createClient> | null = null

/**
 * Cliente Supabase com service role. Bypassa RLS.
 *
 * Use apenas quando nao ha contexto de usuario ou quando a operacao exige
 * privilegio administrativo explicito: webhooks Stripe, cron jobs, cascade
 * de exclusao de conta e bootstrap/onboarding controlado. Para rotas e
 * paginas autenticadas comuns, use `createClient()` de `supabase/server`,
 * que preserva RLS e isolamento multi-tenant.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials are missing.')
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return adminClient
}
