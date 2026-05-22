# Fator R — input manual + persistência — design

**Data:** 2026-05-21 · **Status:** pronto para CLI · **Tipo:** P1 feature (gap funcional reportado)

## 1. Objetivo

Hoje a "Calculadora interativa de Anexo III × V" do dashboard (`?aba=fator-r`) só tem slider 0%-50%, sem input numérico para valor exato e **sem persistência**. Usuário arrasta, vê resultado, fecha aba, perde tudo. Reportado: *"Fator R não está salvando e nem tem uma inserção manual de valores"*.

Adicionar:
1. Input numérico (R$ folha mensal) sincronizado bidirecionalmente com slider
2. Auto-save debounced em `monthly_inputs` (tabela já existe) via API
3. Indicador "salvo" / "salvando"

## 2. Estado atual (verificado)

Componentes envolvidos:
- `src/components/dashboard/DashboardSimulator.tsx` — orquestra a tab Fator R, lê `?focus=fatorR` da URL pra auto-scroll
- `src/components/resultado/FatorRInterativo.tsx` (provavelmente) — slider + lógica
- `src/components/dashboard/MonthlyMonitorSection.tsx:15-23` — define tipos `MonitorRow` com `fatorR: number | null`

Tabela `monthly_inputs` no Supabase já existe (provada por `monitorSeedRows` em `dashboard/page.tsx:180`). Suporta gravar folha mensal por (user_id, ano, mes).

API REST atual:
- `POST /api/simular` — calcula simulação (não persiste)
- Não há endpoint dedicado pra `monthly_inputs` CRUD do user comum (existe `accountant/clients/[id]/...` mas é B2B)

## 3. Decisões (fechadas)

- **Input numérico ao lado do slider** — não substituir; adicionar input à direita do display "R$ 0/mês". Sincronizado bidirecional via state pai.
- **Auto-save debounced** — 1.5s após última edição (slider OU input), POST pra novo endpoint `/api/monthly-inputs/upsert`. Indicador inline: "Salvando..." → "✓ Salvo".
- **Endpoint novo `POST /api/monthly-inputs/upsert`** — body `{ ano, mes, folhaMensal, faturamento? }`. Auth required. Upsert por `(user_id, ano, mes)`. Sem migration nova — tabela já tem schema.
- **Default do mês**: usar `mesAtual` da simulação ativa ou current month. Não criar UI de seletor de mês — fica out of scope.
- **Validação**: folhaMensal >= 0, número finito. Server rejeita negativo, NaN, >1.000.000 (sanity).
- **Sem migração**: tabela existe. Apenas: criar RLS policy se não existir, garantir que user só consegue upsert na própria linha.

## 4. Workstreams

**P0 (core feature):**
- W1: Endpoint `POST /api/monthly-inputs/upsert` com Zod validation + RLS-safe upsert
- W2: `<FolhaInput>` componente: input numérico R$ com formato pt-BR + sincronização bidirecional com slider via prop `value/onChange`
- W3: Hook `useDebouncedAutoSave({ value, onSave, delay: 1500 })` puro, testável
- W4: Indicador inline de status: idle / saving / saved / failed (text-only, ~10 chars)
- W5: Integração: `<FatorRInterativo>` passa folha pro auto-save hook; primeira renderização carrega valor de `monthly_inputs` se existir

**P1:**
- W6: Tests do helper de validação (server-side)
- W7: Optimistic UI: input/slider responde instantâneo; auto-save invisível

**Fora deste spec:**
- Seletor de mês manual
- Editar `faturamento` ou `prolabore` pelo mesmo endpoint (escopo expandido)
- Histórico visual de meses anteriores (já existe via `MonthlyMonitorSection`)

## 5. Detalhes

### W1 — Endpoint

`src/app/api/monthly-inputs/upsert/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PayloadSchema = z.object({
  ano: z.number().int().min(2020).max(2100),
  mes: z.number().int().min(1).max(12),
  folhaMensal: z.number().nonnegative().max(1_000_000),
  faturamento: z.number().nonnegative().max(100_000_000).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Autenticação obrigatória.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = PayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload inválido.', details: parsed.error.flatten() }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('monthly_inputs')
    .upsert({
      user_id: user.id,
      ano: parsed.data.ano,
      mes: parsed.data.mes,
      folha_mensal: parsed.data.folhaMensal,
      faturamento: parsed.data.faturamento,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,ano,mes' })

  if (error) {
    console.error('[monthly-inputs/upsert] error:', error.message)
    return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

### W2 — `<FolhaInput>`

Componente novo em `src/components/dashboard/FolhaInput.tsx`:

```tsx
'use client'

import { useState } from 'react'

interface Props {
  value: number  // centavos? não — usar reais como número
  onChange: (next: number) => void
  disabled?: boolean
}

