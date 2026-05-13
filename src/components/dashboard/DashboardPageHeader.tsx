import Link from 'next/link'
import { TAX_RULE_VERSION } from '@/lib/tributario'
import { PLAN_ACCENT_COLORS, PLAN_LABELS } from '@/constants/plans'
import { Pill } from '@/components/dashboard/Pill'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

interface DashboardPageHeaderProps {
  /** Saudação principal — ex: "Bom dia, Iago" */
  greeting: string
  /** Texto secundário sob a saudação */
  subtitle: string
  /** Plano do usuário (free|pro) */
  plan: keyof typeof PLAN_LABELS
  /** Slot extra à direita do header (opcional) */
  actions?: React.ReactNode
}

/**
 * Header reusável das páginas internas do dashboard.
 * Mantém saudação, motor version, plano, theme toggle e botão de página inicial
 * em todas as sub-rotas pra evitar fadiga de mudança de contexto.
 */
export function DashboardPageHeader({ greeting, subtitle, plan, actions }: DashboardPageHeaderProps) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, gap: 20, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          {greeting}
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 13, margin: 0 }}>
          {subtitle}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        {actions}
        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          Motor {TAX_RULE_VERSION}
        </span>
        <Pill color={PLAN_ACCENT_COLORS[plan]}>
          {PLAN_LABELS[plan]}
        </Pill>
        <ThemeToggle size={32} />
        <Link
          href="/?from=dashboard"
          className="dashboard-action dashboard-secondary-action"
          style={{
            padding: '7px 12px', fontSize: 12, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12l9-9 9 9"/>
            <path d="M5 10v10a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V10"/>
          </svg>
          Página inicial
        </Link>
      </div>
    </header>
  )
}
