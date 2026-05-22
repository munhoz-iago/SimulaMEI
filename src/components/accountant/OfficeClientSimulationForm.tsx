'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ResultadoSimulacao } from '@/types/tributario'
import { getCnae } from '@/lib/tributario'
import type { OfficeClientRecord } from '@/lib/accountant/server'
import { SimulatorSection } from '@/components/simulador/SimulatorSection'
import { FullResults } from '@/components/resultado/FullResults'

interface OfficeClientSimulationFormProps {
  client: OfficeClientRecord
  defaultMonth: number
}

export function OfficeClientSimulationForm({ client, defaultMonth }: OfficeClientSimulationFormProps) {
  const router = useRouter()
  const [resultado, setResultado] = useState<ResultadoSimulacao | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const initialValues = useMemo(() => ({
    fat: 0,
    mes: defaultMonth,
    cnae: getCnae(client.cnae) ?? null,
    prolabore: 0,
    temProlabore: false,
  }), [client.cnae, defaultMonth])

  function handleResults(res: ResultadoSimulacao) {
    setResultado(res)
    router.refresh()
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{
        border: '1px solid rgba(75,158,255,0.22)',
        background: 'rgba(75,158,255,0.06)',
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
        color: 'var(--text2)',
        fontSize: 13,
        lineHeight: 1.55,
      }}>
        Use o mesmo motor da simulação pública, com prévia ao vivo, autocomplete oficial de CNAE,
        Fator R, folha detalhada e salvamento automático no histórico de <b style={{ color: 'var(--text1)' }}>{client.name}</b>.
      </div>

      <SimulatorSection
        onResults={handleResults}
        submitUrl={`/api/accountant/clients/${client.id}/simulate`}
        submitButtonLabel="Salvar e ver análise"
        loadingLabel="Salvando..."
        calcLinkHref="/?from=dashboard#como-calcula"
        initialValues={initialValues}
      />

      {resultado && (
        <div ref={resultRef} style={{ scrollMarginTop: 16 }}>
          <div style={{
            border: '1px solid rgba(200,241,53,0.22)',
            background: 'rgba(200,241,53,0.07)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
            color: 'var(--text2)',
            fontSize: 13,
            lineHeight: 1.55,
            marginBottom: 14,
          }}>
            <b style={{ color: 'var(--lime)' }}>Simulação salva.</b>{' '}
            O diagnóstico já está no histórico fiscal do cliente.
            <Link
              href={`/contador/clientes/${client.id}`}
              style={{ color: 'var(--lime)', fontWeight: 900, marginLeft: 8, textDecoration: 'none' }}
            >
              Ver perfil
            </Link>
          </div>

          <FullResults
            resultado={resultado}
            email={`Cliente: ${client.name}`}
            reportHref={null}
            primaryAction={{
              href: `/contador/clientes/${client.id}`,
              label: 'Ver perfil do cliente',
            }}
          />
        </div>
      )}
    </div>
  )
}
