# Análise de Segurança - SimulaMEI
**Data:** 2026-05-08  
**Auditor:** Análise automatizada + revisão manual  
**Escopo:** API endpoints, autenticação, autorização, validação de dados, RLS, headers

---

## Resumo Executivo

| Categoria | Status |
|-----------|--------|
| **Autenticação** | 🟡 Bom (com ressalvas) |
| **Autorização** | 🟡 Parcial (RLS ausente em algumas tabelas) |
| **Validação de Input** | 🔴 Fraco (falta validação strict em muitos endpoints) |
| **Rate Limiting** | 🟢 Bom (implementado em endpoints públicos) |
| **Proteção de Dados** | 🟡 Regular (hash de dados sensíveis) |
| **Logging** | 🔴 Fraco (console.error em produção) |
| **Headers de Segurança** | 🟡 Bom (CSP presente, mas style-src 'unsafe-inline') |

---

## 🔴 Crítico - Requer Ação Imediata

### 1. Validação de Input Inconsistente (CRÍTICO)

**Problema:** Múltiplos endpoints aceitam JSON arbitrário sem schema validation strict.

**Endpoints afetados:**
- `POST /api/accountant/clients` - valida apenas campos obrigatórios
- `POST /api/onboarding` - aceita objetos aninhados sem validação
- `POST /api/monthly-inputs` - sem validação de ranges
- `POST /api/account/delete` - payload não validado

**Exemplo de vulnerabilidade:**
```typescript
// route.ts atual - sem proteção contra extra keys
const body = await request.json()  // Aceita qualquer objeto
const parsed = normalizeOfficeClientCreate(body)  // Ignora campos extras
```

**Ataque possível:**
- Injeção de campos maliciosos em JSON (prototype pollution se não houver sanitização)
- Mass assignment se objetos forem salvos diretamente no banco
- Payloads gigantes causando DoS (falta limitação de tamanho)

**Correção recomendada:**
```typescript
import { z } from 'zod'

const ClientCreateSchema = z.object({
  nome: z.string().min(1).max(160),
  email: z.string().email().max(254).nullable(),
  cnae: z.string().regex(/^\d{4}-\d\/\d{2}$/),
  tipoMei: z.enum(['geral', 'caminhoneiro']),
  // ... strict validation
}).strict()  // Rejeita chaves extras

// Uso
const parsed = ClientCreateSchema.safeParse(body)
if (!parsed.success) return 400
```

---

### 2. Console Logs em Produção (CRÍTICO)

**Problema:** 71 ocorrências de `console.error/log` espalhadas pelo código de API.

**Riscos:**
- Vazamento de dados sensíveis em logs (tokens, emails, dados fiscais)
- Dificuldade de monitoramento (logs não estruturados)
- Possível exposição de stack traces em produção

**Exemplo crítico:**
```typescript
// /api/contadores/simulate/route.ts:70
console.error('[/api/contadores/simulate] api key query error:', apiKeyError.message)
// Pode vazar estrutura interna do banco
```

**Correção:**
- Substituir por logger estruturado (Winston, Pino)
- Nível de log configurável por ambiente
- Sanitização automática de PII em logs

---

### 3. RLS Ausente em Tabelas Críticas (CRÍTICO)

**Tabelas sem Row Level Security verificado:**

| Tabela | RLS | Políticas | Risco |
|--------|-----|-----------|-------|
| `simulation_history` | ✅ Enable | ✅ User own | 🟢 Seguro |
| `office_clients` | ✅ Enable | ✅ Office-based | 🟢 Seguro |
| `office_simulations` | ✅ Enable | ✅ Office-based | 🟢 Seguro |
| `api_keys` | ❓ | ❓ | 🟡 Verificar |
| `leads` | ❓ | ❓ | 🟡 Possível problema |

**Verificação necessária:**
```sql
-- Verificar se todas as tabelas com dados sensíveis têm RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN ('migrations', 'schema_migrations');
```

---

## 🟡 Médio - Melhorias Necessárias

### 4. Content Security Policy (MÉDIO)

**Problema atual:**
```typescript
// csp.ts
"style-src 'self' 'unsafe-inline'",  // Permite inline styles (XSS via style)
"script-src 'self' 'nonce-${nonce}' ..."  // Nonce presente (bom)
```

**Risco:** `unsafe-inline` em style-src permite ataques de CSS injection, embora menos crítico que XSS JavaScript.

**Correção:**
- Gerar hashes para styles inline específicos
- Ou usar nonce para styles também (mais complexo)
- Separar CSP para ambiente de dev (sem nonces) vs prod

---

### 5. Rate Limiting Parcial (MÉDIO)

**Problema:** Nem todos os endpoints têm rate limiting.

**Cobertura atual:**
- ✅ `/api/leads` - IP-based, 5 req/min
- ✅ `/api/contadores/simulate` - via quota RPC
- ❓ `/api/simular` - endpoint público principal - VERIFICAR
- ❓ `/api/accountant/clients` - autenticado mas sem RL por usuário
- ❌ `/api/diagnostico` - sem rate limiting (usa AI)

**Risco:** Endpoints de AI (diagnóstico) podem ser abusados para consumir créditos ou causar custos elevados.