export function FolhaInput({ value, onChange, disabled }: Props) {
  const [text, setText] = useState(formatBRL(value))

  function handleBlur() {
    const parsed = parseBRL(text)
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChange(parsed)
      setText(formatBRL(parsed))
    } else {
      setText(formatBRL(value))  // revert
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ color: 'var(--text2)', fontSize: 14 }}>R$</span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        style={{
          width: 120,
          padding: '8px 10px',
          textAlign: 'right',
          fontSize: 18, fontWeight: 700,
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          borderRadius: 'var(--radius)',
          color: 'var(--text1)',
        }}
      />
      <span style={{ color: 'var(--text3)', fontSize: 12 }}>/mês</span>
    </div>
  )
}

function formatBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
}

function parseBRL(s: string): number {
  const cleaned = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : NaN
}
```

### W3 — Hook `useDebouncedAutoSave`

`src/components/dashboard/use-debounced-auto-save.ts`:

```ts
import { useEffect, useRef, useState } from 'react'

type Status = 'idle' | 'saving' | 'saved' | 'failed'

export function useDebouncedAutoSave<T>({
  value,
  onSave,
  delay = 1500,
}: {
  value: T
  onSave: (v: T) => Promise<void>
  delay?: number
}): { status: Status } {
  const [status, setStatus] = useState<Status>('idle')
  const lastSavedRef = useRef<T>(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (Object.is(value, lastSavedRef.current)) return
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setStatus('saving')
      try {
        await onSave(value)
        lastSavedRef.current = value
        setStatus('saved')
      } catch {
        setStatus('failed')
      }
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, onSave, delay])

  return { status }
}
```

### W4 — Indicador

```tsx
const STATUS_LABEL = {
  idle: '',
  saving: 'Salvando...',
  saved: '✓ Salvo',
  failed: 'Falha — tente de novo',
} as const

<span style={{
  fontSize: 11,
  color: status === 'failed' ? 'var(--red)' : 'var(--text3)',
  minHeight: 14,
}}>
  {STATUS_LABEL[status]}
</span>
```

### W5 — Integração no `<FatorRInterativo>`

Tem que ler o componente atual e:
1. Adicionar `<FolhaInput>` ao lado do display existente
2. Estado `folhaMensal` compartilhado entre slider e input
3. `useDebouncedAutoSave({ value: folhaMensal, onSave: salvarApi })`
4. `salvarApi` faz POST pra `/api/monthly-inputs/upsert` com `{ ano, mes, folhaMensal }`
5. Renderizar `<StatusIndicator status={status} />`

### Carregamento inicial

`dashboard/page.tsx` já carrega `monitorSeedRows`. Passar o `folhaMensal` da row mais recente como valor inicial do FatorR interativo.

## 6. Sucesso

- [ ] Input numérico digitável funciona (R$ 5.500 valid; "abc" reject; -100 reject)
- [ ] Slider e input sincronizam bidirecionalmente
- [ ] Após edição, 1.5s depois aparece "Salvando..." → "✓ Salvo"
- [ ] Recarregar página mantém o valor
- [ ] Outro user logando não vê meu valor (RLS funcionando)
- [ ] Endpoint rejeita 401 sem auth, 400 sem payload, 500 em erro de DB
- [ ] Helper `parseBRL` testado: "1.234,56" → 1234.56, "abc" → NaN, "-100" → -100 (rejeitar no caller)
- [ ] Hook `useDebouncedAutoSave` testado: dispara após delay, cancela em new edit, status correto
- [ ] `npm test -- --run` verde
- [ ] `npx tsc --noEmit` limpo

## 7. Não-objetivos

- ❌ Seletor de mês manual (escopo expandido)
- ❌ Histórico inline de últimos meses
- ❌ Migration nova (tabela existe)
- ❌ Tocar nos endpoints accountant/clients/* (escopo B2B)
- ❌ UI de "Salvar manualmente" — auto-save é decisão

## 8. Riscos

- **RLS policy ausente em `monthly_inputs`** — verificar antes de codar. Se não existir, criar inline (migration 013 nova) com `(auth.uid() = user_id)` em SELECT/INSERT/UPDATE.
- **Race de auto-save com slider arrastando rápido** — debounce de 1.5s cobre o caso comum; arrasto contínuo de 5min sem soltar continua não salvando (intencional, evita request flood).
- **`folhaMensal === 0` é input válido?** Sim — zerar folha é cenário legítimo. Permitir.

---

*Arquivos tocados:*
- `src/app/api/monthly-inputs/upsert/route.ts` (novo)
- `src/app/api/monthly-inputs/upsert/route.test.ts` (novo)
- `src/components/dashboard/FolhaInput.tsx` (novo)
- `src/components/dashboard/use-debounced-auto-save.ts` (novo)
- `src/components/dashboard/use-debounced-auto-save.test.ts` (novo)
- `src/components/resultado/FatorRInterativo.tsx` (integração — verificar arquivo real)
- Talvez `supabase/migrations/013_monthly_inputs_rls.sql` (se RLS não existir)
