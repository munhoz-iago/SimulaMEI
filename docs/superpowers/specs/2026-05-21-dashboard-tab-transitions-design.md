# Dashboard tab transitions — perceived perf — design

**Data:** 2026-05-21 · **Status:** pronto para CLI · **Tipo:** P1 perceived perf

## 1. Objetivo

Reportado: *"a transição entre essas páginas é lento, sem uma previsualização dos campos que serão apresentados, parece que o sistema é travado"*.

Causa raiz arquitetural: tabs são URL-based (`/dashboard?aba=monitor`, `?aba=fator-r`, etc.). Cada clique dispara navegação Next que re-executa o Server Component inteiro. Sem feedback visual entre o click e a renderização do novo conteúdo. **Parece engasgado.**

Solução cirúrgica (sem refactor arquitetural): `useTransition` no `<DashboardTabs>` + skeleton otimista do conteúdo durante a transição. Fix de feedback, não de performance real — mas resolve a percepção de "travado".

## 2. Estado atual (verificado)

`src/components/dashboard/DashboardTabs.tsx`:
- Renderiza tabs como `<Link href="/dashboard?aba=fator-r">` Next Links
- Cada click → navegação → Server Component re-roda (auth + onboarding + KPIs + queries pesadas)
- Sem `useTransition`, sem skeleton intermediário, sem indicador de loading na tab clicada

`src/app/dashboard/loading.tsx` existe (118 linhas, skeleton) **mas só roda no primeiro mount** — Next App Router não dispara `loading.tsx` em navegação client-side sem `<Suspense>` boundary específico.

`parseDashboardTab` lê `?aba=` do query e default = `'monitor'`.

## 3. Decisões (fechadas)

- **Não refatorar arquitetura** — manter URL-based tabs (linkáveis, SEO-friendly, restoration de estado). Adicionar feedback durante navegação.
- **`useTransition` no `<DashboardTabs>`** — quando user clica, `startTransition(() => router.push(href))` deixa o React saber que é uma navegação não-bloqueante. Durante a transition: `isPending === true` → renderizar indicador.
- **Indicador visual triplo:**
  1. Tab clicada ganha estilo "loading" (opacidade reduzida + ícone spinner inline)
  2. Conteúdo da tab atual fica com `opacity: 0.5` durante transição (pista visual de "trocando")
  3. Skeleton otimista da próxima tab aparece SE a transição passar de 200ms (evita flash em navegações rápidas)
- **Manter `<Link>` semântico** — pra ctrl+click abrir em nova aba continuar funcionando. Apenas interceptar o click event com `useTransition` quando left-click sem modifier.
- **Sem mudança no `loading.tsx`** — ele continua válido pro initial mount.
- **Sem Suspense boundaries adicionais** — overhead arquitetural maior, não destrava o problema reportado.

## 4. Workstreams

**P0:**
- W1: Refactor `<DashboardTabs>` pra usar `useTransition` + `useRouter` + interceptar click (preservando ctrl+click)
- W2: Adicionar prop `isPending` no `<DashboardTabs>` ou expor via callback pro pai renderizar overlay no content
- W3: Wrapper `<DashboardContentArea>` que aplica `opacity: 0.5` quando `isPending`
- W4: Skeleton genérico `<DashboardTabSkeleton>` que aparece após delay de 200ms se `isPending` continuar

**P1:**
- W5: Cada tab pode ter skeleton específico (monitor / fator-r / simulações / agenda / conta) — opcional, pode reutilizar genérico

**Fora deste spec:**
- Migrar pra Parallel Routes (`@monitor`, `@fatorR`) — refactor grande, mais escopo
- Prefetch agressivo de todas as tabs (já é default do Next Link em viewport)
- Server Actions ou Suspense streaming — fora do escopo perceived-fix

## 5. Detalhes

### W1 — `<DashboardTabs>` com `useTransition`

```tsx
'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export function DashboardTabs({ active, onPendingChange }: { active: DashboardTab; onPendingChange?: (pending: boolean) => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Notifica o pai sobre estado de pending (pra aplicar opacity no content)
  useEffect(() => {
    onPendingChange?.(isPending)
  }, [isPending, onPendingChange])

  function handleClick(e: React.MouseEvent, href: string) {
    // Preserva ctrl/cmd+click, middle-click, shift, etc.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <div role="tablist" style={{ ... }}>
      {TABS.map(tab => {
        const href = getDashboardTabHref(tab.id)
        const isActive = tab.id === active
        const isTabPending = isPending && !isActive  // tab clicada (não a ativa) recebe loading

        return (
          <Link
            key={tab.id}
            href={href}
            onClick={e => handleClick(e, href)}
            role="tab"
            aria-selected={isActive}
            data-pending={isTabPending}
            style={{
              ...
              opacity: isTabPending ? 0.5 : 1,
              transition: 'opacity 120ms ease',
            }}
          >
            {tab.label}
            {isTabPending && <span style={{ marginLeft: 6 }}>·</span>}
          </Link>
        )
      })}
    </div>
  )
}
```