**Correção:**
```typescript
// Adicionar rate limiting em todos os endpoints públicos
const rateLimit = await consumeRateLimit({
  namespace: 'diagnostico',
  subjectHash: user?.id ?? ipHash,
  limit: 10,  // 10 diagnósticos por hora
  windowSeconds: 3600,
})
```

---

### 6. Validação de Email Fraca (MÉDIO)

**Problema:** Regex simples para validação de email.

```typescript
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

**Limitações:**
- Aceita emails inválidos como `a@b.c`
- Não verifica se domínio existe
- Não normaliza Unicode (homograph attack possível)

**Correção:**
```typescript
import { z } from 'zod'

const EmailSchema = z.string()
  .email()
  .max(254)
  .transform(s => s.toLowerCase().trim())
  .refine(s => !s.includes('..'), 'Email inválido')
```

---

### 7. Headers de Segurança Ausentes (MÉDIO)

**Verificar em next.config.ts:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (frame-ancestors no CSP ajuda, mas header legado é bom)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (para desabilitar features não usadas)

---

## 🟢 Bom - Mantenha

### 8. Autenticação via Supabase SSR (🟢 BOM)

**Pontos fortes:**
- Uso de `@supabase/ssr` com cookies seguros
- Tokens JWT com expiração
- Refresh automático de sessão no middleware

```typescript
// middleware.ts - correto
const { data: { user } } = await supabase.auth.getUser()
```

---

### 9. Hash de API Keys (🟢 BOM)

**Implementação correta:**
```typescript
function hashApiKey(key: string, secret: string) {
  return createHmac('sha256', secret).update(key).digest('hex')
}
```

- Chaves nunca armazenadas em texto plano
- HMAC-SHA256 com secret de ambiente
- Timing-safe comparison implícito na busca por hash

---

### 10. Rate Limit Fail-Open (🟢 BOM)

```typescript
if (error || !row) {
  // Fail open: se o Supabase estiver indisponivel, nao derruba a API
  console.error('[rate-limit] Supabase unavailable, failing open:', ...)
  return { allowed: true, ... }
}
```

**Correto:** Quando o sistema de rate limit falha, a API continua funcionando (disponibilidade > proteção em caso de falha).

---

### 11. Proteção contra IDOR (🟢 BOM)

Em `/api/accountant/clients/[id]/route.ts`, verificação de ownership:
```typescript
// Verifica se cliente pertence ao escritório do usuário
const { data, error } = await table
  .select(...)
  .eq('id', id)
  .eq('office_id', auth.office.id)  // <-- Proteção contra IDOR
  .single()
```

---

## 🔧 Recomendações de Correção

### Prioridade 1 (Semana 1)

1. **Adicionar Zod validation em todos os endpoints POST**
   - Criar schemas em `/lib/schemas/` 
   - Migrar endpoints um por um
   - Adicionar testes para validação

2. **Implementar logger estruturado**
   - Substituir todos os `console.*` por `logger.info/error`
   - Sanitizar PII automaticamente
   - Configurar exportação para serviço de logs (Datadog, etc)

3. **Verificar e completar RLS**
   - Auditar todas as tabelas
   - Documentar políticas no schema SQL

### Prioridade 2 (Semana 2-3)

4. **Melhorar CSP**
   - Remover `unsafe-inline` de style-src
   - Implementar nonce ou hash

5. **Expandir rate limiting**
   - Cobrir todos os endpoints públicos
   - Adicionar rate limiting por usuário em endpoints autenticados
   - Alertar quando rate limit é atingido repetidamente (possível ataque)

6. **Adicionar headers de segurança**
   - Configurar em `next.config.ts`

### Prioridade 3 (Mês 2)

7. **Implementar WAF ou proteção adicional**
   - Considerar Cloudflare ou similar
   - Proteção contra DDoS

8. **Auditoria de dependências**
   - `npm audit` regular
   - Dependabot para atualizações automáticas

9. **Testes de segurança automatizados**
   - Adicionar testes de fuzzing para endpoints
   - Testar políticas RLS

---

## Checklist de Validação

```bash
# Antes de cada release, verificar:

# 1. Nenhum console.log/error em API routes
grep -r "console\." src/app/api/ --include="*.ts" | grep -v ".test.ts"

# 2. Todas as tabelas têm RLS
psql $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"

# 3. Nenhum dado sensível em logs
# (Requer revisão manual dos últimos logs)

# 4. Rate limiting em endpoints públicos
# (Testar com hey ou autocannon)

# 5. Validação Zod em todos os POSTs
grep -r "await.*\.json()" src/app/api/ --include="*.ts" | grep -v "\.test.ts"
# Verificar se cada um tem schema Zod após
```

---

## Conclusão

O sistema tem **base de segurança sólida** (autenticação, hash, RLS básico), mas precisa de **melhorias urgentes** em:

1. **Validação strict de input** - maior risco atual
2. **Logging seguro** - potencial vazamento de dados
3. **Cobertura completa de rate limiting**

**Score geral:** 6.5/10  
**Risco de comprometimento:** Médio (sem exploração fácil, mas superfície de ataque ampla)  
**Tempo estimado para correções críticas:** 2-3 semanas

---

**Próxima revisão:** 2026-06-08 (mensal)
