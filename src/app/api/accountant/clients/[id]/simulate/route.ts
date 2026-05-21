import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentAccountantOffice,
  type CurrentAccountantOffice,
} from "@/lib/accountant/server";
import {
  getAccountantBillingRestrictionMessage,
  getAccountantBillingState,
  isAccountantBillingRestricted,
} from "@/lib/accountant/billing-state";
import { normalizeOfficeClientSimulation } from "@/lib/accountant/simulations";
import { simular } from "@/lib/tributario";
import { logger } from "@/lib/logger";

interface DbError {
  message: string;
}

interface User {
  id: string;
}

interface OfficeClientRow {
  id: string;
  name: string;
  cnae: string | null;
  tipo_mei: string | null;
  ativo: boolean;
}

interface OfficeSimulationRow {
  id: string;
  office_id: string;
  client_id: string;
  created_at: string;
}

interface QueryResult<T> {
  data: T;
  error: DbError | null;
}

interface SupabaseQuery<T> extends PromiseLike<QueryResult<T>> {
  eq(column: string, value: unknown): SupabaseQuery<T>;
  select(columns: string): SupabaseQuery<T>;
  maybeSingle(): Promise<QueryResult<T | null>>;
  single(): Promise<QueryResult<T>>;
}

interface OfficeClientsTable {
  select<T = OfficeClientRow>(columns: string): SupabaseQuery<T>;
}

interface OfficeSimulationsTable {
  insert(payload: Record<string, unknown>): SupabaseQuery<OfficeSimulationRow>;
}

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

function getAdminTables() {
  const admin = createAdminClient();
  return {
    clients: admin.from("office_clients") as unknown as OfficeClientsTable,
    simulations: admin.from(
      "office_simulations",
    ) as unknown as OfficeSimulationsTable,
  };
}

async function getClientId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

async function getAuthenticatedOffice(): Promise<
  | { ok: true; office: CurrentAccountantOffice; user: User }
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
      "api.accountant.clients.simulate.office",
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

  return { ok: true, office, user };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthenticatedOffice();
    if (!auth.ok) return auth.response;
    const billing = getAccountantBillingState(auth.office);
    if (isAccountantBillingRestricted(billing)) {
      return NextResponse.json(
        {
          error: getAccountantBillingRestrictionMessage("simulate"),
          billing,
        },
        { status: 402 },
      );
    }

    const clientId = await getClientId(context);
    const { clients, simulations } = getAdminTables();
    const clientResult = await clients
      .select<OfficeClientRow>("id, name, cnae, tipo_mei, ativo")
      .eq("office_id", auth.office.id)
      .eq("id", clientId)
      .maybeSingle();

    if (clientResult.error) {
      logger.error(
        "api.accountant.clients.simulate.client",
        "Erro ao carregar cliente",
        { message: clientResult.error.message },
      );
      return NextResponse.json(
        { error: "Não foi possível carregar o cliente." },
        { status: 500 },
      );
    }

    if (!clientResult.data) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 },
      );
    }

    if (!clientResult.data.ativo) {
      return NextResponse.json(
        { error: "Cliente pausado não pode receber nova simulação." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const parsed = normalizeOfficeClientSimulation(body, clientResult.data);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const entrada = parsed.value;
    const resultado = simular(entrada);
    const insertResult = await simulations
      .insert({
        office_id: auth.office.id,
        client_id: clientResult.data.id,
        performed_by: auth.user.id,
        entrada,
        resultado,
        tax_rule_version: resultado.taxRuleVersion,
      })
      .select("id, office_id, client_id, created_at")
      .single();

    if (insertResult.error || !insertResult.data) {
      logger.error(
        "api.accountant.clients.simulate.insert",
        "Erro ao salvar simulação",
        { message: insertResult.error?.message },
      );
      return NextResponse.json(
        { error: "Não foi possível salvar a simulação do cliente." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      simulation: insertResult.data,
      resultado,
    });
  } catch (error) {
    logger.error(
      "api.accountant.clients.simulate.catch",
      "Erro interno ao simular cliente",
      { error },
    );
    return NextResponse.json(
      { error: "Erro interno ao simular cliente." },
      { status: 500 },
    );
  }
}
