// alertas.ts — Lógica de teto MEI, projeção de faturamento e cenários de excesso
// TAX_RULE_VERSION: 'BR-MEI-SN-2026-04-28'

import type { AlertaTeto, TipoMei, CenarioExcesso } from "@/types/tributario";
import { getTetoAnual, TOLERANCIA_EXCESSO } from "./limitesMei";

/**
 * Configuração centralizada de thresholds para alertas de teto.
 * Usada pelo motor tributário e sistema de notificações.
 */
export const ALERTA_TETO_THRESHOLDS = {
  // Percentuais de uso do teto para níveis de alerta
  // Alinhado com comportamento legacy: getCorUrgencia(0.95) === 'vermelho'
  USO: {
    SAUDAVEL: 0.7, // < 70% — verde
    ATENCAO: 0.7, // >= 70% — amarelo (início da faixa)
    ALERTA: 0.8, // >= 80% — laranja (início da faixa)
    URGENTE: 0.9, // >= 90% — vermelho (início da faixa)
    CRITICO: 1.0, // >= 100% — vermelho intenso
    EXCESSO: 1.2, // > 120% — excesso grave
  } as const,

  // Cores para UI (oklch)
  CORES: {
    VERDE: "var(--lime)",
    AMARELO: "var(--yellow)",
    LARANJA: "var(--orange)",
    VERMELHO: "var(--red)",
  } as const,

  // Severidade para notificações
  SEVERIDADE: {
    VERDE: "info",
    AMARELO: "warn",
    LARANJA: "warn",
    VERMELHO: "danger",
  } as const,
} as const;

export type NivelAlertaUso =
  | "saudavel"
  | "atencao"
  | "alerta"
  | "urgente"
  | "critico"
  | "excesso_grave";

/**
 * Determina o nível de alerta baseado no percentual utilizado do teto.
 * Usado por UI e sistema de notificações.
 * Compatível com comportamento legacy: 90-100% é 'urgente' (vermelho no legacy).
 */
export function getNivelAlertaUso(percentualUtilizado: number): NivelAlertaUso {
  const t = ALERTA_TETO_THRESHOLDS.USO;
  if (percentualUtilizado >= t.EXCESSO) return "excesso_grave";
  if (percentualUtilizado >= t.CRITICO) return "critico";
  if (percentualUtilizado >= t.URGENTE) return "urgente"; // >= 90% — vermelho
  if (percentualUtilizado >= t.ALERTA) return "alerta"; // >= 80% — laranja
  if (percentualUtilizado >= t.ATENCAO) return "atencao"; // >= 70% — amarelo
  return "saudavel"; // < 70% — verde
}

/**
 * Retorna cor e severidade para o nível de alerta.
 */
export function getEstiloAlertaUso(nivel: NivelAlertaUso) {
  const map: Record<NivelAlertaUso, { cor: string; severidade: string }> = {
    saudavel: {
      cor: ALERTA_TETO_THRESHOLDS.CORES.VERDE,
      severidade: ALERTA_TETO_THRESHOLDS.SEVERIDADE.VERDE,
    },
    atencao: {
      cor: ALERTA_TETO_THRESHOLDS.CORES.AMARELO,
      severidade: ALERTA_TETO_THRESHOLDS.SEVERIDADE.AMARELO,
    },
    alerta: {
      cor: ALERTA_TETO_THRESHOLDS.CORES.LARANJA,
      severidade: ALERTA_TETO_THRESHOLDS.SEVERIDADE.LARANJA,
    },
    urgente: {
      cor: ALERTA_TETO_THRESHOLDS.CORES.VERMELHO,
      severidade: ALERTA_TETO_THRESHOLDS.SEVERIDADE.VERMELHO,
    },
    critico: {
      cor: ALERTA_TETO_THRESHOLDS.CORES.VERMELHO,
      severidade: ALERTA_TETO_THRESHOLDS.SEVERIDADE.VERMELHO,
    },
    excesso_grave: {
      cor: ALERTA_TETO_THRESHOLDS.CORES.VERMELHO,
      severidade: ALERTA_TETO_THRESHOLDS.SEVERIDADE.VERMELHO,
    },
  };
  return map[nivel];
}

