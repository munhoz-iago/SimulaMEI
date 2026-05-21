// portfolio.ts — Lógica de agregação e análise de carteira de clientes
// TAX_RULE_VERSION: 'BR-MEI-SN-2026-05-08'

import type { ResultadoSimulacao } from '@/types/tributario'
import { getNivelAlertaUso, type NivelAlertaUso } from '@/lib/tributario/alertas'

export const PORTFOLIO_RISCO_ORDEM: NivelAlertaUso[] = [
  'excesso_grave',
  'critico',
  'urgente',
  'alerta',
  'atencao',
  'saudavel',
]

export interface ClienteComSimulacao {
  id: string
  nome: string
  email: string | null
  cnae: string
  tipoMei: 'geral' | 'caminhoneiro'
  ativo: boolean
  ultimaSimulacao: {
    id: string
    resultado: ResultadoSimulacao
    createdAt: string
  } | null
}

export interface PortfolioPorRisco {
  excesso_grave: number
  critico: number
  urgente: number
  alerta: number
  atencao: number
  saudavel: number
  semDados: number
}

export interface OportunidadeAgregada {
  tipo: 'fator_r_nao_otimizado' | 'proximo_teto' | 'mudanca_anexo'
  quantidade: number
  impactoEstimadoTotal: number
}

export interface CarteiraResumo {
  totalClientes: number
  clientesAtivos: number
  porRisco: PortfolioPorRisco
  oportunidades: OportunidadeAgregada[]
  alertasPrioritarios: AlertaPrioritario[]
  ultimaAtualizacao: string
}

export interface AlertaPrioritario {
  clienteId: string
  clienteNome: string
  tipo: 'teto' | 'fator_r' | 'anexo'
  severidade: NivelAlertaUso
  mensagem: string
  valor: number
  percentualUtilizado?: number
}

export interface PortfolioFilters {
  risco?: NivelAlertaUso | 'sem_dados'
  cnae?: string
  ativo?: boolean
  oportunidade?: 'fator_r' | 'teto'
  busca?: string
}

/**
 * Calcula distribuição de risco da carteira baseada nas simulações mais recentes.
 */
export function calcularDistribuicaoRisco(
  clientes: ClienteComSimulacao[]
): PortfolioPorRisco {
  const distribuicao: PortfolioPorRisco = {
    excesso_grave: 0,
    critico: 0,
    urgente: 0,
    alerta: 0,
    atencao: 0,
    saudavel: 0,
    semDados: 0,
  }

  for (const cliente of clientes) {
    if (!cliente.ultimaSimulacao) {
      distribuicao.semDados++
      continue
    }

    const percentual = cliente.ultimaSimulacao.resultado.alertaTeto.percentualUtilizado
    const nivel = getNivelAlertaUso(percentual)
    distribuicao[nivel]++
  }

  return distribuicao
}

/**
 * Identifica oportunidades agregadas na carteira.
 */
export function identificarOportunidades(
  clientes: ClienteComSimulacao[]
): OportunidadeAgregada[] {
  const oportunidades: OportunidadeAgregada[] = []

  // 1. Fator R não otimizado (poderia estar no Anexo III mas está no V)
  const fatorRNaoOtimizado = clientes.filter(c => {
    if (!c.ultimaSimulacao) return false
    const fatorR = c.ultimaSimulacao.resultado.fatorR
    return fatorR && !fatorR.atingeMinimo && fatorR.economiaAnual > 0
  })

  if (fatorRNaoOtimizado.length > 0) {
    const impactoTotal = fatorRNaoOtimizado.reduce(
      (sum, c) => sum + (c.ultimaSimulacao?.resultado.fatorR?.economiaAnual ?? 0),
      0
    )
    oportunidades.push({
      tipo: 'fator_r_nao_otimizado',
      quantidade: fatorRNaoOtimizado.length,
      impactoEstimadoTotal: impactoTotal,
    })
  }

  // 2. Próximos do teto (>= 80% e < 100%)
  const proximoTeto = clientes.filter(c => {
    if (!c.ultimaSimulacao) return false
    const pct = c.ultimaSimulacao.resultado.alertaTeto.percentualUtilizado
    return pct >= 0.80 && pct < 1.0
  })

  if (proximoTeto.length > 0) {
    oportunidades.push({
      tipo: 'proximo_teto',
      quantidade: proximoTeto.length,
      impactoEstimadoTotal: 0, // Impacto difícil de quantificar sem simulação de transição
    })
  }

  return oportunidades
}

/**
 * Gera lista de alertas prioritários para ação imediata.
 * Ordenados por severidade (excesso_grave primeiro).
 */
