import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccountantShell } from './AccountantShell'
import type { CurrentAccountantOffice } from '@/lib/accountant/server'

const office: CurrentAccountantOffice = {
  id: 'office-1',
  name: 'Prime Contabilidade',
  plan: 'starter',
  max_clients: 30,
  trial_ends_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_subscription_status: null,
  current_period_end: null,
  role: 'owner',
}

describe('AccountantShell', () => {
  it('renderiza barra lateral de atalhos no painel contador', () => {
    const html = renderToStaticMarkup(
      <AccountantShell office={office} active="dashboard">
        <section>Conteudo do painel</section>
      </AccountantShell>,
    )

    expect(html).toContain('Atalhos do painel contador')
    expect(html).toContain('href="/contador"')
    expect(html).toContain('href="/contador/clientes"')
    expect(html).toContain('href="/contador/clientes/novo"')
    expect(html).toContain('href="/contador/assinatura"')
    expect(html).toContain('Dashboard MEI')
    expect(html).toContain('aria-current="page"')
  })
})
