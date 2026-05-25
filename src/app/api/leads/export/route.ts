import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { isAdminEmail } from '@/lib/auth/admin-access'
import { applyRateLimitHeaders, consumeRateLimit } from '@/lib/security/rate-limit'
import { sanitizeXlsxCell } from '@/lib/security/xlsx-injection'
import { createClient } from '@/lib/supabase/server'

interface AccountantLeadExportRow {
  nome_escritorio: string | null
  email: string | null
  telefone: string | null
  carteira_range: string | null
  ferramenta_atual: string | null
  status: string | null
  created_at: string | null
}

const EXPORT_ROW_LIMIT = 1000
const EXPORT_RATE_LIMIT = 10

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const rateLimit = await consumeRateLimit({
    namespace: 'leads_export',
    subjectHash: user.id,
    limit: EXPORT_RATE_LIMIT,
    windowSeconds: 60 * 60,
  })

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      NextResponse.json({ error: 'Limite de exportações atingido.' }, { status: 429 }),
      rateLimit,
      EXPORT_RATE_LIMIT,
    )
  }

  const { data, error } = await supabase
    .from('accountant_leads')
    .select('nome_escritorio,email,telefone,carteira_range,ferramenta_atual,status,created_at')
    .order('created_at', { ascending: false })
    .range(0, EXPORT_ROW_LIMIT - 1)

  if (error) {
    console.error('[/api/leads/export] fetch error:', error.message)
    return NextResponse.json({ error: 'Não foi possível exportar leads.' }, { status: 500 })
  }

  const rows = ((data ?? []) as AccountantLeadExportRow[]).map(lead => ({
    nome: sanitizeXlsxCell(lead.nome_escritorio ?? ''),
    CNPJ: '',
    email: sanitizeXlsxCell(lead.email ?? ''),
    regime: '',
    faturamento_mensal: '',
    telefone: sanitizeXlsxCell(lead.telefone ?? ''),
    carteira_range: sanitizeXlsxCell(lead.carteira_range ?? ''),
    ferramenta_atual: sanitizeXlsxCell(lead.ferramenta_atual ?? ''),
    status: sanitizeXlsxCell(lead.status ?? ''),
    criado_em: lead.created_at ?? '',
  }))

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('leads')
  worksheet.columns = [
    { header: 'nome', key: 'nome' },
    { header: 'CNPJ', key: 'CNPJ' },
    { header: 'email', key: 'email' },
    { header: 'regime', key: 'regime' },
    { header: 'faturamento_mensal', key: 'faturamento_mensal' },
    { header: 'telefone', key: 'telefone' },
    { header: 'carteira_range', key: 'carteira_range' },
    { header: 'ferramenta_atual', key: 'ferramenta_atual' },
    { header: 'status', key: 'status' },
    { header: 'criado_em', key: 'criado_em' },
  ]
  worksheet.addRows(rows.length > 0 ? rows : [{}])
  const buffer = await workbook.xlsx.writeBuffer()

  return applyRateLimitHeaders(new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="simulamei-leads.xlsx"',
    },
  }), rateLimit, EXPORT_RATE_LIMIT)
}
