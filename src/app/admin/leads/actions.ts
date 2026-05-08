'use server'

import { revalidatePath } from 'next/cache'
import { getProfileAccess } from '@/lib/auth/profile-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['novo', 'contactado', 'qualificado', 'descartado'] as const
type LeadStatus = typeof VALID_STATUSES[number]

function isValidStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && VALID_STATUSES.includes(value as LeadStatus)
}

async function requireAdminSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const access = await getProfileAccess(supabase, user)
  if (access.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function updateLeadStatus(id: string, status: string): Promise<{ error?: string }> {
  if (!id || !isValidStatus(status)) {
    return { error: 'Dados inválidos.' }
  }

  await requireAdminSession()

  try {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from('accountant_leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('[admin/leads] updateLeadStatus error:', error)
      return { error: error.message }
    }

    revalidatePath('/admin/leads')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/leads] updateLeadStatus exception:', message)
    return { error: message }
  }
}
