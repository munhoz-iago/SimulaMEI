import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ACCOUNTANT_PLAN_LIMITS,
  normalizeAccountantOfficeOnboarding,
} from "@/lib/accountant/office";
import { logger } from "@/lib/logger";

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

    const body = await request.json();
    const parsed = normalizeAccountantOfficeOnboarding(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const admin = createAdminClient();
    const officesTable = admin.from("accountant_offices") as unknown as {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          maybeSingle: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
      insert: (payload: Record<string, unknown>) => {
        select: (columns: string) => {
          single: () => Promise<{
            data: { id: string } | null;
            error: { message: string; code?: string } | null;
          }>;
        };
      };
    };
    const membersTable = admin.from("office_members") as unknown as {
      upsert: (
        payload: Record<string, unknown>,
        options: { onConflict: string },
      ) => Promise<{ error: { message: string } | null }>;
    };

    const existing = await officesTable
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (existing.error) {
      logger.error(
        "api.accountant.onboarding.existing",
        "Erro ao verificar escritório existente",
        { message: existing.error.message },
      );
      return NextResponse.json(
        { error: "Não foi possível verificar o escritório atual." },
        { status: 500 },
      );
    }

    if (existing.data?.id) {
      return NextResponse.json({
        ok: true,
        officeId: existing.data.id,
        alreadyExists: true,
      });
    }

    const input = parsed.value;
    const trialEndsAt = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const officeResult = await officesTable
      .insert({
        owner_user_id: user.id,
        name: input.nomeEscritorio,
        cnpj: input.cnpj,
        telefone: input.telefone,
        plan: "starter_trial",
        max_clients: ACCOUNTANT_PLAN_LIMITS.starter_trial,
        trial_ends_at: trialEndsAt,
        white_label: {
          carteira_range: input.carteiraRange,
          ferramenta_atual: input.ferramentaAtual,
          objetivo: input.objetivo,
        },
      })
      .select("id")
      .single();

    if (officeResult.error || !officeResult.data) {
      logger.error(
        "api.accountant.onboarding.insert",
        "Erro ao criar escritório",
        { message: officeResult.error?.message },
      );
      return NextResponse.json(
        { error: "Não foi possível criar o escritório." },
        { status: 500 },
      );
    }

    const { error: memberError } = await membersTable.upsert(
      {
        office_id: officeResult.data.id,
        user_id: user.id,
        role: "owner",
        accepted_at: new Date().toISOString(),
      },
      { onConflict: "office_id,user_id" },
    );

    if (memberError) {
      logger.error(
        "api.accountant.onboarding.member",
        "Erro ao adicionar membro",
        { message: memberError.message },
      );
      return NextResponse.json(
        { error: "Não foi possível vincular o usuário ao escritório." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, officeId: officeResult.data.id });
  } catch (error) {
    logger.error(
      "api.accountant.onboarding.catch",
      "Erro interno no onboarding",
      { error },
    );
    return NextResponse.json(
      { error: "Erro interno no onboarding contador." },
      { status: 500 },
    );
  }
}
