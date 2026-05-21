import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_RATE_LIMITS } from "@/constants/security";
import { normalizeAccountantLeadPayload } from "@/lib/accountant/leads";
import {
  sendAccountantLeadConfirmation,
  sendAccountantLeadNotification,
} from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIpAddress } from "@/lib/security/hash";
import {
  applyRateLimitHeaders,
  consumeRateLimit,
} from "@/lib/security/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/security/request";
import { logger } from "@/lib/logger";

interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export async function POST(request: NextRequest) {
  // Valida env vars cedo — loga causa real antes de qualquer await
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    logger.error("api.accountant-leads.env", "Supabase env vars ausentes", {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    return NextResponse.json(
      { error: "Serviço temporariamente indisponível." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const ipHash = hashIpAddress(getClientIp(request));
    const rateLimit = await consumeRateLimit({
      namespace: "accountant_leads",
      subjectHash: ipHash,
      limit: PUBLIC_RATE_LIMITS.accountantLeads.limit,
      windowSeconds: PUBLIC_RATE_LIMITS.accountantLeads.windowSeconds,
    });

    if (!rateLimit.allowed) {
      return applyRateLimitHeaders(
        NextResponse.json(
          {
            error:
              "Limite de solicitações atingido. Tente novamente mais tarde.",
          },
          { status: 429 },
        ),
        rateLimit,
        PUBLIC_RATE_LIMITS.accountantLeads.limit,
      );
    }

    const parsed = normalizeAccountantLeadPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const lead = parsed.value;
    const origem = request.headers.get("referer");
    const admin = createAdminClient();
    const consentimentoEm = new Date().toISOString();

    // Tabela não está nos tipos gerados — cast necessário até próxima geração de tipos
    const { error: dbError } = await (
      admin as ReturnType<typeof createAdminClient>
    )
      .from("accountant_leads" as string)
      .upsert(
        {
          email: lead.email,
          nome_escritorio: lead.nomeEscritorio,
          telefone: lead.telefone ?? null,
          carteira_range: lead.carteiraRange,
          ferramenta_atual: lead.ferramentaAtual ?? null,
          origem,
          user_agent: getUserAgent(request),
          ip_hash: ipHash,
          consentimento_lgpd: true,
          consentimento_em: consentimentoEm,
          status: "novo",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        { onConflict: "email" },
      );

    if (dbError) {
      const e = dbError as unknown as SupabaseError;
      logger.error("api.accountant-leads.upsert", "Erro ao salvar lead", {
        message: e.message,
        code: e.code,
      });
      return NextResponse.json(
        { error: "Não foi possível registrar o interesse agora." },
        { status: 500 },
      );
    }

    // Confirmação para o lead (todos)
    void sendAccountantLeadConfirmation({
      email: lead.email,
      nomeEscritorio: lead.nomeEscritorio,
    }).catch((confError: unknown) => {
      logger.error(
        "api.accountant-leads.email.confirm",
        "Erro ao enviar email de confirmação",
        { error: confError },
      );
    });

    // Notificação interna para carteiras grandes
    if (lead.carteiraRange === "150+") {
      void sendAccountantLeadNotification({
        email: lead.email,
        nomeEscritorio: lead.nomeEscritorio,
        telefone: lead.telefone ?? null,
        carteiraRange: lead.carteiraRange,
        ferramentaAtual: lead.ferramentaAtual ?? null,
        origem,
      }).catch((notifError: unknown) => {
        logger.error(
          "api.accountant-leads.email.notify",
          "Erro ao enviar notificação interna",
          { error: notifError },
        );
      });
    }

    return applyRateLimitHeaders(
      NextResponse.json({ ok: true }),
      rateLimit,
      PUBLIC_RATE_LIMITS.accountantLeads.limit,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("api.accountant-leads.catch", "Erro não tratado", { message });
    return NextResponse.json(
      { error: "Erro interno ao registrar interesse." },
      { status: 500 },
    );
  }
}