export function gerarAlertasPrioritarios(
  clientes: ClienteComSimulacao[],
  limite = 10
): AlertaPrioritario[] {
  const alertas: AlertaPrioritario[] = []

  for (const cliente of clientes) {
    if (!cliente.ultimaSimulacao) continue

    const resultado = cliente.ultimaSimulacao.resultado
    const alertaTeto = resultado.alertaTeto
    const nivel = getNivelAlertaUso(alertaTeto.percentualUtilizado)

    // Alertas de teto (apenas se >= atencao)
    if (nivel !== 'saudavel') {
      alertas.push({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        tipo: 'teto',
        severidade: nivel,
        mensagem: gerarMensagemTeto(nivel, alertaTeto.projecaoAnual, alertaTeto.tetoAnual),
        valor: alertaTeto.projecaoAnual,
        percentualUtilizado: alertaTeto.percentualUtilizado,
      })
    }

    // Alertas de Fator R
    if (resultado.fatorR && !resultado.fatorR.atingeMinimo && resultado.fatorR.economiaAnual > 1000) {
      alertas.push({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        tipo: 'fator_r',
        severidade: 'atencao',
        mensagem: `Oportunidade de economia de ${formatarMoeda(resultado.fatorR.economiaAnual)}/ano com otimização de Fator R`,
        valor: resultado.fatorR.economiaAnual,
      })
    }

    // Alertas de mudança de anexo
    if (resultado.comparativo.simplesAnexoOtimo && resultado.comparativo.melhorRegime === 'simplesOtimo') {
      alertas.push({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        tipo: 'anexo',
        severidade: 'atencao',
        mensagem: `Cliente pode migrar do Anexo ${resultado.anexoAtual} para Anexo III`,
        valor: resultado.comparativo.economiaVsMelhor,
      })
    }
  }

  // Ordenar por severidade e limitar
  return alertas
    .sort((a, b) => {
      const idxA = PORTFOLIO_RISCO_ORDEM.indexOf(a.severidade)
      const idxB = PORTFOLIO_RISCO_ORDEM.indexOf(b.severidade)
      return idxA - idxB
    })
    .slice(0, limite)
}

/**
 * Gera resumo completo da carteira.
 */
export function analisarCarteira(
  clientes: ClienteComSimulacao[]
): CarteiraResumo {
  const ativos = clientes.filter(c => c.ativo)

  return {
    totalClientes: clientes.length,
    clientesAtivos: ativos.length,
    porRisco: calcularDistribuicaoRisco(ativos),
    oportunidades: identificarOportunidades(ativos),
    alertasPrioritarios: gerarAlertasPrioritarios(ativos),
    ultimaAtualizacao: new Date().toISOString(),
  }
}

/**
 * Filtra clientes por critérios de busca.
 */
export function filtrarClientes(
  clientes: ClienteComSimulacao[],
  filtros: PortfolioFilters
): ClienteComSimulacao[] {
  return clientes.filter(cliente => {
    // Filtro de risco
    if (filtros.risco) {
      if (filtros.risco === 'sem_dados') {
        if (cliente.ultimaSimulacao) return false
      } else if (cliente.ultimaSimulacao) {
        const pct = cliente.ultimaSimulacao.resultado.alertaTeto.percentualUtilizado
        const nivel = getNivelAlertaUso(pct)
        if (nivel !== filtros.risco) return false
      } else {
        return false
      }
    }

    // Filtro de CNAE
    if (filtros.cnae && !cliente.cnae.startsWith(filtros.cnae)) {
      return false
    }

    // Filtro de ativo/inativo
    if (filtros.ativo !== undefined && cliente.ativo !== filtros.ativo) {
      return false
    }

    // Filtro de busca textual
    if (filtros.busca) {
      const termo = filtros.busca.toLowerCase()
      const nomeMatch = cliente.nome.toLowerCase().includes(termo)
      const emailMatch = cliente.email?.toLowerCase().includes(termo) ?? false
      const cnaeMatch = cliente.cnae.toLowerCase().includes(termo)
      if (!nomeMatch && !emailMatch && !cnaeMatch) return false
    }

    return true
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function gerarMensagemTeto(
  nivel: NivelAlertaUso,
  projecao: number,
  teto: number
): string {
  switch (nivel) {
    case 'excesso_grave':
      return `Projeção de ${formatarMoeda(projecao)} acima de 20% do teto (${formatarMoeda(teto)}) — risco retroativo`
    case 'critico':
      return `Projeção de ${formatarMoeda(projecao)} acima do teto (${formatarMoeda(teto)})`
    case 'urgente':
      return `Projeção de ${formatarMoeda(projecao)} próxima do teto (${formatarMoeda(teto)})`
    case 'alerta':
      return `Projeção de ${formatarMoeda(projecao)} — atenção necessária`
    case 'atencao':
      return `Projeção de ${formatarMoeda(projecao)} — iniciar acompanhamento`
    default:
      return `Projeção dentro do teto`
  }
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor)
}
