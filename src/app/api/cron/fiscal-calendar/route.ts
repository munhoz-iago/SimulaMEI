import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getFiscalCalendarItems } from '@/lib/monitor'
import { sendFiscalCalendarEmail } from '@/lib/resend'

interface CalendarProfileRow {
  id: string
  email: string
  nome: string | null
  mes_atual: number | null
  tipo_mei: 'geral' | 'caminhoneiro' | null
  calendario_fiscal_opt_in: boolean
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profiles, error } = await admin
    .from('user_profiles')
    .select('id, email, nome, mes_atual, tipo_mei, calendario_fiscal_opt_in')
    .not('onboarding_completed_at', 'is', null)
    .eq('calendario_fiscal_opt_in', true)
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (profiles ?? []) as CalendarProfileRow[]
  let sent = 0
  for (const profile of rows) {
    const items = getFiscalCalendarItems({
      nome: profile.nome ?? 'Cliente',
      tipoMei: profile.tipo_mei ?? 'geral',
      anexoAtual: 'III',
      elegivelFatorR: false,
      // Cron sem contexto rico do dashboard — usa defaults seguros pra DAS/DASN-SIMEI apenas
      totalLancamentos: 0,
      regime: 'mei',
    })

    const result = await sendFiscalCalendarEmail({
      to: profile.email,
      nome: profile.nome ?? 'Cliente',
      items,
    })

    if (!(result as { skipped?: boolean }).skipped) {
      sent += 1
    }
  }

  return NextResponse.json({ ok: true, sent })
}