/**
 * Calcula o alerta de teto MEI com projeção linear.
 *
 * @param faturamentoAcumulado - Total faturado no ano até o mês atual (R$)
 * @param mesAtual - Mês corrente (1–12)
 * @param tipoMei - 'geral' (R$ 81k) ou 'caminhoneiro' (R$ 251,6k)
 */
export function calcularAlertaTeto(
  faturamentoAcumulado: number,
  mesAtual: number,
  tipoMei: TipoMei = "geral",
): AlertaTeto {
  const tetoAnual = getTetoAnual(tipoMei);
  const mesesRestantes = 12 - mesAtual;
  const mediaMensal = mesAtual > 0 ? faturamentoAcumulado / mesAtual : 0;
  const projecaoAnual = faturamentoAcumulado + mediaMensal * mesesRestantes;
  const diferenca = tetoAnual - faturamentoAcumulado;
  const percentualUtilizado =
    tetoAnual > 0 ? faturamentoAcumulado / tetoAnual : 0;

  // Meses para atingir o teto na projeção atual
  let mesesParaTeto: number | null = null;
  let mesEstourarTeto: number | null = null;

  if (mediaMensal > 0 && faturamentoAcumulado < tetoAnual) {
    mesesParaTeto = Math.ceil(diferenca / mediaMensal);
    const mesCalculado = mesAtual + mesesParaTeto;
    mesEstourarTeto = mesCalculado <= 12 ? mesCalculado : null;
  }

  // Cenário de excesso
  const excessoProjetado = Math.max(0, projecaoAnual - tetoAnual);
  const percentualExcesso = tetoAnual > 0 ? excessoProjetado / tetoAnual : 0;

  let cenario: CenarioExcesso;
  if (excessoProjetado <= 0) {
    cenario = "dentro_limite";
  } else if (percentualExcesso <= TOLERANCIA_EXCESSO) {
    cenario = "excesso_leve"; // DAS complementar, efeitos em jan/próximo ano
  } else {
    cenario = "excesso_grave"; // retroativo + multa 0,33%/dia + Selic
  }

  return {
    faturamentoAcumulado,
    tetoAnual,
    tipoMei,
    projecaoAnual,
    diferenca,
    percentualUtilizado,
    mesesRestantes,
    mesesParaTeto,
    mesEstourarTeto,
    cenario,
    excessoProjetado,
    percentualExcesso,
  };
}

/**
 * Retorna a cor de urgência baseada no percentual utilizado do teto.
 * Útil para o componente AlertaTeto.tsx.
 * @deprecated Use getNivelAlertaUso() + getEstiloAlertaUso() para novos componentes
 */
export function getCorUrgencia(
  percentualUtilizado: number,
): "verde" | "amarelo" | "vermelho" {
  const nivel = getNivelAlertaUso(percentualUtilizado);
  // Mapeamento legacy para compatibilidade:
  // - saudavel: verde
  // - atencao, alerta: amarelo
  // - urgente, critico, excesso_grave: vermelho
  if (nivel === "saudavel") return "verde";
  if (nivel === "atencao" || nivel === "alerta") return "amarelo";
  return "vermelho";
}

/**
 * Retorna o nome do mês em português.
 */
export function getNomeMes(mes: number): string {
  const meses = [
    "",
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return meses[mes] ?? "";
}

/**
 * Gera a mensagem de alerta personalizada para exibição na UI.
 */
export function getMensagemAlerta(alerta: AlertaTeto): string {
  const { cenario, diferenca, mesEstourarTeto, percentualUtilizado } = alerta;

  if (cenario === "dentro_limite") {
    if (percentualUtilizado < 0.5) {
      return `Você está tranquilo — usou ${(percentualUtilizado * 100).toFixed(0)}% do teto MEI.`;
    }
    if (mesEstourarTeto) {
      return `Atenção: no seu ritmo atual, você pode estourar o teto em ${getNomeMes(mesEstourarTeto)}. Ainda dá tempo de planejar a migração.`;
    }
    return `Você está a R$ ${diferenca.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} do teto — seguro por enquanto.`;
  }

  if (cenario === "excesso_leve") {
    return `Você deve ultrapassar o teto MEI em até 20%. A migração para ME acontecerá em janeiro do próximo ano — há DAS complementar a pagar, mas sem retroatividade.`;
  }

  return `🚨 Risco alto: a projeção indica excesso acima de 20% do teto. Isso gera migração retroativa desde janeiro, com multa de 0,33%/dia e Selic. Procure seu contador agora.`;
}
