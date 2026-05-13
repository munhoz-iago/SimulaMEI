import Link from 'next/link'
import type { OfficeClientRecord } from '@/lib/accountant/server'

interface OfficeClientTableProps {
  clients: OfficeClientRecord[]
}

function getStatus(client: OfficeClientRecord) {
  if (client.ativo) return { label: 'Ativo', color: 'var(--lime)', bg: 'rgba(200,241,53,0.1)', border: 'rgba(200,241,53,0.24)' }
  if (client.inactive_reason === 'plan_limit') return { label: 'Pausado por plano', color: 'var(--orange)', bg: 'rgba(255,140,0,0.1)', border: 'rgba(255,140,0,0.24)' }
  return { label: 'Pausado', color: 'var(--yellow)', bg: 'rgba(245,197,66,0.1)', border: 'rgba(245,197,66,0.24)' }
}

/** Pega iniciais do nome (até 2 caracteres) */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Gera cor do avatar baseado no nome (determinístico) */
function getAvatarColor(name: string): string {
  const colors = ['var(--lime)', 'var(--blue)', 'var(--yellow)', 'var(--orange)', 'var(--red)']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return colors[Math.abs(hash) % colors.length]
}

export function OfficeClientTable({ clients }: OfficeClientTableProps) {
  if (clients.length === 0) {
    return (
      <div className="acc-card" style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>Nenhum cliente nesta visão</h2>
        <p style={{ color: 'var(--text3)', fontSize: 13, lineHeight: 1.6, margin: '0 0 18px', maxWidth: 420, marginInline: 'auto' }}>
          Cadastre o primeiro cliente para iniciar a carteira do escritório. Você pode importar lista pronta ou cadastrar um a um.
        </p>
        <Link
          href="/contador/clientes/novo"
          className="dashboard-action dashboard-primary-action"
          style={{ padding: '10px 16px', fontSize: 13, fontWeight: 800, display: 'inline-flex', gap: 6, alignItems: 'center' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Cadastrar cliente
        </Link>
      </div>
    )
  }

  return (
    <div className="acc-card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['Cliente', 'CNAE', 'Localização', 'Status', ''].map(h => (
                <th
                  key={h || 'action'}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: 'var(--text3)',
                    fontSize: 10, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((client, i) => {
              const status = getStatus(client)
              const initials = getInitials(client.name)
              const avatarColor = getAvatarColor(client.name)
              const location = [client.municipio, client.uf].filter(Boolean).join(' / ') || 'Não informado'
              return (
                <tr
                  key={client.id}
                  className="acc-table-row"
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        aria-hidden
                        style={{
                          width: 32, height: 32,
                          borderRadius: 8,
                          background: `${avatarColor}1f`,
                          border: `1px solid ${avatarColor}44`,
                          color: avatarColor,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 900,
                          flexShrink: 0,
                          fontFamily: 'var(--mono)',
                        }}
                      >
                        {initials}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {client.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {client.email ?? 'Sem e-mail cadastrado'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                    {client.cnae}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                    {location}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: status.bg,
                      border: `1px solid ${status.border}`,
                      fontSize: 11, fontWeight: 700,
                      color: status.color,
                      whiteSpace: 'nowrap',
                    }}>
                      <span aria-hidden style={{
                        width: 6, height: 6, borderRadius: 99,
                        background: status.color,
                        boxShadow: client.ativo ? `0 0 4px ${status.color}` : 'none',
                      }} />
                      {status.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Link
                      href={`/contador/clientes/${client.id}`}
                      className="pressable"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        color: 'var(--text2)',
                        fontSize: 12, fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'all 160ms var(--ease-out)',
                      }}
                    >
                      Abrir
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
