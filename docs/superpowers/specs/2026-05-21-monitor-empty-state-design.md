# Monitor mensal — empty-state explicativo — design

**Data:** 2026-05-21 · **Status:** pronto para CLI · **Tipo:** P0 conversion (UX percebido como bug)

## 1. Objetivo

Quando o usuário comum acessa `/dashboard?aba=monitor` (ou a seção compacta na tab default) sem dados suficientes pra montar o `monitorSummary`, ele não vê **nada** — a seção é silenciosamente omitida. Reportado como "Monitor mensal não está aparecendo para o user comum". Não é bug — é gate sem fallback.

Adicionar empty-state explicativo com diagnóstico do que falta + CTA pra completar.

## 2. Estado atual (verificado)

`src/app/dashboard/page.tsx:200`:
```ts
const monitorSummary = profile?.cnae_principal && profile?.tipo_mei && monitorSeedRows.length > 0
  ? summarizeMonthlyMonitor({ ... })
  : null
```

Gate exige **3 condições** simultâneas:
1. `profile.cnae_principal` preenchido
2. `profile.tipo_mei` preenchido
3. Pelo menos 1 row em `monthly_inputs` (do user)

Se faltar qualquer uma → `monitorSummary === null` → comportamento:
- Tab "Monitor mensal" (ativa por default per `parseDashboardTab`): renderiza tela vazia ou crashes silenciosos no `<MonthlyMonitorSection initialSummary={null} ...>`
- Seção compacta na tab default (`:648`): tem aviso `"Complete o onboarding para ativar o monitor mensal..."` mas só no caso compacto, e provavelmente não cobre o caso "tem onboarding completo mas zero rows"

Resultado: user comum chega no dashboard, escolhe a tab Monitor mensal (que é a primeira/default), vê uma área vazia ou genérica. Não sabe o que fazer.

## 3. Decisões (fechadas)

- **Empty-state diferenciado por causa** — 3 razões possíveis para `monitorSummary === null`, cada uma com mensagem + CTA específico:
  - **Razão A:** `cnae_principal` faltando → "Defina seu CNAE pra começar" → link pro `/onboarding` (etapa de CNAE)
  - **Razão B:** `tipo_mei` faltando → "Diga se é MEI geral ou caminhoneiro" → link pro `/onboarding` (etapa de tipo)
  - **Razão C:** perfil completo mas zero rows → "Registre seu primeiro mês pra ativar o monitor" → CTA inline pra abrir mini-form de input mensal OU link pra `/dashboard?aba=fator-r` se for via simulação

- **Lógica de diagnóstico extraída** em pure helper `diagnoseMonitorEmptyReason(profile, rowsCount)` testável.

- **Reaproveitar visual já existente** do banner `:648` ("Complete o onboarding..."). Componente novo `<MonitorEmptyState reason={...} />` que ESTE banner passa a usar internamente.

- **Adicionar prop opcional `emptyState` no `<MonthlyMonitorSection>`** — quando `summary === null`, renderiza `emptyState` em vez de quebrar/sumir.

## 4. Workstreams

**P0:**
- W1: Helper `diagnoseMonitorEmptyReason` retornando `'cnae-missing' | 'tipo-missing' | 'no-rows' | null` (null = tem dados, não é empty)
- W2: Componente `<MonitorEmptyState reason={...} />` em `src/components/dashboard/MonitorEmptyState.tsx` com 3 variantes
- W3: `<MonthlyMonitorSection>` aceita prop `emptyState?: React.ReactNode` e renderiza quando `summary === null`
- W4: `dashboard/page.tsx` computa `diagnoseMonitorEmptyReason` e passa `<MonitorEmptyState ... />` como `emptyState` prop
- W5: Banner `:648` substituído por `<MonitorEmptyState>` (dedup, mesma fonte)

**Fora deste spec:**
- Mini-form inline pra registrar primeiro mês — complexo, pode virar spec próprio
- Card "complete X% do onboarding" no top do dashboard — refactor de scope maior

## 5. Detalhes

### W1 — Helper puro

`src/components/dashboard/monitor-empty-state.ts`:

```ts
export type MonitorEmptyReason = 'cnae-missing' | 'tipo-missing' | 'no-rows'

interface ProfileShape {
  cnae_principal?: string | null
  tipo_mei?: string | null
}

/**
 * Retorna o motivo de `monitorSummary` ser null, ou `null` se há dados.
 * Ordem de prioridade: cnae > tipo > rows (mais relevante primeiro).
 */
export function diagnoseMonitorEmptyReason(
  profile: ProfileShape | null | undefined,
  rowsCount: number,
): MonitorEmptyReason | null {
  if (!profile?.cnae_principal) return 'cnae-missing'
  if (!profile?.tipo_mei) return 'tipo-missing'
  if (rowsCount === 0) return 'no-rows'
  return null
}
```

### W2 — Componente

`src/components/dashboard/MonitorEmptyState.tsx`:

