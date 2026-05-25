# Export de leads admin-only + CSV-safe — design

**Data:** 2026-05-25 · **Status:** pronto para CLI executar · **Tipo:** P0 data exfiltration + injection
**Origem:** Admin Review 2026-05-25, Critical #1 + Important "csv-injection"

## 1. Objetivo

Tapar dois buracos cumulativos:

1. **Acesso indevido:** `GET /api/leads/export` usa `canAccessAdminLeads` que retorna `true` para `admin` E `contador`. Combinado com `createAdminClient()` bypassing RLS, qualquer `contador` baixa o pipeline inteiro de leads (até 1000 rows com emails, telefones).
2. **CSV injection:** células do XLSX exportadas direto sem sanitização. `nome_escritorio = "=cmd|' /C calc'!A0"` planta fórmula que executa quando admin abre o file em Excel/Google Sheets.

## 2. Estado atual (verificado)

### `src/app/api/leads/export/route.ts:25-60`

```ts
export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // BUG #1: canAccessAdminLeads retorna true pra admin OU contador
  const profile = await getProfileAccess(supabase, user)
  if (!canAccessAdminLeads(profile.profile, user)) {
    return new Response('Forbidden', { status: 403 })
  }

  // BUG #2: usa admin client, bypassa RLS
  const admin = createAdminClient()
  const { data: leads } = await admin
    .from('accountant_leads')
    .select('nome_escritorio, email, telefone, ferramenta_atual, status, created_at')
    .limit(1000)

  // BUG #3: cell values vão direto, sem sanitização
  const worksheet = workbook.addWorksheet('Leads')
  worksheet.columns = [
    { header: 'Escritório', key: 'nome_escritorio' },
    { header: 'Email', key: 'email' },
    { header: 'Telefone', key: 'telefone' },
    { header: 'Ferramenta atual', key: 'ferramenta_atual' },
    { header: 'Status', key: 'status' },
    { header: 'Criado em', key: 'created_at' },
  ]
  worksheet.addRows(leads ?? [])  // ← sem sanitização

  const buffer = await workbook.xlsx.writeBuffer()
  return new Response(buffer, { ... })
}
```

### `src/lib/auth/profile-access.ts` (verificado)

```ts
export function canAccessAdminLeads(profile, user) {
  return profile?.role === 'admin' || profile?.role === 'contador' || isAdminEmail(user.email)
}
```

### `src/app/api/accountant-leads/route.ts:48` (input source)

Form público anônimo. Submitter envia `nomeEscritorio`, `email`, `telefone`, `ferramentaAtual`. Validação atual: só comprimento (Zod). Não há sanitização contra fórmulas.

## 3. Decisões (fechadas)

- **Trocar gate** de `canAccessAdminLeads` para `isAdminEmail(user.email)` (gate único admin-only). Contador NÃO deve acessar export.
- **Stop usar admin client** no export — usar `createClient()` (SSR client) com RLS estrita. Migration 010 RLS exige `role === 'admin'` pra SELECT — depois do fix #5 do admin review, essa policy só deixa admin ler.
- **Sanitizar cell values contra CSV injection.** Helper puro `sanitizeXlsxCell(value: string)` que prefixa com single quote se começa com `=`, `+`, `-`, `@`, tab, CR. Aplicar em TODA célula do XLSX.
- **Adicionar rate limit** ao endpoint (admin pode estar comprometido). Ex: 10 exports/hora por user.id.
- **Manter limit de 1000 rows** — defense in depth.

## 4. Workstreams

**P0:**
- W1: Trocar gate para `isAdminEmail` estrito
- W2: Trocar `createAdminClient()` por `createClient()`
- W3: Helper puro `sanitizeXlsxCell` + sanitização das células
- W4: Rate limit no endpoint
- W5: Tests cobrindo: contador → 403; admin → 200; CSV injection → célula prefixada

## 5. Detalhes

