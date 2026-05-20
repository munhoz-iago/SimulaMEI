# Auth deep-link → /dashboard/relatorio — design (complementar)

**Data:** 2026-05-20 · **Status:** design aprovado (auditoria + análise de código) · **Complementar a:** `2026-05-20-auth-deeplink-simulator-design.md` (`b06845e`)

## 1. Objetivo

Fechar a perda de intent específica do **relatório autenticado**: o gate funciona, mas o restante do fluxo (atualizar-senha hardcode, autocomplete ausente, banner de cookie em tela transacional, preview específico de relatório) ainda vaza conversão. Este spec é estritamente **aditivo** ao `auth-deeplink-simulator-design` — não duplica nada que já está lá.

## 2. Já coberto em outro spec (não tocar de novo)

| Item da auditoria | Onde já está endereçado |
|---|---|
| `next` em registro | `auth-deeplink-simulator` W2 |
| Copy "Entrar para acessar seu relatório" no login | `auth-deeplink-simulator` W3 (`getLoginIntroCopy` já tem o ramo `/dashboard/relatorio` e `/relatorio`) |
| Cursor customizado em `/auth/*` | `auth-deeplink-simulator` W4 (`CustomCursorGate`) |
| Card de preview no login com `next` | `auth-deeplink-simulator` W5 (cobre `/dashboard/simular`, `/dashboard/relatorio`, `/relatorio`) |
| Link "Criar conta grátis" preservando `next` | `auth-deeplink-simulator` W1 |
| Copy context-aware do registro | `auth-deeplink-simulator` W6 |

CLI executando este spec **presume** que o `auth-deeplink-simulator` já foi aplicado (ou que será aplicado antes). Caso contrário, este spec ainda funciona, mas a copy/preview ficarão genéricos.

## 3. Estado atual (somente itens novos — verificado por leitura)

**`/auth/recuperar` (`src/app/auth/recuperar/page.tsx`):**
- ❌ Sem `next` em nenhum ponto. `:21-23` `resetPasswordForEmail` com `redirectTo: '${origin}/auth/atualizar-senha'` hardcoded; `:37` `<Link href="/auth/login">Voltar para entrar"` sem propagar.
- ❌ `:57-65` input email sem `autocomplete`.

**`/auth/atualizar-senha` (`src/app/auth/atualizar-senha/page.tsx`):**
- ✓ Já é `useSearchParams`-aware (`:13`); lê `code` do Supabase.
- ❌ `:63` `router.replace('/dashboard')` hardcoded pós-sucesso — ignora `next`.
- ❌ `:124` `<Link href="/dashboard">Ir para o painel</Link>` (fallback) também hardcoded.
- ❌ `:103` `<Link href="/auth/login">Voltar para entrar"` sem propagar `next`.
- ❌ `:143-152` e `:159-168` inputs de senha sem `autocomplete="new-password"`.

**Autocomplete ausente nos demais (verificado):**
- `auth/login/page.tsx:137-143` email sem `autocomplete="email"`; `:155-163` senha sem `autocomplete="current-password"`.
- `auth/registro/page.tsx`: email sem `autocomplete="email"`; senha sem `autocomplete="new-password"`; confirmação sem `autocomplete="new-password"`.

**CookieBanner (`src/components/providers/CookieBanner.tsx`):**
- Posição fixa global; `:60-77` `position: fixed; left:16; right:16; bottom:16` ocupa faixa cheia em mobile. Em telas transacionais (`/auth/*`, `/onboarding/*`) empurra a percepção de "página pesada" no momento errado. Não há gate por rota.

**`/dashboard/relatorio` (já investigado em sessões anteriores):**
- Tem `hasAccess` (agora `hasReportAccess` após dedup da Task 3 do PDF redesign) — gate funciona. Não é alvo deste spec; o vazamento é antes da rota, no caminho `relatorio → login → registro → de volta`.

## 4. Decisões (fechadas)

