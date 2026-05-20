# Auth deep-link → /dashboard/simular — design

**Data:** 2026-05-20 · **Status:** design aprovado (auditoria + análise de código)

## 1. Objetivo

Eliminar a perda de destino e a fricção fria no fluxo `link-no-deep-link → /dashboard/simular → login/registro → de volta ao simulador`. **Mudança cirúrgica nos pontos exatos verificados**; sem refactor maior, sem redesign do dashboard. Coexiste sem conflito com o spec `2026-05-20-dashboard-decision-first` (arquivos distintos).

## 2. Estado atual (verificado por leitura do código)

**proxy.ts (middleware) — correto:**
- `src/proxy.ts:47-52` — quando rota protegida e sem user: redireciona pra `/auth/login` setando `searchParams 'next' = \`${pathname}${request.nextUrl.search}\`` (preserva o destino + querystring). Não precisa mudar.
- Listas: `PROTECTED_PATHS` inclui `/dashboard`, `/onboarding`, `/contador`, `/admin`, `/relatorio`, `/api/v1` (linha 6); `AUTH_PATHS` inclui `/auth/login`, `/auth/registro`, `/auth/recuperar` (linha 7).

**Login (`src/app/auth/login/page.tsx`):**
- `:19-21` — lê `next` do query (default `/dashboard`); valida open-redirect (`startsWith('/')` e não `//`). OK.
- `:55` — `router.push(next)` após sucesso. OK.
- `:69` — Google OAuth passa `next` no `redirectTo`. OK.
- ❌ `:115` — copy hardcoded: `"Acesse seu histórico de simulações e relatórios."` Não muda quando o usuário chegou via `next=/dashboard/simular` (deveria dizer "Entre para continuar sua simulação").
- ❌ `:206` — `<Link href="/auth/registro">Criar conta grátis</Link>` **não propaga `next`** → usuário sem conta perde o destino.

**Registro (`src/app/auth/registro/page.tsx`):**
- ❌ `:46` — `emailRedirectTo` com `next=/dashboard` hardcoded.
- ❌ `:51` — `router.push('/dashboard')` hardcoded após signUp com sessão imediata.
- ❌ `:76` — Google OAuth com `next=/dashboard` hardcoded.
- ❌ `:205` — `<Link href="/auth/login">` no rodapé do registro, sem propagar `next`.
- ❌ `:116` — copy `"Salve suas simulações e acesse relatórios completos."` sem variante para deep-link de simulador.

**CustomCursor (`src/components/effects/CustomCursor.tsx`):**
- `:21-103` — componente global renderizado em `src/app/layout.tsx:118`. Auto-desabilita em touch e `prefers-reduced-motion`, **mas não desabilita em rotas transacionais** (`/auth/*`). Em formulário de login pode parecer estado de foco/loading.

**Não é bug, é tensão de posicionamento:** a home (público) declara "100% gratuito, sem cadastro"; `/dashboard/simular` (privado) exige login. Isso está correto no modelo (gated = salva histórico/relatório); falta a copy da landing/auth dizer **o porquê** do gate.

## 3. Decisões (fechadas)

- **Copy do login muda conforme `next`** (context-aware), sem rota nova nem componente novo. Pequena lookup table de mensagens.
- **`next` propagado em TODA navegação inter-auth** (login↔registro), e em TODAS as ramificações do registro (email signup, Google OAuth, emailRedirectTo).
- **CustomCursor desligado em `/auth/*`** via gate em `layout.tsx` (mais robusto que tocar o componente — preserva a lógica interna do cursor intacta).
- **Card "o que vem depois do login"** (preview do benefício) **renderizado quando há `next`** apontando para simulador/relatório; default mantém o copy atual.
- **NÃO removemos a tensão "sem cadastro vs login"** — clarificamos via copy: a home reafirma "sem cadastro pra simular"; o login no deep-link reafirma "salvar histórico requer conta". (Pode ser P1 futuro em paralelo, sem código novo.)

## 4. Workstreams

**P0 — conversão (perda de destino, fricção fria):**
- W1 Propagar `next` no link "Criar conta grátis" do login.
- W2 Aceitar e propagar `next` em todo o fluxo de registro (4 pontos hardcoded).
- W3 Copy do login context-aware com base no `next`.

**P1 — polish e clareza:**
- W4 Desligar CustomCursor em `/auth/*`.
- W5 Card de preview/benefício no login quando `next` indica simulador/relatório.
- W6 Copy do registro context-aware (espelhando W3).

**P2 — fora deste spec (medição/marketing):**
- Eventos PostHog `auth_landed_from_deeplink`, `auth_register_clicked`, `auth_login_completed_with_next` — adicionar de forma aditiva em sessão de medição (alinhado com a regra de TASK-3 do trabalho anterior: aditivo, sem renomes destrutivos).
- Mensagem na home reafirmando "sem cadastro pra simular; conta só para salvar" — copy-only, decidir em sessão de marketing.

## 5. Detalhes por workstream

### W1 — `next` no link de registro (login → registro)
**File:** `src/app/auth/login/page.tsx` (linha ~206)

