import React from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { hasReportAccess } from '@/lib/auth/report-access'
import { isResultadoVazio, RELATORIO_VAZIO_MSG } from '@/lib/reports/reportEligibility'
import { gerarOportunidadesFiscais } from '@/lib/tributario'
import { SimulationReportDocument } from '@/lib/reports/SimulationReportDocument'
import type { ResultadoSimulacao } from '@/types/tributario'

interface SimulationRow {
  resultado: ResultadoSimulacao
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória para gerar o relatório.' }, { status: 401 })
  }

  const [{ data: profile }, { data: purchases }, { data: simulations }] = await Promise.all([
    supabase.from('user_profiles').select('plano').eq('id', user.id).maybeSingle(),
    supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('produto', 'relatorio')
      .eq('status', 'paid')
      .limit(1),
    supabase
      .from('simulations')
      .select('resultado')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const hasAccess = hasReportAccess(profile?.plano, purchases?.length ?? 0)
  const isPreview = new URL(req.url).searchParams.get('preview') === '1'

  if (!isPreview && !hasAccess) {
    return NextResponse.json({ error: 'Compra necessária para o PDF completo.' }, { status: 402 })
  }

  const latest = (simulations?.[0] as SimulationRow | undefined)?.resultado
  if (!latest) {
    return NextResponse.json({ error: 'Nenhuma simulação encontrada para gerar o relatório.' }, { status: 404 })
  }

  if (isResultadoVazio(latest)) {
    return NextResponse.json({ error: RELATORIO_VAZIO_MSG }, { status: 422 })
  }

  const variant = isPreview && !hasAccess ? 'preview' : 'full'
  const oportunidades = gerarOportunidadesFiscais(latest)
  const pdfElement = React.createElement(SimulationReportDocument, {
    email: user.email ?? 'cliente@simulamei.com.br',
    resultado: latest,
    oportunidades,
    variant,
  }) as unknown as React.ReactElement<DocumentProps>
  const buffer = await renderToBuffer(pdfElement)

  const disposition = variant === 'preview'
    ? 'inline; filename="simulamei-relatorio-preview.pdf"'
    : 'attachment; filename="simulamei-relatorio.pdf"'

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
    },
  })
}
