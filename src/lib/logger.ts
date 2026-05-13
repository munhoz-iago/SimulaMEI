/**
 * Logger estruturado para API routes.
 *
 * Em produção: emite JSON sem incluir valores raw de erros internos,
 * evitando vazamento de mensagens de banco ou stack traces em logs.
 *
 * Em desenvolvimento: passa direto para console com todos os detalhes.
 */

const isProd = process.env.NODE_ENV === "production";

function sanitize(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  return "internal_error";
}

export const logger = {
  error(context: string, description: string, detail?: unknown): void {
    if (isProd) {
      process.stdout.write(
        JSON.stringify({
          level: "error",
          ctx: context,
          msg: description,
          ts: Date.now(),
        }) + "\n",
      );
    } else {
      console.error(`[${context}] ${description}`, detail ?? "");
    }
  },

  warn(context: string, description: string, detail?: unknown): void {
    if (isProd) {
      process.stdout.write(
        JSON.stringify({
          level: "warn",
          ctx: context,
          msg: description,
          ts: Date.now(),
        }) + "\n",
      );
    } else {
      console.warn(`[${context}] ${description}`, detail ?? "");
    }
  },

  info(context: string, description: string, detail?: unknown): void {
    if (isProd) {
      process.stdout.write(
        JSON.stringify({
          level: "info",
          ctx: context,
          msg: description,
          ts: Date.now(),
        }) + "\n",
      );
    } else {
      console.info(`[${context}] ${description}`, detail ?? "");
    }
  },
};
