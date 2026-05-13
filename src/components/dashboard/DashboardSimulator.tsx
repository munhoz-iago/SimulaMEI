'use client'

import { useCallback, useRef, useState } from 'react'
import type { ResultadoSimulacao } from '@/types/tributario'
import { SimulatorSection } from '@/components/simulador/SimulatorSection'
import { FullResults } from '@/components/resultado/FullResults'
import { useScrollReveal } from '@/lib/useScrollReveal'

interface DashboardSimulatorProps {
  /** E-mail do usuário logado — usado pra renderizar FullResults sem gate */
  userEmail: string
}

/**
 * Simulador integrado ao /dashboard/simular.
 *
 * Diferenças vs SimulatorSection da home:
 * - Sem PartialResults + EmailGate: o usuário já está logado, então a captura
 *   de e-mail seria redundante. Mostramos FullResults direto.
 * - Auto-scroll suave para o resultado depois de rodar a simulação.
 * - Reusa SimulatorSection (formulário) e FullResults (análise completa).
 */
export function DashboardSimulator({ userEmail }: DashboardSimulatorProps) {
  useScrollReveal() // Sem isso, [data-reveal] do SimulatorSection fica invisible
  const [resultado, setResultado] = useState<ResultadoSimulacao | null>(null)
  const resultadoRef = useRef<HTMLDivElement>(null)

  const handleResults = useCallback((res: ResultadoSimulacao) => {
    setResultado(res)
    setTimeout(() => {
      resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  return (
    <>
      <SimulatorSection
        onResults={handleResults}
        // No dashboard a seção 'Como calcula' não está disponível inline.
        // Aponta pra home com bypass do redirect pra preservar a explicação.
        calcLinkHref="/?from=dashboard#como-calcula"
      />

      {resultado && (
        <div ref={resultadoRef} style={{ scrollMarginTop: 16 }}>
          <FullResults resultado={resultado} email={userEmail} />
        </div>
      )}
    </>
  )
}