- **Não criar tela intermediária dedicada** ("seu relatório está pronto, entre para salvar/exportar"). Em vez disso, **enriquecer o card de preview no login** (W5 do auth-deeplink) com conteúdo específico de relatório — mantém a superfície de auth simples, evita rota nova, e o auditor pediu essencialmente isso.
- **Não criar componente de preview parcial do relatório agora** (1-2 cards do PDF antes do login). Isso é P2 trimestral conforme a própria auditoria; depende do redesign do PDF (specs `2026-05-19-relatorio-pdf-redesign` Tasks 4-8) ter ido pra frente. Faz no futuro.
- **`autocomplete` correto em TODOS os inputs de auth.** Padrão fixo: `email`, `current-password` (login), `new-password` (registro e atualização).
- **Banner de cookie suprimido em `/auth/*` e `/onboarding/*`** — mesma estratégia do CursorGate. Foco transacional.
- **`next` propagado ponta a ponta no fluxo de recuperação de senha.** O link enviado por e-mail leva `next` pra `atualizar-senha`, que termina em `next` em vez de `/dashboard` hardcoded.

## 5. Workstreams

### W1 — `autocomplete` em todos os inputs de auth

**Files:**
- `src/app/auth/login/page.tsx` — adicionar `autocomplete="email"` no input email (linha ~137-143), `autocomplete="current-password"` no input senha (linha ~155-163).
- `src/app/auth/registro/page.tsx` — `autocomplete="email"` no email, `autocomplete="new-password"` na senha e na confirmação.
- `src/app/auth/recuperar/page.tsx` — `autocomplete="email"` (linha ~57-65).
- `src/app/auth/atualizar-senha/page.tsx` — `autocomplete="new-password"` nos dois (nova senha e confirmar).

**Aceitação:** browser DevTools mostra `autocomplete="..."` no atributo do input em cada um dos 5 formulários; gerenciador de senhas sugere preenchimento corretamente.

### W2 — `/auth/recuperar` aceita e propaga `next`

**File:** `src/app/auth/recuperar/page.tsx`

Mudanças:
1. Envolver export default em `<Suspense>` (igual ao login). Dentro do componente:
```tsx
import { useSearchParams } from 'next/navigation'
const searchParams = useSearchParams()
const nextParam = searchParams.get('next') ?? '/dashboard'
const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'
```
2. `:21-23` — passar `next` no `redirectTo` do e-mail de recovery:
```tsx
redirectTo: `${window.location.origin}/auth/atualizar-senha?next=${encodeURIComponent(next)}`,
```
3. `:37` — link "Voltar para entrar" preserva `next`:
```tsx
<Link href={next === '/dashboard' ? '/auth/login' : `/auth/login?next=${encodeURIComponent(next)}`} className="auth-link">
  Voltar para entrar
</Link>
```

**Aceitação:** ao chegar em `/auth/recuperar?next=/dashboard/relatorio` e solicitar reset, o e-mail enviado pelo Supabase aponta para `/auth/atualizar-senha?next=/dashboard/relatorio&code=...`.

### W3 — `/auth/atualizar-senha` termina o fluxo em `next`

**File:** `src/app/auth/atualizar-senha/page.tsx`

Mudanças:
1. `:13-14` adicionar leitura validada de `next` (mesmo padrão open-redirect-safe):
```tsx
const nextParam = searchParams.get('next') ?? '/dashboard'
const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'
```
2. `:63` — trocar `router.replace('/dashboard')` por `router.replace(next)`.
3. `:124` — trocar `<Link href="/dashboard">Ir para o painel</Link>` por `<Link href={next}>Ir para {next === '/dashboard' ? 'o painel' : 'seu destino'}</Link>` (label simples sem complicar — alvo é seguir adiante).
4. `:103` — `<Link href="/auth/login">Voltar para entrar</Link>` → preserva `next` com o mesmo padrão de W2.3.