Mudar:
```tsx
<Link href="/auth/registro">
  Criar conta grátis
</Link>
```
para (usar o `next` já validado no escopo do componente):
```tsx
<Link href={next === '/dashboard' ? '/auth/registro' : `/auth/registro?next=${encodeURIComponent(next)}`}>
  Criar conta grátis
</Link>
```
(condição evita ruído na URL quando next é o default `/dashboard`).

**Aceitação:** click em "Criar conta grátis" com `next=/dashboard/simular` na URL navega para `/auth/registro?next=%2Fdashboard%2Fsimular`.

### W2 — Registro aceita e propaga `next`
**File:** `src/app/auth/registro/page.tsx`

Mudanças:
1. Acima da função, ler+validar `next` do mesmo jeito do login (open-redirect-safe):
```tsx
import { useSearchParams } from 'next/navigation'
// dentro do componente, no topo:
const searchParams = useSearchParams()
const nextParam = searchParams.get('next') ?? '/dashboard'
const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'
```
   (Envolver export default em `<Suspense>` igual ao login — `useSearchParams` exige.)

2. `:46` — substituir `next=/dashboard` por `next=${encodeURIComponent(next)}`.
3. `:51` — `router.push('/dashboard')` → `router.push(next)`.
4. `:76` — Google OAuth `redirectTo`: mesmo padrão de `encodeURIComponent(next)`.
5. `:205` — link de volta ao login:
```tsx
<Link href={next === '/dashboard' ? '/auth/login' : `/auth/login?next=${encodeURIComponent(next)}`}>
  Entrar
</Link>
```

**Aceitação:**
- Chegar em `/auth/registro?next=/dashboard/simular` e completar signup com sessão imediata → redireciona para `/dashboard/simular` (não `/dashboard`).
- Confirmação por e-mail → o link de retorno passa por `/auth/callback?next=/dashboard/simular`.
- "Já tem conta? Entrar" preserva o `next`.
- `next` inválido (`//evil.com`, ausente, etc.) cai no default `/dashboard` (open-redirect-safe).

### W3 — Copy context-aware do login
**Files:**
- `src/lib/auth/messages.ts` — adicionar helper puro testável.
- `src/app/auth/login/page.tsx:113-116` — consumir o helper.

Helper puro (TDD-able):
```ts
// adicionar em src/lib/auth/messages.ts:
export function getLoginIntroCopy(next: string): { title: string; sub: string } {
  if (next.startsWith('/dashboard/simular')) {
    return {
      title: 'Entrar para continuar sua simulação',
      sub: 'Sua simulação fica salva no histórico depois do login. Sem custo, sem cartão.',
    }
  }
  if (next.startsWith('/dashboard/relatorio') || next === '/relatorio') {
    return {
      title: 'Entrar para acessar seu relatório',
      sub: 'O PDF é liberado após o login. Sem custo, sem cartão.',
    }
  }
  if (next.startsWith('/dashboard')) {
    return {
      title: 'Entrar no SimulaMEI',
      sub: 'Acesse seu histórico de simulações e relatórios.',
    }
  }
  return {
    title: 'Entrar',
    sub: 'Acesse seu histórico de simulações e relatórios.',
  }
}
```

Consumo:
```tsx
const intro = getLoginIntroCopy(next)
// ...
<h1 className="auth-title">{intro.title}</h1>
<p className="auth-copy" style={{ marginBottom: 28 }}>{intro.sub}</p>
```

**Aceitação:**
- `/auth/login?next=/dashboard/simular` → título "Entrar para continuar sua simulação".
- `/auth/login?next=/dashboard/relatorio` → título "Entrar para acessar seu relatório".
- `/auth/login` (sem next ou default) → copy atual preservada.

**TDD:** testes de `getLoginIntroCopy` cobrindo os 4 ramos + open-redirect (`//evil.com` cai no default igual ao login).

### W4 — Desligar CustomCursor em `/auth/*`
**File:** `src/app/layout.tsx` (o `<CustomCursor />` na linha ~118)

Não tocar `CustomCursor.tsx` (preservar a lógica de touch/reduced-motion intacta). Em vez disso, mover o `<CustomCursor />` para um wrapper client que conhece o pathname:

Criar `src/components/effects/CustomCursorGate.tsx`:
```tsx
'use client'
import { usePathname } from 'next/navigation'
import { CustomCursor } from './CustomCursor'

const SUPPRESS = ['/auth', '/onboarding']  // rotas transacionais

export function CustomCursorGate() {
  const pathname = usePathname() ?? ''
  if (SUPPRESS.some(p => pathname === p || pathname.startsWith(`${p}/`))) return null
  return <CustomCursor />
}
```

Em `layout.tsx`, trocar `<CustomCursor />` por `<CustomCursorGate />`.

**Aceitação:** em `/auth/login`, `/auth/registro`, `/auth/recuperar`, `/auth/atualizar-senha`, `/onboarding/*` o cursor nativo aparece; nas demais o cursor custom segue ativo.

### W5 — Card de preview de benefício no login (quando há next)
**File:** `src/app/auth/login/page.tsx`

