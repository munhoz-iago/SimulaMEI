import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_RATE_LIMITS } from "@/constants/security";
import { normalizeCnaeCode } from "@/lib/tributario";
import {
  consumeRateLimit,
  applyRateLimitHeaders,
} from "@/lib/security/rate-limit";
import { hashIpAddress } from "@/lib/security/hash";
import { getClientIp, getUserAgent } from "@/lib/security/request";
import { normalizeEmail } from "@/lib/validation";
import { logger } from "@/lib/logger";

interface LeadPayload {
  email: string;
  consentimentoLgpd?: boolean;
  tipo?: "simulacao" | "contador_waitlist";
  faturamentoAnual?: number;
  cnae?: string;
  mesAtual?: number;
  anexoAtual?: string;
  alertaCenario?: string;
  taxRuleVersion?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LeadPayload;
    const ipHash = hashIpAddress(getClientIp(req));
    const rateLimit = await consumeRateLimit({
      namespace: "leads",
      subjectHash: ipHash,
      limit: PUBLIC_RATE_LIMITS.leads.limit,
      windowSeconds: PUBLIC_RATE_LIMITS.leads.windowSeconds,
    });

    if (!rateLimit.allowed) {
      return applyRateLimitHeaders(
        NextResponse.json(
          {
            error: "Limite de tentativas atingido. Tente novamente mais tarde.",
          },
          { status: 429 },
        ),
        rateLimit,
        PUBLIC_RATE_LIMITS.leads.limit,
      );
    }

    const email = normalizeEmail(body.email);
    const consentimentoLgpd = body.consentimentoLgpd === true;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    if (!consentimentoLgpd) {
      return NextResponse.json(
        {
          error:
            "Você precisa aceitar a política de privacidade para liberar a análise completa.",
        },
        { status: 400 },
      );
    }

    const tipo =
      body.tipo === "contador_waitlist" ? "contador_waitlist" : "simulacao";
    const normalizedCnae =
      typeof body.cnae === "string"
        ? normalizeCnaeCode(body.cnae) || null
        : null;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const lead = {
      email,
      tipo,
      faturamento_anual: body.faturamentoAnual ?? null,
      cnae: normalizedCnae,
      mes_atual: body.mesAtual ?? null,
      anexo_atual: body.anexoAtual ?? null,
      alerta_cenario: body.alertaCenario ?? null,
      tax_rule_version: body.taxRuleVersion ?? null,
      origem: req.headers.get("referer") ?? null,
      user_agent: getUserAgent(req),
      ip_hash: ipHash,
      user_id: user?.id ?? null,
      consentimento_lgpd: consentimentoLgpd,
      consentimento_em: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("leads")
      .upsert(lead, { onConflict: "email,tipo" });

    if (error) {
      // Falha silenciosa — não bloqueia o fluxo do usuário
      logger.error("api.leads.upsert", "Erro ao salvar lead", {
        message: error.message,
      });
    }

    return applyRateLimitHeaders(
      NextResponse.json({ ok: true }),
      rateLimit,
      PUBLIC_RATE_LIMITS.leads.limit,
    );
  } catch (err) {
    logger.error("api.leads.catch", "Erro ao salvar lead", { error: err });
    return NextResponse.json(
      { error: "Erro ao salvar lead." },
      { status: 500 },
    );
  }
}
