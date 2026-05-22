'use client'

import { useEffect, useState } from 'react'
import { DashboardTabs, type DashboardTab } from './DashboardTabs'

interface Props {
  active: DashboardTab
  children: React.ReactNode
}

/** Wrapper client que casa o `<DashboardTabs>` com a área de conteúdo:
 *  recebe o `isPending` da tab bar e aplica feedback visual no content
 *  (opacity + pointer-events: none) durante a transição. Renderiza ainda
 *  `<PendingSkeletonOverlay>` (barra fina no topo) APENAS quando a
 *  transição passa de 200ms — evita flash em navegações rápidas. */
export function DashboardTabsClient({ active, children }: Props) {
  const [isPending, setIsPending] = useState(false)

  return (
    <>
      <DashboardTabs active={active} onPendingChange={setIsPending} />
      <div
        aria-busy={isPending || undefined}
        style={{
          opacity: isPending ? 0.5 : 1,
          transition: 'opacity 200ms ease',
          pointerEvents: isPending ? 'none' : 'auto',
        }}
      >
        {children}
      </div>
      {isPending && <PendingSkeletonOverlay />}
    </>
  )
}

/** Barra fina no topo, estilo NProgress/GitHub. Aparece SOMENTE após 200ms
 *  de pending contínuo — em navegações <200ms nunca renderiza, evita flash. */
function PendingSkeletonOverlay() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null
  return (
    <div
      role="progressbar"
      aria-label="Carregando aba"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'linear-gradient(90deg, transparent, var(--lime), transparent)',
        backgroundSize: '50% 100%',
        backgroundRepeat: 'no-repeat',
        animation: 'tab-loading-bar 1.2s ease-in-out infinite',
        zIndex: 999,
        pointerEvents: 'none',
      }}
    />
  )
}
