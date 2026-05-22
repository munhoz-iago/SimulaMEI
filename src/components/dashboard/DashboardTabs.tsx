'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useTransition } from 'react'
import { TABS, type DashboardTab } from './dashboard-tabs-shared'

// Re-exporta o tipo pra preservar callers que importavam dele aqui.
// (Tipos cruzam o boundary client/server sem problema — só funções/valores
// disparam o erro "X is on the client".)
export type { DashboardTab }

interface Props {
  active: DashboardTab
  /** Notifica o pai sobre transição em andamento (pra aplicar opacity no content). */
  onPendingChange?: (pending: boolean) => void
}

/** Renderiza apenas a barra de abas. O conteúdo de cada aba é renderizado
 *  pelo chamador via conditional `activeTab === 'X' && (...)` — mantém o
 *  acoplamento baixo e evita passar JSX longo via prop record.
 *
 *  Usa `useTransition` pra interceptar clicks left-only e marcar o trecho
 *  como não-bloqueante. Ctrl/cmd/shift/middle-click continuam funcionando
 *  via Link nativo (nova aba). */
export function DashboardTabs({ active, onPendingChange }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    onPendingChange?.(isPending)
  }, [isPending, onPendingChange])

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    // Preserva modifier keys e botões não-primários — deixa o Link nativo agir.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    startTransition(() => {
      router.push(href)
    })
  }

  return (
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
        const href = `?aba=${t.id}`
        // Tab clicada (destino da navegação) recebe o estilo de loading
        // + aria-busy — é ela que está "carregando", não a ativa.
        // A ativa fica intacta visualmente até a navegação concluir.
        const isTabPending = isPending && !isActive
        return (
          <Link
            key={t.id}
            role="tab"
            aria-selected={isActive}
            aria-busy={isTabPending}
            data-pending={isTabPending || undefined}
            href={href}
            scroll={false}
            onClick={e => handleClick(e, href)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              color: isActive ? 'var(--text1)' : 'var(--text3)',
              borderBottom: isActive ? '2px solid var(--lime)' : '2px solid transparent',
              marginBottom: -1,
              opacity: isTabPending ? 0.5 : 1,
              transition: 'opacity 120ms ease',
            }}
          >
            {t.label}
            {isTabPending && (
              <span aria-hidden="true" style={{ marginLeft: 6, color: 'var(--text3)' }}>·</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
