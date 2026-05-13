/**
 * Unifica fontes de dados do dashboard em KPIs únicos.
 *
 * Problema: o dashboard tinha 2 fontes de verdade independentes:
 *  - `simulations` (tabela cheia, gerada por /dashboard/simular ou home)
 *  - `monthly_inputs` (tabela leve, gerada pelo Monitor mensal)
 *
 * Quando o usuário só lançava no Monitor (caminho mais leve, dia a dia),
 * os cards principais ficavam ZERADOS porque puxavam só de `simulations`.
 * Resultado: dashboard parecia estático mesmo com dados ativos.
 *
 * Esta função escolhe a fonte mais fresca/rica e retorna KPIs unificados:
 *  - **Monitor com lançamentos**: usa dados reais do histórico mensal
 *  - **Simulação recente (sem Monitor)**: usa simulação salva
 *  - **Nada**: retorna estado "vazio" com flag pra UI mostrar CTAs apropriados
 */

import { LIMITES_MEI, calcularSimples, getCnae } from '@/lib/tributario'
import type { ResultadoSimulacao, TipoMei, Anexo } from '@/types/tributario'
import type { MonthlyMonitorSummary } from '@/lib/monitor'

export interface DashboardKPIs {
  /** Fonte usada pra montar esses KPIs */
  source: 'monitor' | 'simulation' | 'empty'
  /** Faturamento acumulado no ano corrente */
  faturamentoAcumulado: number
  /** Teto MEI anual (depende do tipoMei) */
  tetoAnual: number
  /** Uso do teto (0–1+); >1 = estouro */
  usoTeto: number
  /** Projeção anual baseada no acumulado */
  projecaoAnual: number
  /** Anexo aplicado */
  anexoAtual: Anexo
  /** DAS mensal estimado */
  dasMensalEstimado: number
  /** Fator R dos últimos 12 meses (ou 0 se sem dados) */
  fatorRAtual: number
  /** Pró-labore mensal sugerido para hit Anexo III */
  proLaboreIdeal: number
  /** Tom geral pra UI: ok | warn | danger | neutral */
  tone: 'ok' | 'warn' | 'danger' | 'neutral'
  /** Mensagem contextual pra mostrar no card (dinâmica) */
  contextMessage: string
  /** Sub-mensagem ainda mais específica */
  contextSubMessage: string
  /** CTA principal sugerido pro usuário */
  primaryCta: {
    label: string
    href: string
  }
  /** Quantos meses de histórico existem (drives confidence in projections) */
  monthsOfHistory: number
  /** Se há um lançamento do mês corrente */
  hasCurrentMonthEntry: boolean
}

interface DashboardKPIsInput {
  /** Última simulação salva (pode ser undefined) */
  latestSimulation?: ResultadoSimulacao | null
  /** Sumário calculado pelo Monitor mensal (pode ser null) */
  monitorSummary?: MonthlyMonitorSummary | null
  /** Total de meses lançados no Monitor */
  monthlyInputsCount: number
  /** Mês mais recente lançado (1-12); null se nenhum */
  latestMonth: number | null
  /** Ano mais recente lançado; null se nenhum */
  latestYear: number | null
  /** CNAE principal do perfil */
  cnae?: string | null
  /** Tipo do MEI */
  tipoMei?: TipoMei | null
  /** Plano (drives CTA: free → upgrade, pro → simular) */
  plan: 'free' | 'pro'
  /** Limite atingido no free? */
  freeLimitReached: boolean
  /** Data de referência (para testes) */
  refDate?: Date
}

const EMPTY_KPIS = (input: Pick<DashboardKPIsInput, 'plan' | 'freeLimitReached' | 'tipoMei'>): DashboardKPIs => {
  const tetoAnual = LIMITES_MEI[input.tipoMei ?? 'geral'].anual
  return {
    source: 'empty',
    faturamentoAcumulado: 0,
    tetoAnual,
    usoTeto: 0,
    projecaoAnual: 0,
    anexoAtual: 'III',
    dasMensalEstimado: 0,
    fatorRAtual: 0,
    proLaboreIdeal: 0,
    tone: 'neutral',
    contextMessage: 'Sem histórico ainda',
    contextSubMessage: 'Lance seu primeiro mês no Monitor para ativar o dashboard.',
    primaryCta: {
      label: 'Ir para o Monitor mensal',
      href: '/dashboard#monitor',
    },
    monthsOfHistory: 0,
    hasCurrentMonthEntry: false,
  }
}

function toneFromUsoTeto(usoTeto: number): DashboardKPIs['tone'] {
  if (usoTeto > 1) return 'danger'
  if (usoTeto > 0.85) return 'warn'
  return 'ok'
}

