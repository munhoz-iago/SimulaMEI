import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { canAccessAdminLeads, getProfileAccess } from '@/lib/auth/profile-access'
import { createAdminClient } from '@/lib/supabase/admin'
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

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
  }

  const access = await getProfileAccess(supabase, user)
  if (!canAccessAdminLeads(access.profile, user)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('accountant_leads')
    .select('nome_escritorio,email,telefone,carteira_range,ferramenta_atual,status,created_at')
    .order('created_at', { ascending: false })
    .range(0, EXPORT_ROW_LIMIT - 1)

  if (error) {
    console.error('[/api/leads/export] fetch error:', error.message)
    return NextResponse.json({ error: 'Não foi possível exportar leads.' }, { status: 500 })
  }

  const rows = ((data ?? []) as AccountantLeadExportRow[]).map(lead => ({
    nome: lead.nome_escritorio ?? '',
    CNPJ: '',
    email: lead.email ?? '',
    regime: '',
    faturamento_mensal: '',
    telefone: lead.telefone ?? '',
    carteira_range: lead.carteira_range ?? '',
    ferramenta_atual: lead.ferramenta_atual ?? '',
    status: lead.status ?? '',
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

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="simulamei-leads.xlsx"',
    },
  })
}
