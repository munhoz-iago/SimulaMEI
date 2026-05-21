import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { simular } from "@/lib/tributario";
import { normalizeCnaeCode, getCnae } from "@/lib/tributario";
import { logger } from "@/lib/logger";
import type { EntradaSimulacao, TipoMei } from "@/types/tributario";
import { hashIpAddress } from "@/lib/security/hash";
import { getClientIp, getUserAgent } from "@/lib/security/request";
import { normalizeBoundedText, ONBOARDING_TEXT_LIMITS } from "@/lib/validation";

interface OnboardingPayload {
  nome: string;
  nomeNegocio: string;
  telefone: string;
  cnaePrincipal: string;
  tipoMei: TipoMei;
  municipio: string;
  uf: string;
  faturamentoMensalEstimado: number;
  faturamentoAcumuladoAtual: number;
  folhaMensal: number;
  mesAtual: number;
  objetivoPrincipal: string;
  atividadesRealizadas: string;
}

const UF_RE = /^[A-Z]{2}$/;

function isTipoMei(value: unknown): value is TipoMei {
  return value === "geral" || value === "caminhoneiro";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const ipHash = hashIpAddress(getClientIp(request));
    const userAgent = getUserAgent(request);

    if (!user) {
      return NextResponse.json(
        { error: "Autenticação obrigatória." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as OnboardingPayload;
    const nome = normalizeBoundedText(body.nome, ONBOARDING_TEXT_LIMITS.nome);
    const nomeNegocio = normalizeBoundedText(
      body.nomeNegocio,
      ONBOARDING_TEXT_LIMITS.nomeNegocio,
    );
    const telefone = normalizeBoundedText(
      body.telefone,
      ONBOARDING_TEXT_LIMITS.telefone,
    );
    const cnaePrincipal =
      typeof body.cnaePrincipal === "string"
        ? normalizeCnaeCode(body.cnaePrincipal)
        : "";
    const municipio = normalizeBoundedText(
      body.municipio,
      ONBOARDING_TEXT_LIMITS.municipio,
    );
    const uf = normalizeBoundedText(body.uf, 2)?.toUpperCase() ?? "";
    const objetivoPrincipal = normalizeBoundedText(
      body.objetivoPrincipal,
      ONBOARDING_TEXT_LIMITS.objetivoPrincipal,
    );
    const atividadesRealizadas = normalizeBoundedText(
      body.atividadesRealizadas,
      ONBOARDING_TEXT_LIMITS.atividadesRealizadas,
    );

    const faturamentoMensalEstimado = Number(body.faturamentoMensalEstimado);
    const faturamentoAcumuladoAtual = Number(body.faturamentoAcumuladoAtual);
    const folhaMensal = Number(body.folhaMensal);
    const mesAtual = Number(body.mesAtual);

    if (
      !nome ||
      !nomeNegocio ||
      !telefone ||
      !cnaePrincipal ||
      !municipio ||
      !UF_RE.test(uf) ||
      !objetivoPrincipal ||
      !atividadesRealizadas ||
      !isTipoMei(body.tipoMei) ||
      !Number.isFinite(faturamentoMensalEstimado) ||
      !Number.isFinite(faturamentoAcumuladoAtual) ||
      !Number.isFinite(folhaMensal) ||
      !Number.isInteger(mesAtual) ||
      mesAtual < 1 ||
      mesAtual > 12 ||
      faturamentoMensalEstimado < 0 ||
      faturamentoAcumuladoAtual < 0 ||
      folhaMensal < 0
    ) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios com valores válidos." },
        { status: 400 },
      );
    }

    if (!getCnae(cnaePrincipal)) {
      return NextResponse.json(
        { error: "CNAE não reconhecido. Informe um código oficial válido." },
        { status: 400 },
      );
    }

    const profile = {
      id: user.id,
      email: user.email ?? "",
      nome,
      nome_negocio: nomeNegocio,
      telefone,
      cnae_principal: cnaePrincipal,
      tipo_mei: body.tipoMei,
      municipio,
      uf,
      faturamento_mensal_estimado: faturamentoMensalEstimado,
      faturamento_acumulado_atual: faturamentoAcumuladoAtual,
      folha_mensal: folhaMensal,
      mes_atual: mesAtual,
      objetivo_principal: objetivoPrincipal,
      atividades_realizadas: atividadesRealizadas,
      onboarding_completed_at: new Date().toISOString(),
    };

    // Tenta update primeiro — perfil já existe pelo trigger de criação de usuário.
    // Não passa `email` no update para evitar conflito com trigger que gerencia esse campo.
    // Inclui `select('id')` para detectar quando o RLS filtra a linha sem retornar erro.
    const { error: updateError, data: updateData } = await supabase
      .from("user_profiles")
      .update({
        nome: profile.nome,
        nome_negocio: profile.nome_negocio,
        telefone: profile.telefone,
        cnae_principal: profile.cnae_principal,
        tipo_mei: profile.tipo_mei,
        municipio: profile.municipio,
        uf: profile.uf,
        faturamento_mensal_estimado: profile.faturamento_mensal_estimado,
        faturamento_acumulado_atual: profile.faturamento_acumulado_atual,
        folha_mensal: profile.folha_mensal,
        mes_atual: profile.mes_atual,
        objetivo_principal: profile.objetivo_principal,
        atividades_realizadas: profile.atividades_realizadas,
        onboarding_completed_at: profile.onboarding_completed_at,
      })
      .eq("id", user.id)
      .select("id");

    const updateSucceeded =
      !updateError && Array.isArray(updateData) && updateData.length > 0;

    if (!updateSucceeded) {
      if (updateError) {
        logger.error("api.onboarding.update", "Erro ao atualizar perfil", {
          message: updateError.message,
        });
      }
      // Fallback: upsert completo (perfil não existe ainda ou RLS bloqueou o update)
      const { error: upsertError } = await supabase
        .from("user_profiles")
        .upsert(profile, { onConflict: "id" });

      if (upsertError) {
        logger.error(
          "api.onboarding.upsert",
          "Erro ao fazer upsert de perfil",
          { message: upsertError.message },
        );
        return NextResponse.json(
          { error: "Não foi possível salvar o pré-cadastro." },
          { status: 500 },
        );
      }
    }

    const entrada: EntradaSimulacao = {
      faturamentoAcumulado: faturamentoAcumuladoAtual,
      mesAtual,
      cnae: cnaePrincipal,
      folhaMensal,
      tipoMei: body.tipoMei,
    };
    const resultado = simular(entrada);

    const { error: simulationError } = await supabase
      .from("simulations")
      .insert({
        user_id: user.id,
        entrada,
        resultado,
        ip_hash: ipHash,
        user_agent: userAgent,
      });

    if (simulationError) {
      logger.error("api.onboarding.simulation", "Erro ao salvar simulação", {
        message: simulationError.message,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("api.onboarding.catch", "Erro interno no onboarding", {
      error,
    });
    return NextResponse.json(
      { error: "Erro interno no pré-cadastro." },
      { status: 500 },
    );
  }
}
