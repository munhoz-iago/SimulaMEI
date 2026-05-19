export function buildContentSecurityPolicy(nonce: string) {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://app.posthog.com https://*.posthog.com`,
    // DECISÃO (TASK-12): style-src mantém 'unsafe-inline' deliberadamente.
    // O vetor real de XSS é script-src — já fechado com nonce por requisição.
    // O codebase usa style={{ }} inline de forma pervasiva; remover
    // 'unsafe-inline' aqui exige migrar centenas de estilos p/ classes ou
    // hash/nonce de estilo (refactor grande, alto risco de regressão visual).
    // Não fazer big-bang: migrar estilos inline críticos primeiro, depois
    // endurecer style-src. Risco de segurança residual é baixo (estilo
    // injetado não executa script).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://app.posthog.com https://us.i.posthog.com https://eu.i.posthog.com https://*.posthog.com https://api.anthropic.com",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ]

  return directives.join('; ')
}
