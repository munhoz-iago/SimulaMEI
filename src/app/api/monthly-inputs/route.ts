import { NextRequest, NextResponse } from "next/server";
import { detectAnexoTransition, summarizeMonthlyMonitor } from "@/lib/monitor";
import { isEditable } from "@/lib/monitor/edit-window";
import { sendAnexoAlertEmail } from "@/lib/resend";
import { createClient } from "@/lib/supabase/server";
import {
  getCnae,
  getCnae as getCnaeInfo,
  getAnexoEfetivo,
  normalizeCnaeCode,
  TAX_RULE_VERSION,
} from "@/lib/tributario";
import type { Anexo, TipoMei } from "@/types/tributario";
import { logger } from "@/lib/logger";

interface MonthlyInputPayload {
  ano: number;
  mes: number;
  faturamentoMes: number;
  folhaMes: number;
  cnae: string;
  tipoMei: TipoMei;
}

interface MonthlyInputRow {
  ano: number;
  mes: number;
  faturamento_mes: number;
  folha_mes: number;
  anexo_calculado: Anexo | null;
  fator_r: number | null;
}

function isTipoMei(value: unknown): value is TipoMei {
  return value === "geral" || value === "caminhoneiro";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Autenticação obrigatória." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as MonthlyInputPayload;
    const ano = Number(body.ano);
    const mes = Number(body.mes);
    const faturamentoMes = Number(body.faturamentoMes);
    const folhaMes = Number(body.folhaMes);
    const tipoMei = body.tipoMei;
    const cnae =
      typeof body.cnae === "string" ? normalizeCnaeCode(body.cnae) : "";

    if (
      !Number.isInteger(ano) ||
      ano < 2020 ||
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12 ||
      !Number.isFinite(faturamentoMes) ||
      faturamentoMes < 0 ||
      !Number.isFinite(folhaMes) ||
      folhaMes < 0 ||
      !isTipoMei(tipoMei) ||
      !cnae
    ) {
      return NextResponse.json(
        { error: "Payload mensal inválido." },
        { status: 400 },
      );
    }

    if (!getCnae(cnae)) {
      return NextResponse.json(
        { error: "CNAE não reconhecido. Informe um código oficial válido." },
        { status: 400 },
      );
    }

    const historyResponse = await supabase
      .from("monthly_inputs")
      .select("ano, mes, faturamento_mes, folha_mes, anexo_calculado, fator_r")
      .eq("user_id", user.id)
      .order("ano", { ascending: true });

    if (historyResponse.error) {
      console.error(
        "[/api/monthly-inputs] history error:",
        historyResponse.error.message,
      );
      return NextResponse.json(
        { error: "Não foi possível carregar o histórico mensal." },
        { status: 500 },
      );
    }

    const currentHistory = (historyResponse.data ?? []) as MonthlyInputRow[];

    // Se o lançamento (ano, mes) já existe, isso é uma EDIÇÃO — checa janela.
    // Inserções novas (mesmo retroativas) são permitidas pra popular histórico
    // inicial; só edições têm janela curta pra evitar reescrever passado.
    const existingEntry = currentHistory.find(
      (item) => item.ano === ano && item.mes === mes,
    );
    if (existingEntry) {
      const editability = isEditable(ano, mes);
      if (!editability.editable) {
        return NextResponse.json(
          {
            error: editability.reason ?? "Lançamento fora da janela editável.",
            editableUntil: editability.editableUntil?.toISOString(),
          },
          { status: 403 },
        );
      }
    }
    const mergedRows = [
      ...currentHistory
        .filter((item) => !(item.ano === ano && item.mes === mes))
        .map((item) => ({
          ano: item.ano,
          mes: item.mes,
          faturamentoMes: Number(item.faturamento_mes),
          folhaMes: Number(item.folha_mes),
          anexoCalculado: item.anexo_calculado,
          fatorR: item.fator_r,
        })),
      {
        ano,
        mes,
        faturamentoMes,
        folhaMes,
      },
    ].sort((a, b) => a.ano * 100 + a.mes - (b.ano * 100 + b.mes));

    const summary = summarizeMonthlyMonitor({
      cnae,
      tipoMei,
      mesAtual: mes,
      historico: mergedRows,
    });
    const cnaeInfo = getCnaeInfo(cnae);
    const anexoCalculado = cnaeInfo?.elegivelFatorR
      ? getAnexoEfetivo(cnae, summary.fatorRAtual)
      : (cnaeInfo?.anexoPadrao ?? "III");
    const transition = detectAnexoTransition([
      ...currentHistory.map((item) => ({
        ano: item.ano,
        mes: item.mes,
        anexoCalculado: item.anexo_calculado,
        fatorR: item.fator_r,
      })),
      {
        ano,
        mes,
        anexoCalculado,
        fatorR: summary.fatorRAtual,
      },
    ]);

    const { error: upsertError } = await supabase
      .from("monthly_inputs")
      .upsert(
        {
          user_id: user.id,
          ano,
          mes,
          faturamento_mes: faturamentoMes,
          folha_mes: folhaMes,
          cnae,
          tipo_mei: tipoMei,
          rbt12: summary.rbt12,
          projecao_anual: summary.projecaoAnual,
          fator_r: summary.fatorRAtual,
          anexo_calculado: anexoCalculado,
          tax_rule_version: TAX_RULE_VERSION,
        },
        { onConflict: "user_id,ano,mes" },
      )
      .select("id")
      .single();

    if (upsertError) {
      logger.error(
        "api.monthly-inputs.upsert",
        "Erro ao salvar monitor mensal",
        { message: upsertError.message },
      );
      return NextResponse.json(
        { error: "Não foi possível salvar o monitor mensal." },
        { status: 500 },
      );
    }

    if (transition && user.email) {
      void sendAnexoAlertEmail({
        to: user.email,
        nome: user.email.split("@")[0] ?? "Cliente",
        from: transition.from,
        toAnexo: transition.to,
        mes: transition.mes,
        ano: transition.ano,
        fatorR: transition.fatorR,
      }).catch((error) => {
        logger.error(
          "api.monthly-inputs.email",
          "Erro ao enviar email de alerta",
          { error },
        );
      });
    }

    return NextResponse.json({
      ok: true,
      summary,
      transition,
      anexoCalculado,
    });
  } catch (error) {
    logger.error(
      "api.monthly-inputs.catch",
      "Erro interno ao atualizar monitor",
      { error },
    );
    return NextResponse.json(
      { error: "Erro interno ao atualizar o monitor mensal." },
      { status: 500 },
    );
  }
}