Antes do `<button onClick={handleGoogleLogin}>...`, renderizar um card pequeno quando `next` indicar simulador/relatório:
```tsx
{(next.startsWith('/dashboard/simular') || next.startsWith('/dashboard/relatorio') || next === '/relatorio') && (
  <div style={{
    background: 'rgba(200,241,53,0.06)',
    border: '1px solid rgba(200,241,53,0.18)',
    borderRadius: 'var(--radius)',
    padding: '12px 14px',
    marginBottom: 20,
    fontSize: 13,
    color: 'var(--text2)',
    lineHeight: 1.5,
  }}>
    Ao entrar você libera: histórico de simulações, relatório completo dos 4 regimes e alertas mensais. Sem custo, sem cartão.
  </div>
)}
```

(Não é redesign — é uma linha de contexto entre o título e o CTA do Google.)

**Aceitação:** card aparece em `/auth/login?next=/dashboard/simular`; ausente em `/auth/login` puro.

### W6 — Copy do registro context-aware (espelha W3)
**File:** `src/app/auth/registro/page.tsx:115-118`

Criar helper SEPARADO `getRegisterIntroCopy(next)` em `src/lib/auth/messages.ts` (mesma assinatura `{title, sub}` do `getLoginIntroCopy`). Matriz:
- `next.startsWith('/dashboard/simular')` → `{ title: 'Criar conta grátis para salvar sua simulação', sub: 'Sua próxima simulação fica no histórico. Sem custo, sem cartão.' }`
- `next.startsWith('/dashboard/relatorio')` ou `next === '/relatorio'` → `{ title: 'Criar conta grátis para liberar seu relatório', sub: 'O PDF é liberado após a confirmação do e-mail. Sem custo, sem cartão.' }`
- default → `{ title: 'Criar conta grátis', sub: 'Salve suas simulações e acesse relatórios completos.' }`

Consumir em `registro/page.tsx:115-118` (mesmo padrão do W3). TDD da matriz inteira.

## 6. Não-conflito com outros workstreams

**Arquivos tocados aqui:**
- `src/app/auth/login/page.tsx`
- `src/app/auth/registro/page.tsx`
- `src/lib/auth/messages.ts` (+ `.test.ts`)
- `src/components/effects/CustomCursorGate.tsx` (novo)
- `src/app/layout.tsx` (substituir `<CustomCursor />` por `<CustomCursorGate />`)

**Arquivos do dashboard-decision-first (não tocar aqui):** `src/lib/monitor.ts`, `src/lib/dashboard/kpis.ts`, `src/lib/dashboard/*` (helpers novos), `src/app/dashboard/page.tsx`, componentes do calendário/histórico.

**Arquivos do PDF redesign (não tocar):** `src/constants/pricing.ts`, `src/lib/auth/report-access.ts`, `src/lib/reports/*`, rotas `/api/relatorio*`, `EmailGate.tsx`, `PartialResults/FullResults/TabelaDAS`.

Conclusão: zero overlap de arquivos. CLI pode rodar este, o dashboard-decision-first e o PDF redesign em paralelo (mesma branch ou branches separadas) sem merge conflict.

## 7. Reuso

- `getOAuthErrorMessage`, `getLoginErrorFeedback`, etc. já existem em `src/lib/auth/messages.ts` — o novo `getLoginIntroCopy` segue o padrão (puro, testado, agrupado lá).
- Estilo do card de preview usa as mesmas variáveis CSS do AuthCard (`var(--text2)`, `var(--radius)`, accent lima) — sem CSS novo.
- `Suspense` wrapper já é o padrão do login (`:215-225`) — replicar no registro.

## 8. Testes

**TDD (RED→GREEN, puras):**
- `getLoginIntroCopy(next)` — matriz de 4 ramos + fallback.
- `getRegisterIntroCopy(next)` — matriz equivalente, se separado.

**Não unitável (validação visual + manual do dono):**
- Cursor nativo em `/auth/*` (precisa device real, não emulação).
- Render do card de preview com a copy correta.
- Fluxo end-to-end: home logada-out → `/dashboard/simular` → login com next → de volta ao simulador.

**Verificação final:**
- Suíte vitest verde (sem regressão).
- `npx tsc --noEmit` sem erros nos arquivos tocados.

## 9. Arquivos afetados (estimativa)

**Novos:**
- `src/components/effects/CustomCursorGate.tsx`
- `src/lib/auth/messages.test.ts` (se ainda não existir; senão, append no existente)

**Modificados:**
- `src/app/auth/login/page.tsx`
- `src/app/auth/registro/page.tsx`
- `src/lib/auth/messages.ts`
- `src/app/layout.tsx`

Estimativa: **P** (pequeno; ≤ 2h de execução cuidadosa em CLI).

## 10. Fora do escopo

- Eventos PostHog (W2 acima — fica para sessão de medição, regra aditiva).
- Removover/justificar a tensão "sem cadastro" na home (copy-only, sessão de marketing).
- Não medir abandono `/dashboard/simular` → login → registro aqui (depende de eventos PostHog separados).
- Não alterar `dashboard/simular/page.tsx` (destino funciona quando autenticado).