### W3 — Wrapper de content area

Em `src/app/dashboard/page.tsx` (Server Component) NÃO podemos chamar `useTransition` direto. Solução:

- Criar componente client `<DashboardTabsClient>` que **wrapeia** o `<DashboardTabs>` + o conteúdo da tab ativa, gerenciando o `isPending` localmente
- OU manter estrutura atual mas mover apenas o `<DashboardTabs>` pra client, e usar CSS `view-transition-name` pra dar feedback visual sem precisar de state compartilhado (Chrome 111+)

Opção mais simples e cross-browser:

`<DashboardTabsClient>` wrapper:
```tsx
'use client'

import { useState } from 'react'
import { DashboardTabs } from './DashboardTabs'

export function DashboardTabsClient({
  active,
  children,
}: {
  active: DashboardTab
  children: React.ReactNode
}) {
  const [isPending, setIsPending] = useState(false)

  return (
    <>
      <DashboardTabs active={active} onPendingChange={setIsPending} />
      <div
        style={{
          opacity: isPending ? 0.5 : 1,
          transition: 'opacity 200ms ease',
          pointerEvents: isPending ? 'none' : 'auto',
        }}
      >
        {children}
      </div>
      {isPending && <PendingSkeletonOverlay />}
    </>
  )
}
```

E em `dashboard/page.tsx`, trocar:
```tsx
<DashboardTabs active={activeTab} />
{activeTab === 'monitor' && <MonitorContent />}
// ...
```
Por:
```tsx
<DashboardTabsClient active={activeTab}>
  {activeTab === 'monitor' && <MonitorContent />}
  {activeTab === 'fator-r' && <FatorRContent />}
  // ...
</DashboardTabsClient>
```

### W4 — Skeleton com delay

`<PendingSkeletonOverlay>` aparece APENAS após 200ms de `isPending` contínuo (`useEffect` + `setTimeout`). Em navegações rápidas (<200ms), nunca aparece — evita flash desnecessário.

```tsx
function PendingSkeletonOverlay() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 3,
      background: 'var(--lime)',
      animation: 'tab-loading-bar 1s ease infinite',
      zIndex: 999,
    }} />
  )
}
```

Barra fina no topo (estilo NProgress / GitHub) — feedback global sem ofuscar conteúdo.

## 6. Sucesso

- [ ] Clicar uma tab faz a tab destino mostrar opacidade reduzida instantâneo
- [ ] Conteúdo atual fica `opacity: 0.5` durante a transição
- [ ] Barra de progresso aparece SE transição passar de 200ms
- [ ] Navegação rápida (<200ms) não mostra skeleton (evita flash)
- [ ] Ctrl+click ou middle-click continua abrindo em nova aba
- [ ] Tab ativa não fica em loading
- [ ] Acessibilidade: `aria-busy` apropriado durante transição
- [ ] `npm test -- --run` verde
- [ ] `npx tsc --noEmit` limpo

## 7. Não-objetivos

- ❌ Refactor para Parallel Routes (`@monitor`, `@fatorR`) — escopo arquitetural maior
- ❌ Prefetch agressivo (Next já faz por default em viewport)
- ❌ Cache de tabs visitadas (sem mudança de comportamento real)
- ❌ Skeletons específicos por tab (P1, pode usar genérico)

## 8. Riscos

- **`useTransition` em Server Component re-rendering**: o `startTransition` notifica o React, mas o trabalho real é a navegação Next que envolve fetch do server. `isPending` cobre o tempo todo desde click até a próxima paint. ✅ Correto.
- **`onPendingChange` callback gera re-render do pai a cada toggle** — ok, é só 2 toggles por navegação.
- **CSS animation keyframes** — adicionar em `responsive.css` ou inline via styled-jsx. Se a keyframe `tab-loading-bar` não existir, fix óbvio durante implementação.

---

*Arquivos tocados:*
- `src/components/dashboard/DashboardTabs.tsx` (refactor com useTransition)
- `src/components/dashboard/DashboardTabsClient.tsx` (novo, wrapper)
- `src/app/dashboard/page.tsx` (trocar `<DashboardTabs>` por `<DashboardTabsClient>` envolvendo o content)
- `src/app/styles/dashboard-loading.css` (novo OU inline, keyframes)