**Aceitação:** ao atualizar a senha vindo de `/auth/atualizar-senha?next=/dashboard/relatorio`, o redirect pós-sucesso vai pra `/dashboard/relatorio` (não `/dashboard`).

### W4 — `CookieBannerGate` (suprime em rotas transacionais)

**Files:**
- Create: `src/components/providers/CookieBannerGate.tsx`
- Modify: o ponto que renderiza `<CookieBanner />` hoje (provavelmente `src/components/providers/PostHogProvider.tsx` ou `src/app/layout.tsx`; localizar por `grep -rn "<CookieBanner" src/`).

```tsx
// src/components/providers/CookieBannerGate.tsx
'use client'
import { usePathname } from 'next/navigation'
import { CookieBanner } from './CookieBanner'

const SUPPRESS = ['/auth', '/onboarding']  // mesmo critério do CustomCursorGate

export function CookieBannerGate() {
  const pathname = usePathname() ?? ''
  if (SUPPRESS.some(p => pathname === p || pathname.startsWith(`${p}/`))) return null
  return <CookieBanner />
}
```

Substituir o ponto onde `<CookieBanner />` é renderizado por `<CookieBannerGate />`. Não tocar `CookieBanner.tsx` — preservar lógica interna intacta.

**Aceitação:** em `/auth/login`, `/auth/registro`, `/auth/recuperar`, `/auth/atualizar-senha`, `/onboarding/*` o banner NÃO aparece (com `analytics_consent` ainda unset). Nas demais rotas, comportamento atual preservado.

### W5 — Enrichment do card de preview no login para relatório

**File:** `src/app/auth/login/page.tsx` (estende, NÃO substitui, o card do W5 do auth-deeplink)

**Pré-requisito:** auth-deeplink W5 já aplicado (card existe quando `next` indica simulador/relatório).

Substituir a copy plana atual do card por conteúdo específico quando `next.startsWith('/dashboard/relatorio') || next === '/relatorio'`:

```tsx
{(next.startsWith('/dashboard/simular') || next.startsWith('/dashboard/relatorio') || next === '/relatorio') && (
  <div style={{
    background: 'rgba(200,241,53,0.06)',
    border: '1px solid rgba(200,241,53,0.18)',
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
    marginBottom: 20,
    fontSize: 13,
    color: 'var(--text2)',
    lineHeight: 1.55,
  }}>
    {next.startsWith('/dashboard/relatorio') || next === '/relatorio' ? (
      <>
        <strong style={{ color: 'var(--text1)', display: 'block', marginBottom: 6 }}>
          Seu relatório fica pronto após o login
        </strong>
        Comparativo dos 4 regimes tributários · score fiscal · PDF para o contador · histórico salvo.
        Sem custo, sem cartão.
      </>
    ) : (
      <>Ao entrar você libera: histórico de simulações, relatório completo dos 4 regimes e alertas mensais. Sem custo, sem cartão.</>
    )}
  </div>
)}
```

**Aceitação:** `/auth/login?next=/dashboard/relatorio` mostra o título destacado + lista de entregáveis específica; outros nexts mantêm o card original do auth-deeplink.

## 6. Ordem de execução e estratégia de não-conflito

**Arquivos COMPARTILHADOS entre os dois specs (auth-deeplink + este):**
- `src/app/auth/login/page.tsx` (este: W1 autocomplete + W5 enrichment; auth-deeplink: W1 next link + W3 copy + W5 card base)
- `src/app/auth/registro/page.tsx` (este: W1 autocomplete; auth-deeplink: W2 next + W6 copy)
- `src/app/layout.tsx` (este: W4 CookieBannerGate; auth-deeplink: W4 CustomCursorGate)

**Arquivos exclusivos deste spec:**
- `src/app/auth/recuperar/page.tsx` (W2)
- `src/app/auth/atualizar-senha/page.tsx` (W3)
- `src/components/providers/CookieBannerGate.tsx` (W4 — novo)
- `src/components/providers/PostHogProvider.tsx` OR ponto onde `<CookieBanner />` é renderizado (W4)

