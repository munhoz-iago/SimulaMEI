import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const DELETE_CONFIRMATION = "EXCLUIR";

interface DeleteAccountPayload {
  confirmation?: unknown;
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

    const body = (await request
      .json()
      .catch(() => null)) as DeleteAccountPayload | null;
    if (body?.confirmation !== DELETE_CONFIRMATION) {
      return NextResponse.json(
        { error: "Confirmação inválida para exclusão da conta." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const normalizedEmail = user.email?.trim().toLowerCase() ?? null;

    const { error: apiKeysError } = await admin
      .from("api_keys")
      .delete()
      .eq("user_id", user.id);

    if (apiKeysError) {
      logger.error(
        "api.account.delete.api_keys",
        "Erro ao excluir chaves de API",
        { message: apiKeysError.message },
      );
      return NextResponse.json(
        { error: "Não foi possível limpar as chaves da conta." },
        { status: 500 },
      );
    }

    const { error: simulationsError } = await admin
      .from("simulations")
      .delete()
      .eq("user_id", user.id);

    if (simulationsError) {
      logger.error(
        "api.account.delete.simulations",
        "Erro ao excluir simulações",
        { message: simulationsError.message },
      );
      return NextResponse.json(
        { error: "Não foi possível remover as simulações da conta." },
        { status: 500 },
      );
    }

    const { error: leadsByUserError } = await admin
      .from("leads")
      .delete()
      .eq("user_id", user.id);

    if (leadsByUserError) {
      logger.error(
        "api.account.delete.leads_user",
        "Erro ao excluir leads por user_id",
        { message: leadsByUserError.message },
      );
      return NextResponse.json(
        { error: "Não foi possível remover os leads vinculados à conta." },
        { status: 500 },
      );
    }

    if (normalizedEmail) {
      const { error: leadsByEmailError } = await admin
        .from("leads")
        .delete()
        .eq("email", normalizedEmail);

      if (leadsByEmailError) {
        logger.error(
          "api.account.delete.leads_email",
          "Erro ao excluir leads por email",
          { message: leadsByEmailError.message },
        );
        return NextResponse.json(
          { error: "Não foi possível remover os leads associados ao e-mail." },
          { status: 500 },
        );
      }
    }

    const { error: profileError } = await admin
      .from("user_profiles")
      .delete()
      .eq("id", user.id);

    if (profileError) {
      logger.error("api.account.delete.profile", "Erro ao excluir perfil", {
        message: profileError.message,
      });
      return NextResponse.json(
        { error: "Não foi possível remover o perfil da conta." },
        { status: 500 },
      );
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(
      user.id,
    );

    if (authDeleteError) {
      logger.error(
        "api.account.delete.auth",
        "Erro ao excluir usuário do auth",
        { message: authDeleteError.message },
      );
      return NextResponse.json(
        { error: "Não foi possível concluir a exclusão da conta." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("api.account.delete.catch", "Erro interno ao excluir conta", {
      error,
    });
    return NextResponse.json(
      { error: "Erro interno ao excluir a conta." },
      { status: 500 },
    );
  }
}