### W1 + W2 — Endpoint refatorado

```ts
import { isAdminEmail } from '@/lib/auth/admin-access'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Gate único admin-only
  if (!isAdminEmail(user.email)) {
    return new Response('Forbidden', { status: 403 })
  }

  // Rate limit por user
  const rl = await consumeRateLimit({
    namespace: 'leads_export',
    subjectHash: user.id,
    limit: 10,
    windowSeconds: 3600,
  })
  if (!rl.allowed) {
    return new Response('Rate limit exceeded', { status: 429 })
  }

  // RLS-enforced read (admin tem permissão via policy de migration 010)
  const { data: leads, error } = await supabase
    .from('accountant_leads')
    .select('nome_escritorio, email, telefone, ferramenta_atual, status, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    console.error('[leads/export] read error', { error: error.message })
    return new Response('Read failed', { status: 500 })
  }

  // Sanitiza TODA cell antes de adicionar
  const safeRows = (leads ?? []).map(row => ({
    nome_escritorio: sanitizeXlsxCell(row.nome_escritorio ?? ''),
    email: sanitizeXlsxCell(row.email ?? ''),
    telefone: sanitizeXlsxCell(row.telefone ?? ''),
    ferramenta_atual: sanitizeXlsxCell(row.ferramenta_atual ?? ''),
    status: sanitizeXlsxCell(row.status ?? ''),
    created_at: row.created_at,  // ISO date — safe
  }))

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Leads')
  worksheet.columns = [...]
  worksheet.addRows(safeRows)

  const buffer = await workbook.xlsx.writeBuffer()
  return new Response(buffer, { ... })
}
```

### W3 — `sanitizeXlsxCell` helper

`src/lib/security/xlsx-injection.ts` (novo):

```ts
/**
 * Sanitiza cell value contra Excel/Google Sheets formula injection.
 *
 * Excel interpreta strings começando com `=`, `+`, `-`, `@`, tab (`\t`) ou
 * carriage return (`\r`) como fórmulas executáveis. Atacante que submete
 * `=cmd|' /C calc'!A0` em campo de texto exfiltra dados ou executa código
 * no Excel da vítima quando ela abre o file.
 *
 * Mitigação OWASP: prefixar com single quote (`'`) que Excel interpreta
 * como "literal text", não fórmula.
 *
 * Ref: https://owasp.org/www-community/attacks/CSV_Injection
 */
