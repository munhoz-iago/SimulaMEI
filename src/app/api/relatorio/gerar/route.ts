import React from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { hasReportAccess } from '@/lib/auth/report-access'
import { isResultadoVazio, RELATORIO_VAZIO_MSG } from '@/lib/reports/reportEligibility'
import { reportFingerprint } from '@/lib/reports/reportFingerprint'
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

  const url = new URL(req.url)
  const purchaseId = url.searchParams.get('purchase')
  if (purchaseId) {
    const { data: pur } = await supabase
      .from('purchases')
      .select('user_id, status, produto, report_fingerprint, simulation_id')
      .eq('id', purchaseId)
      .maybeSingle()
    if (!pur) return NextResponse.json({ error: 'Compra não encontrada.' }, { status: 404 })
    if ((pur as { user_id: string }).user_id !== user.id)
      return NextResponse.json({ error: 'Compra de outro usuário.' }, { status: 403 })
    if ((pur as { status: string }).status !== 'paid' || (pur as { produto: string }).produto !== 'relatorio')
      return NextResponse.json({ error: 'Compra não habilita relatório.' }, { status: 402 })

    let simRow: { resultado: ResultadoSimulacao } | undefined
    const simId = (pur as { simulation_id: string | null }).simulation_id
    if (simId) {
      const { data } = await supabase
        .from('simulations')
        .select('resultado')
        .eq('id', simId)
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) simRow = data as { resultado: ResultadoSimulacao }
    }
    if (!simRow) {
      const fp = (pur as { report_fingerprint: string | null }).report_fingerprint
      if (fp) {
        const { data: cands } = await supabase
          .from('simulations')
          .select('resultado')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        simRow = (cands as Array<{ resultado: ResultadoSimulacao }> | null)
          ?.find(s => reportFingerprint(s.resultado.entrada) === fp)
      }
    }
    if (!simRow)
      return NextResponse.json({ error: 'Relatório indisponível — refaça a simulação com os mesmos dados.' }, { status: 422 })

    const r = simRow.resultado
    const buffer = await renderToBuffer(React.createElement(SimulationReportDocument, {
      email: user.email ?? 'cliente@simulamei.com.br',
      resultado: r,
      oportunidades: gerarOportunidadesFiscais(r),
      variant: 'full',
    }) as unknown as React.ReactElement<DocumentProps>)
    return new NextResponse(new Uint8Array(buffer), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="simulamei-relatorio.pdf"' },
    })
  }

  const [{ data: profile }, { data: purchases }, { data: simulations }] = await Promise.all([
    supabase.from('user_profiles').select('plano').eq('id', user.id).maybeSingle(),
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
  const isPreview = new URL(req.url).searchParams.get('preview') === '1'

  if (!isPreview && !hasAccess) {
    return NextResponse.json({ error: 'Compra necessária para o PDF completo.' }, { status: 402 })
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
