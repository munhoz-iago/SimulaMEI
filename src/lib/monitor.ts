import {
  calcularProLaboreIdeal,
  calcularSimples,
  getCnae,
} from "@/lib/tributario";
import type { Anexo, TipoMei } from "@/types/tributario";

export interface MonthlyInputLike {
  ano: number;
  mes: number;
  faturamentoMes: number;
  folhaMes: number;
  fatorR?: number | null;
  anexoCalculado?: Anexo | string | null;
}

export interface MonthlyMonitorSummary {
  rbt12: number;
  faturamentoAcumulado: number;
  folhaAcumulada: number;
  projecaoAnual: number;
  fatorRAtual: number;
  dasMensalEstimado: number;
  proLaboreIdeal: number;
}

export interface FiscalCalendarItem {
  title: string;
  body: string;
  channel: "email" | "dashboard" | "alerta";
  /** Prioridade de exibição — alta no topo, baixa no rodapé */
  priority: "alta" | "media" | "baixa";
  /** Data limite associada (ISO) quando aplicável */
  deadline?: string;
  /** Status visual: critico (vermelho), atencao (amarelo), ok (lime), info (azul) */
  severity?: "critico" | "atencao" | "ok" | "info";
}

export function summarizeMonthlyMonitor({
  cnae,
  mesAtual,
  historico,
}: {
  cnae: string;
  tipoMei: TipoMei;
  mesAtual: number;
  historico: MonthlyInputLike[];
}): MonthlyMonitorSummary {
  // Ordena por data (mais antigo primeiro)
  const ordered = [...historico].sort(
    (a, b) => a.ano * 100 + a.mes - (b.ano * 100 + b.mes),
  );

  // Faturamento acumulado do ano fiscal (todos os meses disponíveis)
  const faturamentoAcumulado = ordered.reduce(
    (sum, item) => sum + item.faturamentoMes,
    0,
  );

  // RBT12: janela rolling dos últimos 12 meses (para cálculo correto do Fator R)
  // Se houver menos de 12 meses, usa apenas o disponível
  const last12Months = ordered.slice(-12);
  const rbt12 = last12Months.reduce(
    (sum, item) => sum + item.faturamentoMes,
    0,
  );
  const folhaAcumulada = last12Months.reduce(
    (sum, item) => sum + item.folhaMes,
    0,
  );

  const projecaoAnual =
    mesAtual > 0
      ? (faturamentoAcumulado / mesAtual) * 12
      : faturamentoAcumulado;
  const fatorRAtual = rbt12 > 0 ? folhaAcumulada / rbt12 : 0;
  const info = getCnae(cnae);
  const anexo =
    info?.elegivelFatorR && fatorRAtual >= 0.28
      ? "III"
      : (info?.anexoPadrao ?? "III");
  const dasMensalEstimado = calcularSimples(projecaoAnual, anexo).dasMensal;

  return {
    rbt12,
    faturamentoAcumulado,
    folhaAcumulada,
    projecaoAnual,
    fatorRAtual,
    dasMensalEstimado,
    proLaboreIdeal: calcularProLaboreIdeal(projecaoAnual),
  };
}

