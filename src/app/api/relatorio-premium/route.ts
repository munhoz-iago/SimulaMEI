import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { hasReportAccess } from '@/lib/auth/report-access'
import { isResultadoVazio, RELATORIO_VAZIO_MSG } from '@/lib/reports/reportEligibility'
import { reportFingerprint } from '@/lib/reports/reportFingerprint'
import { applyRateLimitHeaders, consumeRateLimit } from '@/lib/security/rate-limit'
import { gerarOportunidadesFiscais } from '@/lib/tributario'
import { SimulationReportDocument } from '@/lib/reports/SimulationReportDocument'
import type { ResultadoSimulacao } from '@/types/tributario'

interface SimulationRow {
  resultado: ResultadoSimulacao
}

// P2: gera PDF (CPU pesado + lê fonte do disco). 20/h cobre uso real
// (re-download depois de ajuste, share via Vercel preview) sem permitir
// fuzz scripts que esgotam CPU em loop.
const PREMIUM_RATE_LIMIT = 20

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória para gerar relatório premium.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { user_id?: string }
  if (body.user_id && body.user_id !== user.id) {
    return NextResponse.json({ error: 'user_id não pertence à sessão atual.' }, { status: 403 })
  }

  const rateLimit = await consumeRateLimit({
    namespace: 'relatorio_premium',
    subjectHash: user.id,
    limit: PREMIUM_RATE_LIMIT,
    windowSeconds: 60 * 60,
  })

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      NextResponse.json({ error: 'Limite de geração de relatórios atingido. Tente novamente mais tarde.' }, { status: 429 }),
      rateLimit,
      PREMIUM_RATE_LIMIT,
    )
  }

  const [{ data: profile }, { data: purchases }, { data: simulations }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('plano')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('purchases')
      .select('report_fingerprint')
      .eq('user_id', user.id)
      .eq('produto', 'relatorio')
      .eq('status', 'paid'),
    supabase
      .from('simulations')
      .select('resultado')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const latest = (simulations?.[0] as SimulationRow | undefined)?.resultado
  if (!latest) {
    return NextResponse.json({ error: 'Nenhuma simulação encontrada para gerar o relatório.' }, { status: 404 })
  }

  if (isResultadoVazio(latest)) {
    return NextResponse.json({ error: RELATORIO_VAZIO_MSG }, { status: 422 })
  }

  const currentFp = reportFingerprint(latest.entrada)
  const paidFps = (purchases ?? [])
    .map(p => (p as { report_fingerprint: string | null }).report_fingerprint)
    .filter(Boolean) as string[]
  const hasAccess = hasReportAccess({
    plan: profile?.plano,
    paidFingerprints: paidFps,
    currentFingerprint: currentFp,
  })
  if (!hasAccess) {
    return NextResponse.json({ error: 'Pagamento ou Plano Pro obrigatório para gerar relatório premium.' }, { status: 403 })
  }

  const oportunidades = gerarOportunidadesFiscais(latest)
  const pdfElement = React.createElement(SimulationReportDocument, {
    email: user.email ?? 'cliente@simulamei.com.br',
    resultado: latest,
    oportunidades,
    variant: 'full',
  }) as unknown as React.ReactElement<DocumentProps>
  const buffer = await renderToBuffer(pdfElement)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="simulamei-relatorio-premium.pdf"',
    },
  })
}