function buildContextFromMonitor(
  summary: MonthlyMonitorSummary,
  monthsOfHistory: number,
  tetoAnual: number,
  hasCurrentMonth: boolean,
): { message: string; sub: string } {
  const usoTeto = summary.faturamentoAcumulado / tetoAnual
  const pct = Math.round(usoTeto * 100)
  const projecaoPct = Math.round((summary.projecaoAnual / tetoAnual) * 100)

  if (usoTeto > 1) {
    return {
      message: `Teto estourado em ${pct - 100}%`,
      sub: 'Projeção ultrapassa o limite. Considere migração para ME antes do fim do ano fiscal.',
    }
  }
  if (usoTeto > 0.85) {
    return {
      message: `${pct}% do teto usado em ${monthsOfHistory} mês${monthsOfHistory > 1 ? 'es' : ''}`,
      sub: `Projeção indica ${projecaoPct}% até dezembro — pouca margem. Considere reduzir ritmo ou planejar migração.`,
    }
  }
  if (usoTeto > 0.5) {
    return {
      message: `Em ritmo: ${pct}% usado`,
      sub: `Com base em ${monthsOfHistory} mês${monthsOfHistory > 1 ? 'es' : ''}, a projeção é ${projecaoPct}% do teto. ${hasCurrentMonth ? 'Mês atual já lançado.' : 'Lance o mês corrente para refinar a projeção.'}`,
    }
  }
  if (monthsOfHistory === 1) {
    return {
      message: `Primeiro mês lançado`,
      sub: `Você usou ${pct}% do teto neste mês. Continue lançando todo início de mês para ativar as projeções e alertas dinâmicos.`,
    }
  }
  return {
    message: `${pct}% do teto — margem confortável`,
    sub: `${monthsOfHistory} mês${monthsOfHistory > 1 ? 'es' : ''} no histórico. Projeção atual: ${projecaoPct}% até dezembro.`,
  }
}

function buildContextFromSimulation(
  resultado: ResultadoSimulacao,
): { message: string; sub: string } {
  const { alertaTeto } = resultado
  const pct = Math.round(alertaTeto.percentualUtilizado * 100)
  if (alertaTeto.cenario === 'excesso_grave') {
    return {
      message: 'Excesso crítico detectado',
      sub: `Simulação mostra projeção de ${pct}% do teto. Risco de tributação retroativa — consulte contador.`,
    }
  }
  if (alertaTeto.cenario === 'excesso_leve') {
    return {
      message: 'Próximo do limite',
      sub: `Projeção em ${pct}% do teto, dentro da tolerância de 20%, mas sem folga. Acompanhe mensalmente.`,
    }
  }
  return {
    message: `${pct}% do teto na última simulação`,
    sub: 'Simulação avulsa salva. Para acompanhamento contínuo, ative o Monitor mensal com seus lançamentos.',
  }
}

export function getDashboardKPIs(input: DashboardKPIsInput): DashboardKPIs {
  const tipoMei = input.tipoMei ?? 'geral'
  const tetoAnual = LIMITES_MEI[tipoMei].anual
  const refDate = input.refDate ?? new Date()
  const hasCurrentMonth = Boolean(
    input.latestMonth !== null &&
    input.latestYear !== null &&
    input.latestMonth === refDate.getMonth() + 1 &&
    input.latestYear === refDate.getFullYear(),
  )

  // Prioridade 1: Monitor mensal com pelo menos 1 lançamento
  if (input.monitorSummary && input.monthlyInputsCount > 0) {
    const m = input.monitorSummary
    const usoTeto = m.faturamentoAcumulado / tetoAnual
    const cnaeInfo = input.cnae ? getCnae(input.cnae) : null
    const anexo: Anexo =
      cnaeInfo?.elegivelFatorR && m.fatorRAtual >= 0.28
        ? 'III'
        : (cnaeInfo?.anexoPadrao as Anexo | undefined) ?? 'III'
    const tone = toneFromUsoTeto(usoTeto)
    const { message, sub } = buildContextFromMonitor(m, input.monthlyInputsCount, tetoAnual, hasCurrentMonth)

    return {
      source: 'monitor',
      faturamentoAcumulado: m.faturamentoAcumulado,
      tetoAnual,
      usoTeto,
      projecaoAnual: m.projecaoAnual,
      anexoAtual: anexo,
      dasMensalEstimado: m.dasMensalEstimado,
      fatorRAtual: m.fatorRAtual,
      proLaboreIdeal: m.proLaboreIdeal,
      tone,
      contextMessage: message,
      contextSubMessage: sub,
      primaryCta: hasCurrentMonth
        ? { label: 'Nova simulação completa', href: '/dashboard/simular' }
        : { label: `Lançar ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(refDate)}`, href: '/dashboard#monitor' },
      monthsOfHistory: input.monthlyInputsCount,
      hasCurrentMonthEntry: hasCurrentMonth,
    }
  }

  // Prioridade 2: simulação avulsa salva (sem Monitor)
  if (input.latestSimulation) {
    const r = input.latestSimulation
    const proj = r.alertaTeto.projecaoAnual
    const tone = toneFromUsoTeto(r.alertaTeto.percentualUtilizado)
    const { message, sub } = buildContextFromSimulation(r)
    const anexo = r.anexoAtual

    return {
      source: 'simulation',
      faturamentoAcumulado: r.alertaTeto.faturamentoAcumulado,
      tetoAnual,
      usoTeto: r.alertaTeto.percentualUtilizado,
      projecaoAnual: proj,
      anexoAtual: anexo,
      dasMensalEstimado: calcularSimples(proj, anexo).dasMensal,
      fatorRAtual: r.fatorR?.fatorR ?? 0,
      proLaboreIdeal: r.fatorR?.proLaboreMinimo ?? 0,
      tone,
      contextMessage: message,
      contextSubMessage: sub,
      primaryCta: { label: 'Ativar Monitor mensal', href: '/dashboard#monitor' },
      monthsOfHistory: 0,
      hasCurrentMonthEntry: false,
    }
  }

  // Sem dados em nenhuma fonte
  const empty = EMPTY_KPIS(input)
  if (input.plan === 'free' && input.freeLimitReached) {
    return {
      ...empty,
      contextMessage: 'Limite do plano Free atingido',
      contextSubMessage: 'Faça upgrade para continuar simulando e usar o Monitor mensal.',
      primaryCta: { label: 'Fazer upgrade', href: '/upgrade' },
    }
  }
  return empty
}
