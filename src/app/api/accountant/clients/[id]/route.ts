import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentAccountantOffice,
  type CurrentAccountantOffice,
} from "@/lib/accountant/server";
import {
  normalizeOfficeClientUpdate,
  type NormalizedOfficeClientUpdate,
} from "@/lib/accountant/clients";
import { logger } from "@/lib/logger";

interface DbError {
  message: string;
}

interface OfficeClientRow {
  id: string;
  name: string;
  email: string | null;
  cnae: string;
  tipo_mei: string;
  uf: string | null;
  municipio: string | null;
  observacoes: string | null;
  ativo: boolean;
  inactive_reason: string | null;
  disabled_by_plan_limit_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface QueryResult<T> {
  data: T;
  error: DbError | null;
  count?: number | null;
}

interface SupabaseQuery<T> extends PromiseLike<QueryResult<T>> {
  eq(column: string, value: unknown): SupabaseQuery<T>;
  select(columns: string): SupabaseQuery<T>;
  maybeSingle(): Promise<QueryResult<T | null>>;
  single(): Promise<QueryResult<T>>;
}

interface OfficeClientsTable {
  select<T = OfficeClientRow>(
    columns: string,
    options?: { count?: "exact"; head?: boolean },
  ): SupabaseQuery<T>;
  update(payload: Record<string, unknown>): SupabaseQuery<OfficeClientRow>;
}

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

const CLIENT_COLUMNS =
  "id, name, email, cnae, tipo_mei, uf, municipio, observacoes, ativo, inactive_reason, disabled_by_plan_limit_at, created_at, updated_at";

function getOfficeClientsTable() {
  return createAdminClient().from(
    "office_clients",
  ) as unknown as OfficeClientsTable;
}

async function getClientId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

async function getAuthenticatedOffice(): Promise<
  | { ok: true; office: CurrentAccountantOffice }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Autenticação obrigatória." },
        { status: 401 },
      ),
    };
  }

  const { office, error } = await getCurrentAccountantOffice(
    supabase,
    user.id,
    user.email,
  );
  if (error) {
    logger.error(
      "api.accountant.clients.office",
      "Erro ao carregar escritório",
      { error },
    );
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Não foi possível carregar o escritório." },
        { status: 500 },
      ),
    };
  }

  if (!office) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Escritório contador não configurado." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, office };
}

async function getClient(
  table: OfficeClientsTable,
  officeId: string,
  clientId: string,
) {
  return table
    .select<OfficeClientRow>(CLIENT_COLUMNS)
    .eq("office_id", officeId)
    .eq("id", clientId)
    .maybeSingle();
}

function toUpdatePayload(input: NormalizedOfficeClientUpdate) {
  const payload: Record<string, unknown> = {};

  if ("nome" in input) payload.name = input.nome;
  if ("email" in input) payload.email = input.email;
  if ("cnae" in input) payload.cnae = input.cnae;
  if ("tipoMei" in input) payload.tipo_mei = input.tipoMei;
  if ("uf" in input) payload.uf = input.uf;
  if ("municipio" in input) payload.municipio = input.municipio;
  if ("observacoes" in input) payload.observacoes = input.observacoes;

  if ("ativo" in input) {
    if (input.ativo) {
      payload.ativo = true;
      payload.inactive_reason = null;
      payload.disabled_by_plan_limit_at = null;
    } else {
      payload.ativo = false;
      payload.inactive_reason = "manual";
      payload.disabled_by_plan_limit_at = null;
    }
  }

  return payload;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedOffice();
    if (!auth.ok) return auth.response;

    const clientId = await getClientId(context);
    const table = getOfficeClientsTable();
    const { data, error } = await getClient(table, auth.office.id, clientId);

    if (error) {
      logger.error("api.accountant.clients.get", "Erro ao carregar cliente", {
        message: error.message,
      });
      return NextResponse.json(
        { error: "Não foi possível carregar o cliente." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, client: data });
  } catch (error) {
    logger.error(
      "api.accountant.clients.get.catch",
      "Erro interno ao carregar cliente",
      { error },
    );
    return NextResponse.json(
      { error: "Erro interno ao carregar cliente." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedOffice();
    if (!auth.ok) return auth.response;

    const clientId = await getClientId(context);
    const body = await request.json();
    const parsed = normalizeOfficeClientUpdate(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const table = getOfficeClientsTable();
    if (parsed.value.ativo === true) {
      const current = await getClient(table, auth.office.id, clientId);
      if (current.error) {
        logger.error(
          "api.accountant.clients.validate",
          "Erro ao validar cliente",
          { message: current.error.message },
        );
        return NextResponse.json(
          { error: "Não foi possível validar o cliente." },
          { status: 500 },
        );
      }
      if (!current.data) {
        return NextResponse.json(
          { error: "Cliente não encontrado." },
          { status: 404 },
        );
      }

      if (!current.data.ativo) {
        const activeCountResult = await table
          .select<null>("id", { count: "exact", head: true })
          .eq("office_id", auth.office.id)
          .eq("ativo", true);

        if (activeCountResult.error) {
          logger.error(
            "api.accountant.clients.count",
            "Erro ao contar clientes ativos",
            { message: activeCountResult.error.message },
          );
          return NextResponse.json(
            { error: "Não foi possível validar o limite do plano." },
            { status: 500 },
          );
        }

        if ((activeCountResult.count ?? 0) >= auth.office.max_clients) {
          return NextResponse.json(
            {
              error: `Limite de ${auth.office.max_clients} clientes ativos atingido para o plano atual.`,
            },
            { status: 409 },
          );
        }
      }
    }

    const updateResult = await table
      .update(toUpdatePayload(parsed.value))
      .eq("office_id", auth.office.id)
      .eq("id", clientId)
      .select(CLIENT_COLUMNS)
      .single();

    if (updateResult.error || !updateResult.data) {
      logger.error(
        "api.accountant.clients.update",
        "Erro ao atualizar cliente",
        { message: updateResult.error?.message },
      );
      return NextResponse.json(
        { error: "Não foi possível atualizar o cliente." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, client: updateResult.data });
  } catch (error) {
    logger.error(
      "api.accountant.clients.patch.catch",
      "Erro interno ao atualizar cliente",
      { error },
    );
    return NextResponse.json(
      { error: "Erro interno ao atualizar cliente." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedOffice();
    if (!auth.ok) return auth.response;

    const clientId = await getClientId(context);
    const table = getOfficeClientsTable();
    const updateResult = await table
      .update({
        ativo: false,
        inactive_reason: "manual",
        disabled_by_plan_limit_at: null,
      })
      .eq("office_id", auth.office.id)
      .eq("id", clientId)
      .select(CLIENT_COLUMNS)
      .single();

    if (updateResult.error || !updateResult.data) {
      logger.error("api.accountant.clients.delete", "Erro ao pausar cliente", {
        message: updateResult.error?.message,
      });
      return NextResponse.json(
        { error: "Não foi possível pausar o cliente." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, client: updateResult.data });
  } catch (error) {
    logger.error(
      "api.accountant.clients.delete.catch",
      "Erro interno ao pausar cliente",
      { error },
    );
    return NextResponse.json(
      { error: "Erro interno ao pausar cliente." },
      { status: 500 },
    );
  }
}
