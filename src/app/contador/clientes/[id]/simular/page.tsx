import { notFound, redirect } from 'next/navigation'
import { AccountantShell } from '@/components/accountant/AccountantShell'
import { OfficeClientSimulationForm } from '@/components/accountant/OfficeClientSimulationForm'
import { getCurrentAccountantOffice, getOfficeClientById } from '@/lib/accountant/server'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Simular cliente — SimulaMEI',
  description: 'Simulação fiscal vinculada a cliente do escritório contábil.',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AccountantClientSimulationPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=/contador/clientes/${id}/simular`)
  }

  const { office, error } = await getCurrentAccountantOffice(supabase, user.id, user.email)
  if (error) throw new Error(`Accountant client simulation office query failed: ${error}`)
  if (!office) redirect('/onboarding/contador')

  const client = await getOfficeClientById(office.id, id)
  if (!client) notFound()

  const defaultMonth = new Date().getMonth() + 1

  return (
    <AccountantShell office={office} active="clients">
      <section style={{ border: '1px solid var(--border)', background: 'var(--bg1)', borderRadius: 'var(--radius-lg)', padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontSize: 24, marginBottom: 8 }}>Simular {client.name}</h2>
        <p style={{ color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>
          A simulação será salva no histórico do cliente e ficará disponível no perfil do escritório.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            `CNAE: ${client.cnae}`,
            `Tipo: ${client.tipo_mei === 'caminhoneiro' ? 'MEI caminhoneiro' : 'MEI geral'}`,
            `Status: ${client.ativo ? 'Ativo' : 'Pausado'}`,
          ].map(item => (
            <span
              key={item}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 999,
                background: 'var(--bg2)',
                color: 'var(--text2)',
                padding: '6px 9px',
                fontSize: 12,
                fontWeight: 850,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </section>

      {client.ativo ? (
        <OfficeClientSimulationForm client={client} defaultMonth={defaultMonth} />
      ) : (
        <div role="alert" style={{ border: '1px solid rgba(255, 193, 7, .35)', background: 'rgba(255, 193, 7, .1)', color: 'var(--yellow)', borderRadius: 'var(--radius)', padding: 14 }}>
          Reative o cliente antes de criar uma nova simulação.
        </div>
      )}
    </AccountantShell>
  )
}
