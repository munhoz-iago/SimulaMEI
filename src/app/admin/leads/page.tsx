import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui'
import { LeadStatusSelect } from './LeadStatusSelect'

interface AccountantLead {
  id: string
  email: string
  nome_escritorio: string
  telefone: string | null
  carteira_range: string
  ferramenta_atual: string | null
  status: string
  created_at: string
}

const STATUS_COLOR: Record<string, string> = {
  novo: 'var(--text3)',
  contactado: 'var(--yellow)',
  qualificado: 'var(--lime)',
  descartado: 'var(--red)',
}

const STATUS_LABEL: Record<string, string> = {
  novo: 'Novo',
  contactado: 'Contactado',
  qualificado: 'Qualificado',
  descartado: 'Descartado',
}

const CARTEIRA_COLOR: Record<string, string> = {
  '1-20': 'var(--text3)',
  '21-50': 'var(--text2)',
  '51-150': 'var(--orange)',
  '150+': 'var(--orange)',
}

const STATUS_OPTIONS = ['novo', 'contactado', 'qualificado', 'descartado']
const CARTEIRA_OPTIONS = ['1-20', '21-50', '51-150', '150+']
const PAGE_SIZE = 50

function toFetchErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

interface PageProps {
  searchParams: Promise<{ status?: string; carteira?: string; page?: string }>
}

function parsePage(value: string | undefined) {
  const page = Number(value ?? '1')
  return Number.isInteger(page) && page > 0 ? page : 1
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const filterStatus = STATUS_OPTIONS.includes(sp.status ?? '') ? sp.status : undefined
  const filterCarteira = CARTEIRA_OPTIONS.includes(sp.carteira ?? '') ? sp.carteira : undefined
  const currentPage = parsePage(sp.page)
  const offset = (currentPage - 1) * PAGE_SIZE

  let leads: AccountantLead[] = []
  let totalLeads = 0
  let fetchError: string | null = null

  try {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (admin as any)
      .from('accountant_leads')
      .select('id,email,nome_escritorio,telefone,carteira_range,ferramenta_atual,status,created_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })

    if (filterStatus) query = query.eq('status', filterStatus)
    if (filterCarteira) query = query.eq('carteira_range', filterCarteira)

    const { data, error, count } = await query.range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    leads = data ?? []
    totalLeads = count ?? leads.length
  } catch (err) {
    fetchError = toFetchErrorMessage(err)
    console.error('[admin/leads] fetch error:', fetchError)
  }

  const totalPages = Math.max(1, Math.ceil(totalLeads / PAGE_SIZE))
  const buildPageHref = (page: number) => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterCarteira) params.set('carteira', filterCarteira)
    if (page > 1) params.set('page', String(page))
    const query = params.toString()
    return query ? `/admin/leads?${query}` : '/admin/leads'
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Leads Contadores</h1>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>
          {totalLeads} {totalLeads === 1 ? 'lead encontrado' : 'leads encontrados'}
        </span>
      </div>

      {/* Filtros */}
      <form method="GET" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Status filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text3)' }}>Status</label>
          <select
            name="status"
            defaultValue={filterStatus ?? ''}
            style={selectStyle}
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>

        {/* Carteira filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text3)' }}>Carteira</label>
          <select
            name="carteira"
            defaultValue={filterCarteira ?? ''}
            style={selectStyle}
          >
            <option value="">Todas</option>
            {CARTEIRA_OPTIONS.map(c => (
              <option key={c} value={c}>{c} clientes</option>
            ))}
          </select>
        </div>

        <button type="submit" style={btnStyle}>Filtrar</button>
        {(filterStatus || filterCarteira) && (
          <a href="/admin/leads" style={{ ...btnStyle, background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' }}>
            Limpar
          </a>
        )}
        <a href="/api/leads/export" style={{ ...btnStyle, background: 'var(--bg2)', color: 'var(--text1)', border: '1px solid var(--border)' }}>
          Baixar modelo Excel
        </a>
      </form>

      {fetchError && (
        <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>Erro: {fetchError}</p>
      )}

      {/* Tabela */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
              {['Escritório', 'E-mail', 'Telefone', 'Carteira', 'Ferramenta', 'Data', 'Status', ''].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text3)' }}>
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
            {leads.map((lead, i) => (
              <tr
                key={lead.id}
                style={{
                  borderBottom: i < leads.length - 1 ? '1px solid var(--border)' : 'none',
                  background: i % 2 === 0 ? 'var(--bg1)' : 'transparent',
                }}
              >
                <td style={{ ...tdStyle, fontWeight: lead.carteira_range === '150+' ? 700 : 400 }}>
                  {lead.nome_escritorio}
                </td>
                <td style={{ ...tdStyle, color: 'var(--text2)' }}>{lead.email}</td>
                <td style={{ ...tdStyle, color: 'var(--text3)' }}>{lead.telefone ?? '—'}</td>
                <td style={tdStyle}>
                  <Badge color={CARTEIRA_COLOR[lead.carteira_range] ?? 'var(--text3)'} small>
                    {lead.carteira_range}
                  </Badge>
                </td>
                <td style={{ ...tdStyle, color: 'var(--text3)' }}>{lead.ferramenta_atual ?? '—'}</td>
                <td style={{ ...tdStyle, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                  {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td style={tdStyle}>
                  <Badge color={STATUS_COLOR[lead.status] ?? 'var(--text3)'} small>
                    {STATUS_LABEL[lead.status] ?? lead.status}
                  </Badge>
                </td>
                <td style={{ ...tdStyle, minWidth: 130 }}>
                  <LeadStatusSelect id={lead.id} current={lead.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Paginação de leads"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 }}
        >
          <a
            href={buildPageHref(Math.max(1, currentPage - 1))}
            aria-disabled={currentPage <= 1}
            style={{
              ...btnStyle,
              pointerEvents: currentPage <= 1 ? 'none' : 'auto',
              opacity: currentPage <= 1 ? 0.45 : 1,
            }}
          >
            Anterior
          </a>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            Página {currentPage} de {totalPages}
          </span>
          <a
            href={buildPageHref(Math.min(totalPages, currentPage + 1))}
            aria-disabled={currentPage >= totalPages}
            style={{
              ...btnStyle,
              pointerEvents: currentPage >= totalPages ? 'none' : 'auto',
              opacity: currentPage >= totalPages ? 0.45 : 1,
            }}
          >
            Próxima
          </a>
        </nav>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text3)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  verticalAlign: 'middle',
}

const selectStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '5px 10px',
  borderRadius: 6,
  border: '1px solid var(--border2)',
  background: 'var(--bg2)',
  color: 'var(--text1)',
}

const btnStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '5px 14px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--lime)',
  color: 'var(--ink-on-accent)',
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
}