export function sanitizeXlsxCell(value: string): string {
  if (!value) return value
  const first = value.charAt(0)
  if (first === '=' || first === '+' || first === '-' || first === '@' || first === '\t' || first === '\r') {
    return `'${value}`
  }
  return value
}
```

Tests `xlsx-injection.test.ts`:

```ts
describe('sanitizeXlsxCell', () => {
  it('passes safe strings unchanged', () => {
    expect(sanitizeXlsxCell('Joao Silva')).toBe('Joao Silva')
    expect(sanitizeXlsxCell('joao@empresa.com')).toBe('joao@empresa.com')  // @ no meio é OK
    expect(sanitizeXlsxCell('(11) 99999-9999')).toBe('(11) 99999-9999')
  })

  it('prefixes formula starts with single quote', () => {
    expect(sanitizeXlsxCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
    expect(sanitizeXlsxCell('=cmd|...')).toBe("'=cmd|...")
    expect(sanitizeXlsxCell('+1234567890')).toBe("'+1234567890")
    expect(sanitizeXlsxCell('-FALSE')).toBe("'-FALSE")
    expect(sanitizeXlsxCell('@formula')).toBe("'@formula")
    expect(sanitizeXlsxCell('\tabtext')).toBe("'\tabtext")
    expect(sanitizeXlsxCell('\rcrtext')).toBe("'\rcrtext")
  })

  it('handles empty/null gracefully', () => {
    expect(sanitizeXlsxCell('')).toBe('')
  })
})
```

### W4 — Rate limit

`src/lib/security/rate-limit.ts` já tem `consumeRateLimit`. Apenas usar com novo namespace `leads_export`.

### W5 — Endpoint tests

`src/app/api/leads/export/route.test.ts`:

```ts
describe('GET /api/leads/export', () => {
  it('contador role → 403', async () => {
    mockUser({ role: 'contador' })
    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it('user comum → 403', async () => {
    mockUser({ role: 'user' })
    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it('admin email → 200 + XLSX', async () => {
    mockUser({ email: 'admin@simulamei.com.br' })
    mockLeads([{ nome_escritorio: 'Test', email: 'a@b.c', ... }])
    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('spreadsheet')
  })

  it('lead com formula injection → cell prefixada', async () => {
    mockUser({ email: 'admin@simulamei.com.br' })
    mockLeads([{
      nome_escritorio: '=SUM(A1:A10)',
      email: 'safe@email.com',
      ...
    }])
    const response = await GET(request)
    const buffer = await response.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const cell = workbook.worksheets[0].getRow(2).getCell(1)
    expect(cell.value).toBe("'=SUM(A1:A10)")  // sanitizada
  })

  it('11 calls in 1h → última retorna 429', async () => {
    mockUser({ email: 'admin@simulamei.com.br' })
    for (let i = 0; i < 10; i++) await GET(request)
    const response = await GET(request)
    expect(response.status).toBe(429)
  })
})
```

## 6. Sucesso

- [ ] Contador autenticado → 403 (não consegue baixar)
- [ ] User comum → 403
- [ ] Admin → 200 com XLSX válido
- [ ] Campo de lead com fórmula → célula prefixada com `'` no XLSX
- [ ] 11ª request em 1h → 429
- [ ] `npx tsc --noEmit` limpo
- [ ] Suite verde (5 testes novos)
- [ ] Manual: abrir XLSX em Excel real, confirmar que fórmula NÃO executa (aparece como texto literal)

## 7. Não-objetivos

- ❌ Fix do `accountant_leads.contador_id` half-implemented em migration 010 — Critical #10/admin #6, spec separado
- ❌ Refatorar `canAccessAdminLeads` helper inteiro — escopo deste spec é o export. Helper continua existindo (usado em middleware), mas export NÃO usa mais.
- ❌ Migration retroativa de leads existentes — sanitização é só no export, não no DB. Aceitar: leads antigos estão no DB e admin os vê via UI (`/admin/leads`) — UI React escapa automaticamente.
- ❌ Sanitização do `LeadStatusSelect` na UI admin — não é XLSX, é HTML, React escapa.

## 8. Riscos

- **`isAdminEmail` mal-configurado** — se `ADMIN_EMAILS` env var estiver vazia ou errada, ninguém acessa export. Aceitar — admin manual via Supabase SQL é fallback.
- **Sanitização quebra dados legítimos** — se algum lead REAL tem campo começando com `=` (improvável em nome de escritório), aparece com `'` extra no XLSX. Trade-off aceitável vs RCE no Excel.
- **`consumeRateLimit` fail-open** (Important #5 do security review) — em caso de Supabase down, rate limit aceita tudo. Aceitar — rotação de admin é evento raro.
- **Múltiplos admins compartilhando rate limit** — namespace é `subjectHash: user.id`, então cada admin tem seu próprio bucket. OK.

## 9. Estimativa

- W1+W2 endpoint refactor: 30min
- W3 helper + tests: 1h
- W4 rate limit: 15min
- W5 endpoint tests: 1h
- Total: ~2.5h de subagent + review

---

*Arquivos tocados:*
- `src/app/api/leads/export/route.ts` (refactor)
- `src/app/api/leads/export/route.test.ts` (5 testes novos)
- `src/lib/security/xlsx-injection.ts` (novo)
- `src/lib/security/xlsx-injection.test.ts` (novo)
