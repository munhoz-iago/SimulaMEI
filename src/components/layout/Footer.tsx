import Link from 'next/link'
import { TAX_RULE_VERSION } from '@/lib/tributario'

const FOOTER_COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: 'Produto',
    links: [
      { label: 'Simulador', href: '/#simulador' },
      { label: 'Como calcula', href: '/#como-calcula' },
      { label: 'Para contadores', href: '/para-contadores' },
      { label: 'API', href: '/api-docs' },
    ],
  },
  {
    title: 'Aprenda',
    links: [
      { label: 'Central de conteúdo', href: '/aprenda' },
      { label: 'O que é Fator R', href: '/aprenda/fator-r' },
      { label: 'Quando sair do MEI', href: '/aprenda/quando-sair-do-mei' },
      { label: 'Anexo III vs V', href: '/aprenda/diferenca-anexo-iii-e-v' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacidade', href: '/privacidade' },
      { label: 'Termos', href: '/termos' },
      { label: 'GitHub', href: '/github' },
    ],
  },
]

export function Footer() {
  const year = new Date().getFullYear()
  const versionLabel = TAX_RULE_VERSION.replace('BR-MEI-SN-', 'v')

  return (
    <footer
      style={{
        padding: '48px 40px 24px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg1)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="footer-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr repeat(3, 1fr)',
          gap: 40,
          marginBottom: 32,
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 24, height: 24, background: 'var(--lime)',
                borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink-on-accent)" strokeWidth="3">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                </svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
                Simula<span style={{ color: 'var(--lime)' }}>MEI</span>
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, margin: 0, maxWidth: 280 }}>
              Simulador tributário para MEI e Simples Nacional. Motor auditável, base oficial de CNAEs, sem cadastro.
            </p>
            <span style={{ display: 'inline-block', marginTop: 12, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
              Motor {versionLabel}
            </span>
          </div>

          {/* Columns */}
          {FOOTER_COLUMNS.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 14 }}>
                {col.title}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(({ label, href }) => (
                  <li key={href}>
                    <Link href={href} className="footer-link" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 12,
          color: 'var(--text3)',
        }}>
          <span>© {year} SimulaMEI. Não é consultoria tributária.</span>
          <span>Estimativas baseadas em regras vigentes — confirme com contador habilitado.</span>
        </div>
      </div>
    </footer>
  )
}
