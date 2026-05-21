import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccountantOffice } from "@/lib/accountant/server";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

interface DbError {
  message: string;
}

interface QueryResult<T> {
  data: T;
  error: DbError | null;
}

interface ResolveAlertQuery<T> {
  eq(column: string, value: unknown): ResolveAlertQuery<T>;
  is(column: string, value: unknown): ResolveAlertQuery<T>;
  select(columns: string): ResolveAlertQuery<T>;
  single(): Promise<QueryResult<T>>;
}

interface OfficeAlertsTable {
  update(
    payload: Record<string, unknown>,
  ): ResolveAlertQuery<Record<string, unknown>>;
}

async function getAlertId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function PATCH(_request: Request, context: RouteContext) {
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

  const { office, error } = await getCurrentAccountantOffice(
    supabase,
    user.id,
    user.email,
  );
  if (error) {
    logger.error(
      "api.accountant.alerts.resolve.office",
      "Erro ao carregar escritório",
      { error },
    );
    return NextResponse.json(
      { error: "Não foi possível carregar o escritório." },
      { status: 500 },
    );
  }

  if (!office) {
    return NextResponse.json(
      { error: "Escritório contador não configurado." },
      { status: 403 },
    );
  }

  const alertId = await getAlertId(context);
  const table = createAdminClient().from(
    "office_alerts",
  ) as unknown as OfficeAlertsTable;
  const result = await table
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", alertId)
    .eq("office_id", office.id)
    .is("resolved_at", null)
    .select("id, office_id, resolved_by, resolved_at")
    .single();

  if (result.error || !result.data) {
    logger.error(
      "api.accountant.alerts.resolve.update",
      "Erro ao resolver alerta",
      { message: result.error?.message },
    );
    return NextResponse.json(
      { error: "Não foi possível resolver o alerta." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, alert: result.data });
}
