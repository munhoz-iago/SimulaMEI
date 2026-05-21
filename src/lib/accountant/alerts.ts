import type { ResultadoSimulacao, TipoMei } from "@/types/tributario";
import {
  ALERTA_TETO_THRESHOLDS,
  getNivelAlertaUso,
} from "@/lib/tributario/alertas";

/**
 * Tipos de alerta para escritório de contabilidade.
 * Mapeados a partir dos thresholds centrais do motor tributário.
 */
export const OFFICE_ALERT_TYPES = [
  "teto_70",
  "teto_80",
  "teto_95",
  "teto_100",
  "teto_excesso_grave",
  "anexo_transicao",
  "fator_r_risco",
] as const;

export type OfficeAlertType = (typeof OFFICE_ALERT_TYPES)[number];
export type OfficeAlertSeverity = "info" | "warn" | "danger";

export interface OfficeAlertClientLike {
  id: string;
  name: string;
  cnae: string | null;
  tipo_mei: string | null;
}

export interface OfficeAlertSimulationLike {
  id: string;
  resultado: ResultadoSimulacao;
  created_at: string;
}

export interface OfficeAlertPayload {
  title: string;
  body: string;
  severity: OfficeAlertSeverity;
  clientName: string;
  cnae: string | null;
  tipoMei: TipoMei | string | null;
  simulationId: string;
  simulationCreatedAt: string;
  percentualUtilizado: number;
  percentualExcesso: number;
  faturamentoAcumulado: number;
  projecaoAnual: number;
  tetoAnual: number;
  cenario: string;
  taxRuleVersion: string;
}

export interface OfficeAlertCandidate {
  office_id: string;
  client_id: string;
  tipo: OfficeAlertType;
  mes_referencia: string;
  payload: OfficeAlertPayload;
}

export function getOfficeAlertMonthReference(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getTetoAlertType(
  percentualUtilizado: number,
  percentualExcesso = 0,
): OfficeAlertType | null {
  const t = ALERTA_TETO_THRESHOLDS.USO;

  // Excesso grave: acima de 120% OU percentual de excesso > 20%
  if (percentualExcesso > t.EXCESSO - 1 || percentualUtilizado > t.EXCESSO) {
    return "teto_excesso_grave";
  }

  // Mapear percentuais para tipos de alerta específicos do escritório
  // Alinhado com testes: 0.70→teto_70, 0.80→teto_80, 0.95→teto_95, 1.0→teto_100
  if (percentualUtilizado >= 1.0) return "teto_100";
  if (percentualUtilizado >= 0.95) return "teto_95";
  if (percentualUtilizado >= 0.8) return "teto_80";
  if (percentualUtilizado >= 0.7) return "teto_70";

  return null;
}

/**
 * Retorna o nível de alerta usando a função centralizada do motor tributário.
 * Útil para consistência de UI entre módulos.
 */
export function getNivelAlertaFromMotor(percentualUtilizado: number) {
  return getNivelAlertaUso(percentualUtilizado);
}

export function shouldEmailOfficeAlert(tipo: OfficeAlertType) {
  return tipo !== "teto_70";
}

export function describeOfficeAlert(
  tipo: OfficeAlertType,
  payload: Pick<
    OfficeAlertPayload,
    "clientName" | "percentualUtilizado" | "projecaoAnual" | "tetoAnual"
  >,
) {
  const percent = new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(payload.percentualUtilizado);
  const money = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
  const projection = money.format(payload.projecaoAnual);
  const limit = money.format(payload.tetoAnual);

  if (tipo === "teto_excesso_grave") {
    return {
      severity: "danger" as const,
      title: `${payload.clientName} está acima da margem grave do MEI`,
      body: `Projeção anual em ${projection}, acima do teto de ${limit}. Uso projetado: ${percent}.`,
    };
  }

  if (tipo === "teto_100") {
    return {
      severity: "danger" as const,
      title: `${payload.clientName} projetou estouro do teto MEI`,
      body: `Projeção anual em ${projection}, acima do teto de ${limit}. Uso projetado: ${percent}.`,
    };
  }

  if (tipo === "teto_95") {
    return {
      severity: "danger" as const,
      title: `${payload.clientName} chegou a 95% do teto`,
      body: `Uso projetado de ${percent}. Revise faturamento, atividade e possível desenquadramento.`,
    };
  }

  if (tipo === "teto_80") {
    return {
      severity: "warn" as const,
      title: `${payload.clientName} passou de 80% do teto`,
      body: `Uso projetado de ${percent}. Este é o ponto de acompanhamento mensal mais rigoroso.`,
    };
  }

  if (tipo === "teto_70") {
    return {
      severity: "info" as const,
      title: `${payload.clientName} passou de 70% do teto`,
      body: `Uso projetado de ${percent}. Vale iniciar acompanhamento preventivo.`,
    };
  }

  return {
    severity: "warn" as const,
    title: `${payload.clientName} exige revisão fiscal`,
    body: `O motor gerou um alerta do tipo ${tipo}.`,
  };
}

export function buildOfficeAlertCandidate({
  officeId,
  client,
  simulation,
  mesReferencia,
}: {
  officeId: string;
  client: OfficeAlertClientLike;
  simulation: OfficeAlertSimulationLike | null;
  mesReferencia: string;
}): OfficeAlertCandidate | null {
  if (!simulation) return null;

  const alerta = simulation.resultado.alertaTeto;
  const tipo = getTetoAlertType(
    alerta.percentualUtilizado,
    alerta.percentualExcesso,
  );
  if (!tipo) return null;

  const basePayload = {
    clientName: client.name,
    cnae: client.cnae,
    tipoMei: client.tipo_mei,
    simulationId: simulation.id,
    simulationCreatedAt: simulation.created_at,
    percentualUtilizado: alerta.percentualUtilizado,
    percentualExcesso: alerta.percentualExcesso,
    faturamentoAcumulado: alerta.faturamentoAcumulado,
    projecaoAnual: alerta.projecaoAnual,
    tetoAnual: alerta.tetoAnual,
    cenario: alerta.cenario,
    taxRuleVersion: simulation.resultado.taxRuleVersion,
  };
  const description = describeOfficeAlert(tipo, basePayload);

  return {
    office_id: officeId,
    client_id: client.id,
    tipo,
    mes_referencia: mesReferencia,
    payload: {
      ...basePayload,
      ...description,
    },
  };
}
