import Link from 'next/link'
import type { ReactNode } from 'react'

const TABS = [
  { id: 'monitor', label: 'Monitor mensal' },
  { id: 'fator-r', label: 'Fator R' },
  { id: 'simulacoes', label: 'Simulações' },
  { id: 'agenda', label: 'Agenda fiscal' },
  { id: 'conta', label: 'Conta' },
] as const

export type DashboardTab = typeof TABS[number]['id']

export function parseDashboardTab(raw: string | string[] | undefined): DashboardTab {
  const v = Array.isArray(raw) ? raw[0] : raw
  return TABS.some(t => t.id === v) ? (v as DashboardTab) : 'monitor'
}

interface Props {
  active: DashboardTab
  children: Record<DashboardTab, ReactNode>
}

export function DashboardTabs({ active, children }: Props) {
  return (
    <>
      <div
        role="tablist"
        aria-label="Seções do dashboard"
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--border)',
          marginBottom: 20,
          overflowX: 'auto',
        }}
      >
        {TABS.map(t => {
          const isActive = active === t.id
          return (
            <Link
              key={t.id}
              role="tab"
              aria-selected={isActive}
              href={`?aba=${t.id}`}
              scroll={false}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                color: isActive ? 'var(--text1)' : 'var(--text3)',
                borderBottom: isActive ? '2px solid var(--lime)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </Link>
          )
        })}
      </div>
      <div>{children[active]}</div>
    </>
  )
}
