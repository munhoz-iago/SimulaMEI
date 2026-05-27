/**
 * Valida que `next` é path interno seguro pra redirect pós-auth.
 * Rejeita: protocol-relative (//evil), backslash (/\evil), encoded variantes (%5c, %2f%2f),
 *          schemes (javascript:, data:), absolute URLs (http://...), tabs/CR/LF embutidos.
 * Aceita: caminhos começando com `/` seguidos por path normal.
 *
 * Audit P1.2 (2026-05-26): validação anterior (startsWith('/') && !startsWith('//'))
 * aceitava `/\evil.com` porque browsers normalizam `\` → `/`, tornando o destino `//evil.com`
 * (protocol-relative). Também aceitava encoded variantes (%5c, %2f%2f) e schemes não-http.
 */
export function sanitizeNextParam(
  raw: string | null | undefined,
  fallback = '/dashboard',
): string {
  if (!raw) return fallback
  try {
    // 1. Decode pra eliminar %5c, %2f%2f, etc.
    const decoded = decodeURIComponent(raw)
    // 2. Rejeita qualquer caractere suspeito ou control char (backslash, tab, CR, LF)
    if (/[\\\t\r\n]/.test(decoded)) return fallback
    // 3. Deve começar com / seguido por algo que NÃO é / nem \
    if (!/^\/[^/\\]/.test(decoded)) return fallback
    // 4. Rejeita schemes (mesmo após decode) — ex: /javascript:alert(1) ou paths com : no início do segmento
    if (/^[a-z][a-z0-9+.-]*:/i.test(decoded.slice(1))) return fallback
    // 5. Use URL parser pra resolver — se origin ficar diferente do dummy, é externo
    const url = new URL(decoded, 'http://localhost')
    if (url.origin !== 'http://localhost') return fallback
    return decoded
  } catch {
    return fallback
  }
}