export function detectAnexoTransition(
  inputs: Pick<MonthlyInputLike, "ano" | "mes" | "anexoCalculado" | "fatorR">[],
) {
  if (inputs.length < 2) return null;

  const ordered = [...inputs].sort(
    (a, b) => a.ano * 100 + a.mes - (b.ano * 100 + b.mes),
  );
  const previous = ordered.at(-2);
  const current = ordered.at(-1);

  if (
    !previous ||
    !current ||
    !previous.anexoCalculado ||
    !current.anexoCalculado
  ) {
    return null;
  }

  if (previous.anexoCalculado === current.anexoCalculado) {
    return null;
  }

  return {
    from: previous.anexoCalculado,
    to: current.anexoCalculado,
    ano: current.ano,
    mes: current.mes,
    fatorR: current.fatorR ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Calendário fiscal dinâmico
// ─────────────────────────────────────────────────────────────────────────

interface FiscalCalendarInput {
  /** Data de referência (defaults para hoje) — útil pra testes */
  refDate?: Date;
  /** Nome do contribuinte pra mensagens personalizadas */
  nome: string;
  tipoMei: TipoMei;
  /** Anexo aplicável calculado pela última simulação */
  anexoAtual: Anexo;
  /** Atividade elegível para Fator R (serviços) */
  elegivelFatorR: boolean;
  /** Uso atual do teto (0–1+); >1 significa estouro */
  usoTeto?: number;
  /** Fator R calculado pelos últimos 12 meses */
  fatorRAtual?: number;
  /** Faturamento mensal médio dos últimos lançamentos */
  faturamentoMedio?: number;
  /** Último mês com lançamento registrado (1-12); null se nenhum */
  ultimoLancamentoMes?: number | null;
  /** Último ano com lançamento; null se nenhum */
  ultimoLancamentoAno?: number | null;
  /** Quantidade de meses já lançados (pra avaliar maturidade do histórico) */
  totalLancamentos?: number;
}

/** Capitaliza a primeira letra do nome do mês */
function capitalizedMonthName(mes: number, ano: number): string {
  const name = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(ano, Math.max(0, mes - 1), 1),
  );
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Data limite da DAS-MEI = dia 20 do mês corrente (vencimento do mês ref) */
function getDasDueDate(refDate: Date): Date {
  return new Date(refDate.getFullYear(), refDate.getMonth(), 20);
}

/** Data limite do DEFIS-MEI = 31 de maio do ano em curso */
function getDefisDueDate(refDate: Date): Date {
  return new Date(refDate.getFullYear(), 4, 31); // mai = índice 4
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/**
 * Gera itens do calendário fiscal contextualizados ao estado do usuário.
 *
 * Lógica:
 * 1. **DAS mensal** — sempre presente; severidade depende do dia do mês
 *    - Dia 1-15: info (planejamento)
 *    - Dia 16-19: atenção (vencimento se aproxima)
 *    - Dia 20: crítico (vence hoje)
 *    - Após dia 20 do mês corrente: crítico (atrasado)
 *
 * 2. **DEFIS-MEI** — declaração anual; presente em todos os meses, mas
 *    severidade aumenta de janeiro até maio
 *
 * 3. **Teto MEI** — quando uso > 50%, vira observação; > 75%, atenção;
 *    > 100%, crítico
 *
 * 4. **Fator R** — só se CNAE elegível. Se < 28%, sugere ajuste de
 *    pró-labore com valor sugerido
 *
 * 5. **Lançamento mensal** — se não há lançamento do mês corrente
 *    e dia >= 5, lembrete pra registrar
 */
export function getFiscalCalendarItems(input: FiscalCalendarInput): FiscalCalendarItem[] {
  const {
    refDate = new Date(),
    nome,
    tipoMei,
    anexoAtual,
    elegivelFatorR,
    usoTeto = 0,
    fatorRAtual = 0,
    faturamentoMedio = 0,
    ultimoLancamentoMes = null,
    ultimoLancamentoAno = null,
    totalLancamentos = 0,
  } = input;

  const items: FiscalCalendarItem[] = [];
  const today = refDate;
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();
  const monthTitle = capitalizedMonthName(currentMonth, currentYear);

  // ─── 1. DAS-MEI mensal (vence dia 20) ───────────────────────────────────
  const dasDue = getDasDueDate(today);
  const dasDaysLeft = daysBetween(today, dasDue);
  let dasSeverity: FiscalCalendarItem["severity"] = "info";
  let dasPriority: FiscalCalendarItem["priority"] = "media";
  let dasBody = `O DAS deste mês vence em ${dasDue.toLocaleDateString("pt-BR")}. Use a simulação para conferir o valor antes do pagamento.`;

  if (dasDaysLeft < 0) {
    // Já passou o dia 20 → atrasado
    dasSeverity = "critico";
    dasPriority = "alta";
    dasBody = `DAS de ${monthTitle} venceu há ${Math.abs(dasDaysLeft)} dia(s). Pague pelo app do Simples Nacional para evitar multa e juros.`;
  } else if (dasDaysLeft <= 5) {
    dasSeverity = "atencao";
    dasPriority = "alta";
    dasBody = `DAS deste mês vence em ${dasDaysLeft} dia(s) (${dasDue.toLocaleDateString("pt-BR")}). Confira o valor antes do pagamento.`;
  } else if (dasDaysLeft <= 10) {
    dasSeverity = "atencao";
    dasPriority = "media";
  }

  items.push({
    title: `${monthTitle}: DAS-MEI vence dia 20`,
    body: dasBody,
    channel: dasSeverity === "critico" ? "alerta" : "dashboard",
    priority: dasPriority,
    severity: dasSeverity,
    deadline: dasDue.toISOString(),
  });

  // ─── 2. DEFIS-MEI anual (vence 31 de maio) ──────────────────────────────
  const defisDue = getDefisDueDate(today);
  const defisDaysLeft = daysBetween(today, defisDue);
  if (defisDaysLeft >= -30 && defisDaysLeft <= 180) {
    // Mostra DEFIS de janeiro até ~30 dias após o vencimento
    let defisSeverity: FiscalCalendarItem["severity"] = "info";
    let defisPriority: FiscalCalendarItem["priority"] = "baixa";
    let defisBody = `Declaração anual do MEI (DEFIS) tem prazo até 31/05. Envie pelo portal do Simples Nacional.`;

    if (defisDaysLeft < 0) {
      defisSeverity = "critico";
      defisPriority = "alta";
      defisBody = `DEFIS venceu há ${Math.abs(defisDaysLeft)} dia(s). O atraso gera multa mínima de R$ 50 e bloqueio do CNPJ.`;
    } else if (defisDaysLeft <= 15) {
      defisSeverity = "atencao";
      defisPriority = "alta";
      defisBody = `DEFIS vence em ${defisDaysLeft} dia(s). Não esqueça de declarar o faturamento total do ano anterior.`;
    } else if (defisDaysLeft <= 60) {
      defisSeverity = "atencao";
      defisPriority = "media";
    }

    items.push({
      title: `DEFIS ${currentYear}: declaração anual`,
      body: defisBody,
      channel: defisSeverity === "critico" ? "alerta" : "dashboard",
      priority: defisPriority,
      severity: defisSeverity,
      deadline: defisDue.toISOString(),
    });
  }

  // ─── 3. Teto MEI ────────────────────────────────────────────────────────
  if (usoTeto > 1) {
    items.push({
      title: `Teto MEI estourado`,
      body: `Sua projeção anual ultrapassou o teto. Para evitar tributação retroativa, considere migrar para ME no Simples Nacional o quanto antes.`,
      channel: "alerta",
      priority: "alta",
      severity: "critico",
    });
  } else if (usoTeto > 0.85) {
    items.push({
      title: `Atenção: ${Math.round(usoTeto * 100)}% do teto usado`,
      body: `Você usou ${Math.round(usoTeto * 100)}% do teto MEI ${tipoMei === "caminhoneiro" ? "Caminhoneiro" : ""}. Em ritmo atual, há risco de excesso até o fim do ano.`,
      channel: "dashboard",
      priority: "alta",
      severity: "atencao",
    });
  } else if (usoTeto > 0.5) {
    items.push({
      title: `Meio do caminho: ${Math.round(usoTeto * 100)}% do teto`,
      body: `${nome || "Você"} está em ${Math.round(usoTeto * 100)}% do teto. Continue acompanhando mensalmente — ainda há margem confortável.`,
      channel: "dashboard",
      priority: "baixa",
      severity: "info",
    });
  }

  // ─── 4. Fator R (apenas serviços elegíveis) ─────────────────────────────
  if (elegivelFatorR && totalLancamentos >= 1) {
    const atinge = fatorRAtual >= 0.28;
    if (atinge) {
      items.push({
        title: `Fator R OK — Anexo III aplicado`,
        body: `Fator R atual de ${(fatorRAtual * 100).toFixed(1)}% mantém você no Anexo III (menor alíquota). Continue lançando a folha mensalmente.`,
        channel: "dashboard",
        priority: "baixa",
        severity: "ok",
      });
    } else {
      // Calcula folha mínima sugerida pra atingir 28%
      const folhaMinimaSugerida =
        faturamentoMedio > 0 ? Math.ceil((0.28 - fatorRAtual) * faturamentoMedio * 12) : 0;
      items.push({
        title: `Fator R abaixo de 28% — Anexo V aplicado`,
        body: folhaMinimaSugerida > 0
          ? `Fator R em ${(fatorRAtual * 100).toFixed(1)}%. Aumentar a folha anual em ~${fmtBRL(folhaMinimaSugerida)} (≈ ${fmtBRL(folhaMinimaSugerida / 12)}/mês) levaria você ao Anexo III, com economia de imposto.`
          : `Fator R em ${(fatorRAtual * 100).toFixed(1)}%. Considere aumentar pró-labore ou folha para migrar do Anexo V para o III e pagar menos imposto.`,
        channel: "dashboard",
        priority: "media",
        severity: "atencao",
      });
    }
  }

  // ─── 5. Lançamento do mês corrente ──────────────────────────────────────
  const temLancamentoMesAtual =
    ultimoLancamentoAno === currentYear && ultimoLancamentoMes === currentMonth;
  if (!temLancamentoMesAtual && currentDay >= 5) {
    items.push({
      title: `${monthTitle}: lançamento ainda não registrado`,
      body: `Você ainda não registrou os números de ${monthTitle.toLowerCase()} no Monitor mensal. Lançar mantém DAS, Fator R e alertas atualizados.`,
      channel: "dashboard",
      priority: dasDaysLeft <= 7 ? "alta" : "media",
      severity: "atencao",
    });
  }

  // ─── 6. Onboarding incompleto / sem histórico ───────────────────────────
  if (totalLancamentos === 0) {
    items.push({
      title: `Comece pelo primeiro lançamento`,
      body: `Lance o faturamento e folha do mês corrente no Monitor mensal. O primeiro registro ativa todos os widgets dinâmicos do dashboard.`,
      channel: "dashboard",
      priority: "alta",
      severity: "info",
    });
  }

  // Ordena por prioridade: alta > media > baixa
  const priorityRank: Record<FiscalCalendarItem["priority"], number> = { alta: 0, media: 1, baixa: 2 };
  items.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  return items;
}
