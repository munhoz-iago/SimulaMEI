import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentAccountantOffice,
  isAdminAccessFallbackOffice,
  type CurrentAccountantOffice,
} from "@/lib/accountant/server";
import {
  getAccountantBillingRestrictionMessage,
  getAccountantBillingState,
  isAccountantBillingRestricted,
} from "@/lib/accountant/billing-state";
import {
  OFFICE_CLIENT_PAGE_SIZE,
  isOfficeClientStatusFilter,
  normalizeOfficeClientCreate,
  type OfficeClientStatusFilter,
} from "@/lib/accountant/clients";
import { logger } from "@/lib/logger";

interface DbError {
  message: string;
}

interface OfficeClientRow {
  id: string;
  office_id?: string;
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
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery<T>;
  range(from: number, to: number): Promise<QueryResult<T>>;
}

interface SupabaseMutationQuery<T> extends SupabaseQuery<T> {
  select(columns: string): SupabaseMutationQuery<T>;
  single(): Promise<QueryResult<T>>;
}

interface OfficeClientsTable {
  select<T = OfficeClientRow[]>(
    columns: string,
    options?: { count?: "exact"; head?: boolean },
  ): SupabaseQuery<T>;
  insert(
    payload: Record<string, unknown>,
  ): SupabaseMutationQuery<OfficeClientRow>;
}

function getOfficeClientsTable() {
  return createAdminClient().from(
    "office_clients",
  ) as unknown as OfficeClientsTable;
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

function toPositivePage(value: string | null) {
  const page = Number(value ?? "1");
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

function applyStatusFilter<T>(
  query: SupabaseQuery<T>,
  status: OfficeClientStatusFilter,
) {
  if (status === "active") return query.eq("ativo", true);
  if (status === "inactive") return query.eq("ativo", false);
  if (status === "manual") return query.eq("inactive_reason", "manual");
  if (status === "plan_limit") return query.eq("inactive_reason", "plan_limit");
  return query;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOffice();
    if (!auth.ok) return auth.response;

    const statusParam = request.nextUrl.searchParams.get("status") ?? "all";
    if (!isOfficeClientStatusFilter(statusParam)) {
      return NextResponse.json(
        { error: "Filtro de status inválido." },
        { status: 400 },
      );
    }

    const page = toPositivePage(request.nextUrl.searchParams.get("page"));
    const pageSize = OFFICE_CLIENT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    if (isAdminAccessFallbackOffice(auth.office)) {
      return NextResponse.json({
        ok: true,
        clients: [],
        pagination: { page, pageSize, total: 0 },
      });
    }

    const table = getOfficeClientsTable();
    const query = applyStatusFilter(
      table
        .select(
          "id, name, email, cnae, tipo_mei, uf, municipio, ativo, inactive_reason, created_at, updated_at",
          { count: "exact" },
        )
        .eq("office_id", auth.office.id),
      statusParam,
    );

    const { data, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) {
      logger.error("api.accountant.clients.list", "Erro ao listar clientes", {
        message: error.message,
      });
      return NextResponse.json(
        { error: "Não foi possível listar os clientes." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      clients: data ?? [],
      pagination: { page, pageSize, total: count ?? 0 },
    });
  } catch (error) {
    logger.error(
      "api.accountant.clients.get.catch",
      "Erro interno ao listar clientes",
      { error },
    );
    return NextResponse.json(
      { error: "Erro interno ao listar clientes." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedOffice();
    if (!auth.ok) return auth.response;

    if (isAdminAccessFallbackOffice(auth.office)) {
      return NextResponse.json(
        {
          error:
            "Configure SUPABASE_SERVICE_ROLE_KEY para cadastrar clientes reais no modo contador.",
        },
        { status: 503 },
      );
    }

    const billing = getAccountantBillingState(auth.office);
    if (isAccountantBillingRestricted(billing)) {
      return NextResponse.json(
        {
          error: getAccountantBillingRestrictionMessage("create_client"),
          billing,
        },
        { status: 402 },
      );
    }

    const body = await request.json();
    const parsed = normalizeOfficeClientCreate(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const table = getOfficeClientsTable();
    const activeCountResult = await table
      .select<null>("id", { count: "exact", head: true })
      .eq("office_id", auth.office.id)
      .eq("ativo", true);

    if (activeCountResult.error) {
      logger.error("api.accountant.clients.count", "Erro ao contar clientes", {
        message: activeCountResult.error.message,
      });
      return NextResponse.json(
        { error: "Não foi possível validar o limite do plano." },
        { status: 500 },
      );
    }

    const activeCount = activeCountResult.count ?? 0;
    if (activeCount >= auth.office.max_clients) {
      return NextResponse.json(
        {
          error: `Limite de ${auth.office.max_clients} clientes ativos atingido para o plano atual.`,
        },
        { status: 409 },
      );
    }

    const input = parsed.value;
    const insertResult = await table
      .insert({
        office_id: auth.office.id,
        name: input.nome,
        email: input.email,
        cnae: input.cnae,
        tipo_mei: input.tipoMei,
        uf: input.uf,
        municipio: input.municipio,
        observacoes: input.observacoes,
        ativo: true,
        inactive_reason: null,
        disabled_by_plan_limit_at: null,
      })
      .select(
        "id, name, email, cnae, tipo_mei, uf, municipio, ativo, inactive_reason, created_at, updated_at",
      )
      .single();

    if (insertResult.error || !insertResult.data) {
      logger.error("api.accountant.clients.insert", "Erro ao inserir cliente", {
        message: insertResult.error?.message,
      });
      return NextResponse.json(
        { error: "Não foi possível cadastrar o cliente." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, client: insertResult.data });
  } catch (error) {
    logger.error(
      "api.accountant.clients.post.catch",
      "Erro interno ao cadastrar cliente",
      { error },
    );
    return NextResponse.json(
      { error: "Erro interno ao cadastrar cliente." },
      { status: 500 },
    );
  }
}
