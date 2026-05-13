'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ResultadoSimulacao, CnaeInfo } from '@/types/tributario'
import { SimulatorSection } from '@/components/simulador/SimulatorSection'
import { FullResults } from '@/components/resultado/FullResults'
import { useScrollReveal } from '@/lib/useScrollReveal'
import { getCnae } from '@/lib/tributario'

interface DashboardSimulatorProps {
  /** E-mail do usuário logado — usado pra renderizar FullResults sem gate */
  userEmail: string
  /** Resumo do Monitor mensal pra prefill (média mensal, último CNAE, etc.) */
  monitorPrefill?: {
    averageMonthly: number
    cnaeCode: string
    avgFolhaMes: number
  }
}

/**
 * Simulador integrado ao /dashboard/simular.
 *
 * Lê ?prefill=monitor e ?focus=fatorR da URL pra carregar dados do Monitor
 * mensal automaticamente — evita re-digitar faturamento/CNAE/folha que já
 * estão no histórico.
 *
 * Diferenças vs SimulatorSection da home:
 * - Sem PartialResults + EmailGate (usuário logado)
 * - Auto-scroll suave para o resultado depois de rodar
 * - Reusa SimulatorSection (formulário) e FullResults (análise completa)
 */
export function DashboardSimulator({ userEmail, monitorPrefill }: DashboardSimulatorProps) {
  useScrollReveal()
  const searchParams = useSearchParams()
  const [resultado, setResultado] = useState<ResultadoSimulacao | null>(null)
  const resultadoRef = useRef<HTMLDivElement>(null)

  const prefillRequested = searchParams?.get('prefill') === 'monitor'
  const focusFatorR = searchParams?.get('focus') === 'fatorR' || searchParams?.get('focus') === 'prolabore'

  // Constrói valores iniciais a partir do Monitor mensal SE prefill foi pedido
  const initialValues = useMemo(() => {
    if (!prefillRequested || !monitorPrefill) return undefined

    const cnaeInfo: CnaeInfo | null = monitorPrefill.cnaeCode
      ? getCnae(monitorPrefill.cnaeCode) ?? null
      : null

    return {
      fat: Math.round(monitorPrefill.averageMonthly),
      mes: 1, // 1 mês como amostra → projeção anual = 12x o valor
      cnae: cnaeInfo,
      prolabore: Math.round(monitorPrefill.avgFolhaMes),
      temProlabore: monitorPrefill.avgFolhaMes > 0,
    }
  }, [prefillRequested, monitorPrefill])

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
        initialValues={initialValues}
        prefillSource={prefillRequested && monitorPrefill ? 'monitor' : null}
        autoFocusProlabore={focusFatorR}
      />

      {resultado && (
        <div ref={resultadoRef} style={{ scrollMarginTop: 16 }}>
          <FullResults resultado={resultado} email={userEmail} />
        </div>
      )}
    </>
  )
}
