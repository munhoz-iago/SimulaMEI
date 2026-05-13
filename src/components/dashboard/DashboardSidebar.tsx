'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/auth/logout/action'

interface NavItem {
  href: string
  label: string
  /** Pathname exato pra marcar como ativo. null = nunca ativo (link externo ao dashboard). */
  match: string | null
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/?from=dashboard', label: 'Página inicial', match: null,
    icon: <><path d="M3 12l9-9 9 9"/><path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/></>,
  },
  {
    href: '/dashboard', label: 'Dashboard', match: '/dashboard',
    icon: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
  },
  {
    href: '/dashboard/simular', label: 'Nova simulação', match: '/dashboard/simular',
    icon: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
  },
  {
    href: '/dashboard/relatorio', label: 'Relatório', match: '/dashboard/relatorio',
    icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  },
  {
    href: '/aprenda', label: 'Aprenda', match: null,
    icon: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside aria-label="Navegação do dashboard" className="db-sidebar">
      <div className="db-sidebar-inner">
        {/* Logo mark */}
        <Link href="/?from=dashboard" className="db-sidebar-logo" aria-label="Início">
          <div style={{ width: 32, height: 32, background: 'var(--lime)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-on-accent)" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="db-nav-label" style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>
            Simula<span style={{ color: 'var(--lime)' }}>MEI</span>
          </span>
        </Link>

        {/* Nav items */}
        <nav className="db-sidebar-nav">
          {NAV_ITEMS.map(item => {
            const isActive = item.match !== null && pathname === item.match
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className="db-nav-item"
                data-active={isActive}
              >
                <span className="db-nav-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {item.icon}
                  </svg>
                </span>
                <span className="db-nav-label">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom: logout */}
        <form action={logoutAction} className="db-sidebar-bottom">
          <button
            type="submit"
            aria-label="Sair"
            className="db-nav-item db-nav-item-button"
          >
            <span className="db-nav-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            <span className="db-nav-label">Sair</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
