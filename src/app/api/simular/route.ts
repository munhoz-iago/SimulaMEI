import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { EntradaSimulacao } from "@/types/tributario";
import { FREE_SIMULATION_LIMIT } from "@/constants/plans";
import { simular } from "@/lib/tributario";
import { getCnae, normalizeCnaeCode } from "@/lib/tributario";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_RATE_LIMITS } from "@/constants/security";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
} from "@/lib/security/rate-limit";
import { hashIpAddress } from "@/lib/security/hash";
import { getClientIp, getUserAgent } from "@/lib/security/request";
import { logger } from "@/lib/logger";

type SimularPayload = Partial<EntradaSimulacao> & {
  faturamentoAnual?: unknown;
};

function isTipoMei(value: unknown): value is EntradaSimulacao["tipoMei"] {
  return value === "geral" || value === "caminhoneiro";
}

function isValidFolhaDetalhada(
  value: unknown,
): value is EntradaSimulacao["folhaDetalhada"] {
  if (typeof value === "undefined") return true;
  if (!value || typeof value !== "object") return false;

  return [
    "salariosClt",
    "proLabore",
    "inssPatronal",
    "fgts",
    "rpa",
    "beneficios",
  ].every((key) => {
    const field = (value as Record<string, unknown>)[key];
    return (
      typeof field === "undefined" ||
      (typeof field === "number" && Number.isFinite(field) && field >= 0)
    );
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SimularPayload;
    const ipHash = hashIpAddress(getClientIp(req));
    const rateLimit = await consumeRateLimit({
      namespace: "simulations",
      subjectHash: ipHash,
      limit: PUBLIC_RATE_LIMITS.simulations.limit,
      windowSeconds: PUBLIC_RATE_LIMITS.simulations.windowSeconds,
    });

    if (!rateLimit.allowed) {
      return applyRateLimitHeaders(
        NextResponse.json(
          {
            error: "Limite de simulações atingido. Tente novamente mais tarde.",
          },
          { status: 429 },
        ),
        rateLimit,
        PUBLIC_RATE_LIMITS.simulations.limit,
      );
    }

    if (typeof body.faturamentoAnual !== "undefined") {
      return NextResponse.json(
        {
          error:
            "Use faturamentoAcumulado. O campo faturamentoAnual nao e mais aceito nesta API.",
        },
        { status: 400 },
      );
    }

    const {
      faturamentoAcumulado,
      mesAtual,
      cnae,
      folhaMensal,
      folhaDetalhada,
      tipoMei,
    } = body;

    if (
      typeof faturamentoAcumulado !== "number" ||
      !Number.isFinite(faturamentoAcumulado) ||
      typeof mesAtual !== "number" ||
      !Number.isInteger(mesAtual) ||
      typeof cnae !== "string" ||
      typeof folhaMensal !== "number" ||
      !Number.isFinite(folhaMensal) ||
      !isValidFolhaDetalhada(folhaDetalhada) ||
      !isTipoMei(tipoMei)
    ) {
      return NextResponse.json(
        {
          error:
            "Campos inválidos. Verifique faturamentoAcumulado, mesAtual, cnae, folhaMensal e tipoMei.",
        },
        { status: 400 },
      );
    }

    if (mesAtual < 1 || mesAtual > 12) {
      return NextResponse.json(
        { error: "mesAtual deve ser entre 1 e 12." },
        { status: 400 },
      );
    }

    if (faturamentoAcumulado < 0 || folhaMensal < 0) {
      return NextResponse.json(
        { error: "Valores monetários não podem ser negativos." },
        { status: 400 },
      );
    }

    const normalizedCnae = normalizeCnaeCode(cnae);
    if (!getCnae(normalizedCnae)) {
      return NextResponse.json(
        { error: "CNAE não reconhecido. Informe um código oficial válido." },
        { status: 400 },
      );
    }

    const entrada: EntradaSimulacao = {
      faturamentoAcumulado,
      mesAtual,
      cnae: normalizedCnae,
      folhaMensal,
      ...(folhaDetalhada ? { folhaDetalhada } : {}),
      tipoMei,
    };

    const resultado = simular(entrada);

    // Persiste simulação no Supabase (não-bloqueante)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      try {
        const [{ data: profile }, { count, error: countError }] =
          await Promise.all([
            supabase
              .from("user_profiles")
              .select("plano")
              .eq("id", user.id)
              .maybeSingle(),
            supabase
              .from("simulations")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id),
          ]);

        if (
          !countError &&
          (profile?.plano ?? "free") === "free" &&
          (count ?? 0) >= FREE_SIMULATION_LIMIT
        ) {
          return NextResponse.json(
            {
              error: "Limite de simulações do Plano Free atingido.",
              upgradePath: "/upgrade",
              used: count ?? 0,
              limit: FREE_SIMULATION_LIMIT,
            },
            { status: 403 },
          );
        }
      } catch (error) {
        logger.warn(
          "api.simular.plan-check",
          "Verificação de plano free ignorada",
          { error },
        );
      }
    }

    const { error } = await supabase.from("simulations").insert({
      user_id: user?.id ?? null,
      entrada,
      resultado,
      ip_hash: ipHash,
      user_agent: getUserAgent(req),
    });
    if (error) {
      logger.error("api.simular.insert", "Erro ao salvar simulação", {
        message: error.message,
      });
    } else if (user?.id) {
      // Invalida o cache do dashboard quando um usuário logado salva uma simulação
      revalidatePath('/dashboard')
    }

    return applyRateLimitHeaders(
      NextResponse.json(resultado),
      rateLimit,
      PUBLIC_RATE_LIMITS.simulations.limit,
    );
  } catch (err) {
    logger.error("api.simular.catch", "Erro ao processar simulação", {
      error: err,
    });
    return NextResponse.json(
      { error: "Erro interno ao processar a simulação." },
      { status: 500 },
    );
  }
}
