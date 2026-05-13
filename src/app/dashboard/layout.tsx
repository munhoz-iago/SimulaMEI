import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { getDashboardContext } from '@/lib/dashboard/context'

/**
 * Layout do /dashboard/*: sidebar persistente + estrutura compartilhada.
 *
 * Todas as páginas filhas (/dashboard, /dashboard/simular, /dashboard/relatorio)
 * herdam essa shell — usuário não sai do contexto do dashboard pra navegar.
 *
 * Auth + onboarding são checados em getDashboardContext, que redireciona
 * automaticamente se o usuário não estiver logado ou não tiver completado
 * o onboarding.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Side-effect: força auth check + redirect se necessário (early-exit)
  await getDashboardContext()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg0)', color: 'var(--text1)' }}>
      <DashboardSidebar />
      <main style={{ flex: 1, minWidth: 0, padding: '32px 32px 56px', overflowX: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