**Estratégia para zero conflito:**

**Opção A (recomendada — sequencial na mesma branch):**
1. CLI executa **`auth-deeplink-simulator` primeiro** (em branch `claude/auth-deeplink`).
2. CLI merge/rebase auth-deeplink no main work branch.
3. CLI executa **este spec** (em branch `claude/auth-deeplink-relatorio` ou direto no main work branch) — adições são puramente incrementais sobre o estado pós-auth-deeplink.

**Opção B (paralelo em branches separadas):**
1. Cada spec em sua própria branch (`claude/auth-deeplink` e `claude/auth-deeplink-relatorio`).
2. Merge resolvido manualmente nos 3 arquivos compartilhados (não é conflito automático complicado — são edits diferentes em pontos diferentes do mesmo arquivo; texto resolvido bem por ferramentas de merge).

Opção A é mais simples e elimina merge resolution. Recomendado.

## 7. Reuso

- Padrão `*Gate.tsx` (gate por rota) é o mesmo do `CustomCursorGate` do auth-deeplink — copy-paste estrutural, troca o componente envelopado.
- Validação open-redirect-safe de `next` é idêntica em todos os pontos: `nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard'`. Já está estabelecida no `login/page.tsx:21`; replicar literalmente em `recuperar`, `atualizar-senha`, `registro` (este último entra via auth-deeplink W2).
- O card de preview reusa o estilo de cards lima do AuthCard — sem CSS novo.

## 8. Testes

**TDD-puras (RED→GREEN) — somente itens novos:**
- Não há helpers puros novos neste spec; tudo é wiring + atributos HTML. Sem unit test novo.

**Não unitável (validação visual + manual do dono):**
- Cookie banner ausente em `/auth/login` (e demais auth/onboarding).
- Autocomplete funcionando no gerenciador de senhas (Chrome, 1Password, etc.).
- Fluxo end-to-end de recovery: usuário clica em "recuperar" vindo de `/dashboard/relatorio` → e-mail chega com link para `atualizar-senha?next=/dashboard/relatorio` → after-update redireciona certo.

**Verificação:**
- `npx tsc --noEmit` sem erro nos arquivos tocados.
- `npx vitest run` verde (sem regressão).

## 9. Arquivos afetados

**Novos:**
- `src/components/providers/CookieBannerGate.tsx`

**Modificados:**
- `src/app/auth/login/page.tsx` — autocomplete (W1) + enrichment do card (W5)
- `src/app/auth/registro/page.tsx` — autocomplete (W1)
- `src/app/auth/recuperar/page.tsx` — next (W2) + autocomplete (W1)
- `src/app/auth/atualizar-senha/page.tsx` — next (W3) + autocomplete (W1)
- ponto que renderiza `<CookieBanner />` — substituir por `<CookieBannerGate />` (W4)

Estimativa: **P** (pequeno; ≤ 1.5h em CLI). Wiring mecânico, atributos HTML, um Gate novo.

## 10. Fora do escopo

- **Tela intermediária dedicada** "seu relatório está pronto, entre para salvar" — substituída pelo enrichment do card (W5).
- **Preview parcial do relatório** (1-2 cards do PDF antes do login) — depende do redesign do PDF Tasks 4-8 ter andado; faz no futuro.
- **Magic link** específico para relatório — P2 trimestral por decisão do auditor.
- **Eventos PostHog** de abandono por etapa (`relatorio → login → registro → retorno`) — sessão de medição aditiva, mesma regra de não-rename do TASK-3 do PDF redesign.
- **Compactar o banner em mobile** (alternativa B do W4) — descartada em favor de suprimir totalmente em rotas transacionais; revisitar se houver pressão de compliance/LGPD pra mostrar.
- **Separar visualmente resultado público × relatório salvo × PDF exportável** na home/landing — copy/positioning, sessão de marketing.