```tsx
import Link from 'next/link'
import type { MonitorEmptyReason } from './monitor-empty-state'

const COPY: Record<MonitorEmptyReason, { title: string; body: string; cta: { label: string; href: string } }> = {
  'cnae-missing': {
    title: 'Defina seu CNAE pra ativar o monitor',
    body: 'O monitor mensal precisa do CNAE principal pra calcular Anexo provável, alíquota efetiva e Fator R esperado.',
    cta: { label: 'Definir CNAE no onboarding →', href: '/onboarding?focus=cnae' },
  },
  'tipo-missing': {
    title: 'Diga se você é MEI geral ou caminhoneiro',
    body: 'O teto e a base de cálculo mudam: R$ 81.000/ano (geral) vs R$ 251.600/ano (caminhoneiro).',
    cta: { label: 'Selecionar tipo no onboarding →', href: '/onboarding?focus=tipo' },
  },
  'no-rows': {
    title: 'Registre seu primeiro mês pra ativar o monitor',
    body: 'Com a primeira simulação salva, você passa a ver projeção de teto, evolução do Fator R e alerta de transição de Anexo.',
    cta: { label: 'Fazer primeira simulação →', href: '/dashboard?aba=fator-r' },
  },
}

export function MonitorEmptyState({ reason }: { reason: MonitorEmptyReason }) {
  const copy = COPY[reason]
  return (
    <div
      role="region"
      aria-label="Monitor mensal — orientação"
      style={{
        background: 'var(--tint-blue)',
        border: '1px solid var(--tint-blue-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 22px',
        display: 'grid',
        gap: 10,
      }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)', margin: 0 }}>
        {copy.title}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
        {copy.body}
      </p>
      <Link
        href={copy.cta.href}
        style={{
          justifySelf: 'start',
          padding: '8px 14px',
          background: 'var(--blue)',
          color: 'var(--ink-on-accent)',
          borderRadius: 'var(--radius)',
          fontSize: 13,
          fontWeight: 800,
          textDecoration: 'none',
          marginTop: 4,
        }}
      >
        {copy.cta.label}
      </Link>
    </div>
  )
}
```

### W3 — Prop `emptyState` no `<MonthlyMonitorSection>`

Modificar `src/components/dashboard/MonthlyMonitorSection.tsx` pra:
1. Aceitar `emptyState?: React.ReactNode` na interface de props
2. Quando `initialSummary === null` (já é nullable provável), renderizar `emptyState` em vez de tentar usar `summary?.fatorRAtual ?? 0` etc.

### W4 — `dashboard/page.tsx`

```ts
import { diagnoseMonitorEmptyReason } from '@/components/dashboard/monitor-empty-state'
import { MonitorEmptyState } from '@/components/dashboard/MonitorEmptyState'

// ... dentro da função:
const monitorEmptyReason = diagnoseMonitorEmptyReason(profile, monitorRows.length)
const monitorEmptyNode = monitorEmptyReason
  ? <MonitorEmptyState reason={monitorEmptyReason} />
  : null

// no render:
<MonthlyMonitorSection
  initialSummary={monitorSummary}
  emptyState={monitorEmptyNode}
  // ... resto
/>
```

### W5 — Substituir banner :648 pelo `<MonitorEmptyState>`

Verificar o que o banner atual mostra. Se for genérico "Complete o onboarding", o `MonitorEmptyState` cobre — substituir. Se for algo diferente (ex: indicador de progresso), manter ambos.

## 6. Sucesso

- [ ] User sem `cnae_principal` vê empty-state "Defina seu CNAE" com CTA pra onboarding
- [ ] User sem `tipo_mei` vê empty-state "Diga se é MEI geral ou caminhoneiro"
- [ ] User com perfil completo mas zero rows vê "Registre seu primeiro mês"
- [ ] User com perfil completo + rows: monitor normal renderiza (sem regressão)
- [ ] Banner antigo `:648` substituído pelo componente novo
- [ ] Helper testado: 4 casos (null profile, cnae-missing, tipo-missing, no-rows, complete)
- [ ] `npm test -- --run` verde
- [ ] `npx tsc --noEmit` limpo

## 7. Não-objetivos

- ❌ Mini-form de input mensal inline (P1, spec próprio)
- ❌ Progress indicator do onboarding completo (refactor maior)
- ❌ Migration nova (helper é client-side puro)
- ❌ Mudança na lógica de gate em si — só adicionar fallback, não relaxar critérios

---

*Arquivos tocados:*
- `src/components/dashboard/monitor-empty-state.ts` (novo, helper puro)
- `src/components/dashboard/monitor-empty-state.test.ts` (novo)
- `src/components/dashboard/MonitorEmptyState.tsx` (novo, componente)
- `src/components/dashboard/MonthlyMonitorSection.tsx` (prop emptyState)
- `src/app/dashboard/page.tsx` (compute diagnose + pass node + remove banner :648)
