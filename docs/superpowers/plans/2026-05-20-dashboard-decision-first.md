# Dashboard Decision-First — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir erros fiscais ship-blocker do dashboard, depois reformatar a IA para decision-first (top 4 + abas + regra pura "próxima ação"). Não redesenhar sobre número errado.

**Architecture:** P0 fiscal (monitor.ts, kpis.ts, label por regime) → P1 honestidade (contador, confiança, calendário) → P2 IA (helpers puros + top 4 + abas) → P3 declutter. Reusa `TaxSourceNote`, fronteira fiscal CNAE pendente, `gerarOportunidadesFiscais`.

**Tech Stack:** Next.js App Router, TypeScript, vitest co-located, motor tributário existente.

---

## STATUS — checkpoint 2026-05-20 (após P0)

**Progresso:** P0 (Tasks 1-4) ✅ **TUDO EM PRODUÇÃO.** Restam P1/P2/P3 (Tasks 5-12).

| Task | Status | Commit | Achado / nota |
|---|---|---|---|
| **T1** FR<28% → Anexo V | ✅ deployed | `6531851` | Fix intrínseco: hardcode 'V' no branch gated por FR<28%/elegível (Res. CGSN 140/2018 art. 25-A). |
| **T2** margem confortável gated | ✅ deployed | `bf8b16f` | `kpis.ts` JÁ estava corrigido pelo audit anterior (consolidação T5 do billing). Bug real estava só em `monitor.ts:309`; corrigido + guard defensivo em kpis.ts. Adiciona `projecaoUso` no `getFiscalCalendarItems`. |
| **T3** label Anexo por regime | ✅ deployed | `0df26b9` | `ctx.regime` não existe — produto é **MEI-only** por construção (`isOnboardingComplete` exige `tipo_mei`). Hardcoded `'mei'` no call site; helper `labelAnexoPorRegime` futureproof (suporta `'simples'`). |
| **T4** procedência da projeção | ✅ deployed | `32ad81c` | "Dupla projeção 115k×163k" JÁ não existia no código atual (consolidação T5/T7 do billing unificou via `getDashboardKPIs`). Rótulo "snapshot" aplicado no histórico de simulações defensivamente. |

**Métricas:** suíte 229 → 236 (+7 testes novos), tsc limpo, deploys `success` em ~80–400s.

**Ambiente de execução:**
- Branch base: `claude/relatorio-pdf-redesign` (==`main` == produção).
- Worktree: `C:/Users/iagom/Downloads/📁 Organizado/Projetos e Código/SimulaMEI/simulamei/.claude/worktrees/relatorio-pdf-redesign`.
- Cada commit nessa branch → push fast-forward `HEAD:main` → deploy Vercel automático.
- Spec + plano agora estão em main (cherry-picked: `367fe0b` spec, `2e6ed76` plano).

**Próxima task a executar:** **T5** (P1 contador de simulações — clamp + plano-aware) em `src/app/dashboard/page.tsx` (~linha 623, conferir — billing mexeu no arquivo).

**Pendente em ordem:**
- T5 — contador clamp + plano-aware (P1, pequeno, 1 arquivo)
- T6 — confidence helper + badge de projeção (P1, novo arquivo puro)
- T7 — calendário fiscal filtrado por regime (P1)
- T8 — `recomendarAcao` regra ranqueada (P2, novo arquivo puro TDD)
- T9 — IA decision-first: top-4 + abas em dashboard/page.tsx (P2, **grande — 2-3h sozinho**, refactor estrutural; precisa de subagent-driven com revisão dupla rigorosa)
- T10 — histórico com label humano (P3)
- T11 — maturidade no rodapé (`TaxSourceNote`) (P3)
- T12 — zona sensível movida pra aba Conta (P3)

**Restrições obrigatórias para retomada:**
1. **TDD RED → GREEN** em cada unidade. Verificar RED real antes de implementar (não pular o passo).
2. **Verificação antes de cada push:** `npx vitest run` sem falhas, `npx tsc --noEmit` limpo. Se mudar layout (T9), `npm run build` também.
3. **Commits atômicos** Conventional PT-BR com trailer `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
4. **Push fast-forward** `HEAD:main` + `claude/relatorio-pdf-redesign`. Monitorar `gh api repos/munhoz-iago/SimulaMEI/commits/<sha>/status` até `success`.
5. **Trust-but-verify**: ler código depois de cada relatório de subagent — vários relatos foram imprecisos em sessões anteriores; verificar verbatim contra o arquivo.
6. **Subagent-driven** (`superpowers:subagent-driven-development`): implementer + spec reviewer + code quality reviewer para tasks substantivos. T9 exige revisão dupla rigorosa.
7. **rtk proxy colapsa `| tail`** de vitest/git — a linha `PASS (n) FAIL (n)` é confiável; para detalhe per-teste, ler o arquivo `[full output: ...log]` que o vitest aponta.

**Achados de design (vindos da execução de P0, relevantes pra P1/P2):**
- Produto SimulaMEI é **MEI-only por construção**. Em qualquer task que precisar de regime, **hardcode `'mei'` no call site** é correto (`labelAnexoPorRegime` já suporta `'simples'` pra futuro).
- `getDashboardKPIs` já unifica a fonte de projeção (live monthly_inputs). Evita duplicação no topo.
- `dashboard/page.tsx` foi expandido pelo billing (lista "Meus relatórios pagos", `paidItems`, label por regime). **Cuidado pra não regredir essas mudanças** ao mexer no arquivo nas tasks T5/T7/T9/T11/T12.

---

## File Structure

**Novos (puros, com test co-located):**
- `src/lib/dashboard/labels.ts` — `labelAnexoPorRegime`
- `src/lib/dashboard/confidence.ts` — `confidenceLevel`
- `src/lib/dashboard/recomendacao.ts` — `recomendarAcao` (regra ranqueada)

**Modificados:**
- `src/lib/monitor.ts` — FR alert title + margem confortável gate
- `src/lib/dashboard/kpis.ts` — margem confortável gated por projeção
- `src/app/dashboard/page.tsx` — IA top-4 + abas, contador clamp, label por regime, rodapé maturidade, declutter
- Componentes da agenda fiscal e histórico de simulações (filtro por regime, labels humanos)

---

## Task 1 — P0 Fator R: title "Anexo V" quando FR < 28%

**Files:**
- Modify: `src/lib/monitor.ts` (linha do title do alert FR<28%)
- Create: `src/lib/monitor.test.ts` se não existir (ou adicionar suite ao existente)

- [ ] **Step 1: Identificar o test file existente do monitor**

Run: `cd "<repo>" && ls src/lib/monitor*.test.ts 2>&1`
Há provavelmente um `monitor.test.ts` — usar; senão criar.

- [ ] **Step 2: Escrever teste RED do alert FR<28%**

Adicionar ao monitor.test.ts (ou criar) este describe:

```typescript
import { describe, expect, it } from 'vitest'
import { construirMonitorItens } from './monitor'  // ajustar nome export real ao ler

describe('monitor — Fator R abaixo de 28% (CNAE elegível)', () => {
  it('title cita Anexo V (não III)', () => {
    const itens = construirMonitorItens({
      elegivelFatorR: true,
      fatorRAtual: 0.15,
      totalLancamentos: 3,
      anexoAtual: 'V',                  // motor deve passar 'V' aqui
      faturamentoMedio: 10000,
      // ... outros campos do input mínimo para a função (ajustar conforme assinatura)
    } as any)
    const frItem = itens.find(i => i.title.startsWith('Fator R abaixo de 28%'))
    expect(frItem).toBeDefined()
    expect(frItem!.title).toBe('Fator R abaixo de 28% — Anexo V aplicado')
  })
})
```

Antes de escrever, **ler `monitor.ts` para identificar a assinatura exata da função builder** (export, nome, shape de input). Ajustar o teste à assinatura real. Se a função for chamada por algum orchestrator, criar input mínimo válido.

- [ ] **Step 3: Run RED, confirm fails**

Run: `cd "<repo>" && npx vitest run src/lib/monitor.test.ts`
Expected: fail no `expect(frItem!.title).toBe('Fator R abaixo de 28% — Anexo V aplicado')` — vai estar com `'Anexo III aplicado'` (bug atual).

- [ ] **Step 4: GREEN — hardcode 'V' no title**

Em `src/lib/monitor.ts:332`, trocar:
```typescript
title: `Fator R abaixo de 28% — Anexo ${anexoAtual} aplicado`,
```
por:
```typescript
title: `Fator R abaixo de 28% — Anexo V aplicado`,
```

(O branch é guarded por `elegivelFatorR && FR < 28%`, então o anexo correto é V por definição da regra Res. CGSN 140/2018 art. 25-A.)

- [ ] **Step 5: Investigar e corrigir o upstream**

Verificar onde `construirMonitorItens` (ou similar) é chamada e qual valor `anexoAtual` recebe. Se está vindo `anexoPadrao` do CNAE em vez do efetivo via `determinarAnexo(...)`, ajustar a chamada para passar o efetivo. Buscar:
`cd "<repo>" && grep -rn "construirMonitorItens\|getInsights\|monitorInsights" src/`
e revisar cada call site para passar o anexo correto (de `determinarAnexo` ou do `resultado.anexoAtual`).

- [ ] **Step 6: Run GREEN**

Run: `cd "<repo>" && npx vitest run src/lib/monitor.test.ts ; cd "<repo>" && npx vitest run`
Expected: PASS local; suite no new fails.

- [ ] **Step 7: Commit**

```bash
git add src/lib/monitor.ts src/lib/monitor.test.ts
git commit -m "$(cat <<'EOF'
fix(monitor): FR<28% em CNAE elegível → Anexo V (era 'III', erro fiscal)

Res. CGSN 140/2018 art. 25-A: Fator R ≥ 28% → Anexo III; < 28% → V.
O title injetava anexoAtual chegando como 'III' (provavelmente anexo-
Padrão, não o efetivo). Hardcode 'V' no branch FR<28%/elegível e
ajusta o upstream para passar o anexo efetivo.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — P0 "Margem confortável" gated por projeção

**Files:**
- Modify: `src/lib/dashboard/kpis.ts` (função `buildContextFromMonthly` ou similar — ler para o nome exato)
- Modify: `src/lib/monitor.ts` (linha 309)
- Test: `src/lib/dashboard/kpis.test.ts` (criar se não existir)

- [ ] **Step 1: Ler estrutura atual**

Run: `cd "<repo>" && sed -n '120,180p' src/lib/dashboard/kpis.ts` para ver a árvore de decisão completa do `buildContextFromMonthly`.

- [ ] **Step 2: Teste RED**

`src/lib/dashboard/kpis.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { buildContextFromMonthly } from './kpis'  // ajustar nome real do export

describe('buildContextFromMonthly — margem confortável só se projeção também ok', () => {
  it('NÃO diz "margem confortável" quando projeção excede teto', () => {
    const ctx = buildContextFromMonthly({
      usoTeto: 0.30,
      projecaoPct: 150,
      monthsOfHistory: 3,
      hasCurrentMonth: true,
      monthCount: '3 meses',
      pct: 30,
    } as any)
    expect(ctx.message.toLowerCase()).not.toContain('confortável')
    expect(ctx.message + ' ' + ctx.sub).toMatch(/projeç|excede|estouro/i)
  })

  it('diz "margem confortável" quando ambos abaixo', () => {
    const ctx = buildContextFromMonthly({
      usoTeto: 0.30,
      projecaoPct: 60,
      monthsOfHistory: 3,
      hasCurrentMonth: true,
      monthCount: '3 meses',
      pct: 30,
    } as any)
    expect(ctx.message.toLowerCase()).toContain('confortável')
  })
})
```

(Ajustar a assinatura ao input real do builder após Step 1.)

- [ ] **Step 3: Run RED**

Run: `cd "<repo>" && npx vitest run src/lib/dashboard/kpis.test.ts`
Expected: o teste "NÃO diz 'confortável' quando projeção excede" falha.

- [ ] **Step 4: GREEN — reestruturar a decisão**

Em `kpis.ts`, restruturar a função de contexto para ramificar PRIMEIRO por `projecaoPct`:

```typescript
// (antes das verificações de usoTeto existentes)
if (projecaoPct >= 100) {
  return {
    message: `Uso atual ${pct}%, mas projeção ${projecaoPct}% excede o teto`,
    sub: `Com ${monthCount} no histórico, a projeção atual indica estouro. Planeje migração ou ajuste de ritmo.`,
  }
}
// resto da árvore existente (140%/100%/50%/1mês/default) permanece
```

Para o ramo do `monitor.ts:309` (notification "Meio do caminho"), aplicar guarda similar: só emitir o "ainda há margem confortável" se a projeção também não exceder. Ler o contexto da função (parâmetros disponíveis) e adicionar.

- [ ] **Step 5: Run GREEN + suíte**

Run: `cd "<repo>" && npx vitest run src/lib/dashboard/kpis.test.ts src/lib/monitor.test.ts ; cd "<repo>" && npx vitest run`
Expected: PASS local + suíte sem novas falhas.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dashboard/kpis.ts src/lib/dashboard/kpis.test.ts src/lib/monitor.ts
git commit -m "$(cat <<'EOF'
fix(dashboard): 'margem confortável' gated pela projeção (não só uso atual)

Antes: usoTeto baixo + projeção crítica ainda exibia 'margem confortável'
— contradizia o headline crítico. Reestrutura a árvore para ramificar
primeiro por projecaoPct (sinal mais relevante).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — P0 Label de Anexo por regime (não dizer "atual" quando MEI)

**Files:**
- Create: `src/lib/dashboard/labels.ts` + `.test.ts`
- Modify: `src/app/dashboard/page.tsx:~379` (locator por conteúdo)

- [ ] **Step 1: Teste RED**

`src/lib/dashboard/labels.ts.test.ts` (ou `labels.test.ts`):
```typescript
import { describe, expect, it } from 'vitest'
import { labelAnexoPorRegime } from './labels'

describe('labelAnexoPorRegime', () => {
  it('MEI: descreve como projeção, não "atual"', () => {
    expect(labelAnexoPorRegime('mei', 'III')).toBe('Anexo III (se migrar para ME)')
    expect(labelAnexoPorRegime('mei', 'V')).toBe('Anexo V (se migrar para ME)')
  })
  it('Simples: descreve como atual', () => {
    expect(labelAnexoPorRegime('simples', 'III')).toBe('Anexo III (atual)')
    expect(labelAnexoPorRegime('simples', 'V')).toBe('Anexo V (atual)')
  })
  it('regime desconhecido: usa rótulo neutro', () => {
    expect(labelAnexoPorRegime(undefined, 'III')).toBe('Anexo III')
  })
})
```

- [ ] **Step 2: Run RED**

Run: `cd "<repo>" && npx vitest run src/lib/dashboard/labels.test.ts`
Expected: fail — módulo ausente.

- [ ] **Step 3: GREEN**

```typescript
// src/lib/dashboard/labels.ts
export type RegimeAtual = 'mei' | 'simples' | undefined

/** Rotula o anexo conforme o regime atual do usuário, evitando
 *  afirmar "atual" quando o usuário ainda é MEI (que não tem anexo). */
export function labelAnexoPorRegime(
  regime: RegimeAtual,
  anexo: 'I' | 'II' | 'III' | 'IV' | 'V',
): string {
  if (regime === 'mei') return `Anexo ${anexo} (se migrar para ME)`
  if (regime === 'simples') return `Anexo ${anexo} (atual)`
  return `Anexo ${anexo}`
}
```

- [ ] **Step 4: Run GREEN**

Expected: PASS (3).

- [ ] **Step 5: Wire em `dashboard/page.tsx`**

Localizar por conteúdo a expressão `kpis.fatorRAtual >= 0.28 ? 'Anexo III ✓' : 'abaixo de 28%'` (próxima da linha 379). Substituir pela versão que usa o helper e o regime do contexto. Exemplo (ajustar à shape real de `ctx`):

```tsx
import { labelAnexoPorRegime } from '@/lib/dashboard/labels'
// ...
{cnae?.elegivelFatorR ? (
  kpis.fatorRAtual >= 0.28
    ? labelAnexoPorRegime(ctx.regime, 'III')
    : labelAnexoPorRegime(ctx.regime, 'V')
) : labelAnexoPorRegime(ctx.regime, cnae?.anexoPadrao ?? 'III')}
```

Identificar o nome real do campo de regime no contexto (ler `lib/dashboard/context.ts` se necessário). Se ainda não existir, derivar de `user_profiles.tipo_mei` ou de evidência de migração — documentar a escolha no commit.

- [ ] **Step 6: Verify + commit**

Run typecheck + suite:
`cd "<repo>" && npx tsc --noEmit 2>&1 | grep -E "labels|dashboard/page" ; cd "<repo>" && npx vitest run`

```bash
git add src/lib/dashboard/labels.ts src/lib/dashboard/labels.test.ts src/app/dashboard/page.tsx
git commit -m "fix(dashboard): label de Anexo por regime (MEI mostra como projeção, não atual)"
```

---

## Task 4 — P0 Dupla projeção: investigar, definir fonte canônica e rotular

**Files (investigação primeiro):**
- Read: `src/lib/dashboard/kpis.ts`, `src/lib/dashboard/context.ts`, `src/app/dashboard/page.tsx`
- Eventualmente Modify: o(s) componente(s) que renderizam R$ 115.200 e R$ 163.200

- [ ] **Step 1: Localizar as duas fontes**

Run: `cd "<repo>" && grep -rn "projecaoAnual\|projecaoPct\|kpis\.projecao\|simulacaoMaisRecente\|alertaTeto\.proj" src/app/dashboard src/lib/dashboard | head -30`
Identificar:
- (a) Cálculo ao vivo dos monthly_inputs → o número grande do topo (esperado canônico).
- (b) Última simulação salva (`simulations` table) → o número do bloco "Motor fiscal/simulações".

- [ ] **Step 2: Definir fonte canônica e rotular**

**Decisão fixa do spec:** topo usa SEMPRE o cálculo dos monthly_inputs (`kpis.projecaoAnual` derivada do motor sobre o acumulado). O número da simulação salva continua a ser exibido em "Simulações", mas com label EXPLÍCITO de procedência + data:

```tsx
<div>
  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
    Última simulação salva — {fmtDate(simulacao.geradoEm)}
  </span>
  <div>{fmt(simulacao.alertaTeto.projecaoAnual)}</div>
  <span style={{ fontSize: 10, color: 'var(--text3)' }}>
    Não reflete os lançamentos mensais posteriores.
  </span>
</div>
```

(Se já está em um componente, adicionar o subtítulo de procedência.)

- [ ] **Step 3: Verify + commit**

Build + suite verde, sem novas falhas. Commit:

```bash
git add src/app/dashboard/page.tsx <demais arquivos tocados>
git commit -m "fix(dashboard): rotula procedência da simulação salva (evita conflito com projeção viva)"
```

---

## Task 5 — P1 Contador de simulações: clamp + plano-aware

**Files:**
- Modify: `src/app/dashboard/page.tsx:~623`

- [ ] **Step 1: Localizar e ler o bloco**

Ler `dashboard/page.tsx` em torno de `simulationsUsed` e `FREE_SIMULATION_LIMIT`. Identificar a flag de plano disponível no contexto (`ctx.plan`, `ctx.officePlan`, ou similar).

- [ ] **Step 2: Aplicar clamp + condicional**

Substituir:
```tsx
<span>{simulationsUsed} de {FREE_SIMULATION_LIMIT} simulações usadas</span>
```
por:
```tsx
{ctx.plan === 'pro' || ctx.officePlan === 'enterprise' || ctx.officePlan === 'pro' ? (
  <span>Plano sem limite de simulações</span>
) : (
  <span>{Math.min(simulationsUsed, FREE_SIMULATION_LIMIT)} de {FREE_SIMULATION_LIMIT} simulações usadas</span>
)}
```

(Ajustar nomes ao contexto real.)

- [ ] **Step 3: Verify + commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "fix(dashboard): contador de simulações com clamp e ciente de plano"
```

---

## Task 6 — P1 Confiança da projeção (badge por meses de histórico)

**Files:**
- Create: `src/lib/dashboard/confidence.ts` + `.test.ts`
- Modify: `src/app/dashboard/page.tsx` (badge perto do "Projeção anual")

- [ ] **Step 1: RED**

```typescript
// src/lib/dashboard/confidence.test.ts
import { describe, expect, it } from 'vitest'
import { confidenceLevel } from './confidence'

describe('confidenceLevel', () => {
  it('limitada para < 6 meses', () => {
    expect(confidenceLevel(0).level).toBe('limitada')
    expect(confidenceLevel(5).level).toBe('limitada')
  })
  it('razoavel para 6-9', () => {
    expect(confidenceLevel(6).level).toBe('razoavel')
    expect(confidenceLevel(9).level).toBe('razoavel')
  })
  it('forte para >= 10', () => {
    expect(confidenceLevel(10).level).toBe('forte')
    expect(confidenceLevel(12).level).toBe('forte')
  })
  it('label pt-BR coerente', () => {
    expect(confidenceLevel(3).label).toMatch(/base limitada/i)
    expect(confidenceLevel(12).label).toMatch(/histórico consistente|projeção confi/i)
  })
})
```

- [ ] **Step 2: Run RED**

Expected: módulo ausente.

- [ ] **Step 3: GREEN**

```typescript
// src/lib/dashboard/confidence.ts
export type ConfidenceLevel = 'limitada' | 'razoavel' | 'forte'

export function confidenceLevel(monthsOfHistory: number): { level: ConfidenceLevel; label: string } {
  if (monthsOfHistory < 6) {
    return { level: 'limitada', label: `Projeção com base limitada — ${monthsOfHistory} ${monthsOfHistory === 1 ? 'mês' : 'meses'} de histórico` }
  }
  if (monthsOfHistory < 10) {
    return { level: 'razoavel', label: `Projeção com base razoável — ${monthsOfHistory} meses de histórico` }
  }
  return { level: 'forte', label: `Histórico consistente — projeção confiável (${monthsOfHistory} meses)` }
}
```

- [ ] **Step 4: GREEN test**

Expected: PASS (4).

- [ ] **Step 5: Wire badge no card de projeção**

No `dashboard/page.tsx`, perto do número da projeção anual, renderizar:

```tsx
import { confidenceLevel } from '@/lib/dashboard/confidence'
// ...
const conf = confidenceLevel(kpis.monthsOfHistory)
// no JSX:
<span style={{ fontSize: 10, color: conf.level === 'limitada' ? 'var(--yellow)' : 'var(--text3)' }}>
  {conf.label}
</span>
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/dashboard/confidence.ts src/lib/dashboard/confidence.test.ts src/app/dashboard/page.tsx
git commit -m "feat(dashboard): badge de confiança da projeção por meses de histórico"
```

---

## Task 7 — P1 Calendário fiscal filtrado por regime

**Files:**
- Modify: componente(s) do calendário/agenda no dashboard (locator por conteúdo: busque "DASN", "DEFIS", "calendar", "agenda")

- [ ] **Step 1: Localizar**

Run: `cd "<repo>" && grep -rn "DASN\|DEFIS\|calendárioFiscal\|FiscalCalendar\|AgendaFiscal" src/`

- [ ] **Step 2: Filtrar obrigações por regime**

No componente, adicionar prop `regime: 'mei' | 'simples'`. Itens DASN-SIMEI só aparecem quando `regime === 'mei'`; DEFIS só quando `regime === 'simples'`; DAS comum aos dois. Adaptar a estrutura de dados existente (provavelmente uma array de obrigações tem um campo de regime ou pode ser inferido).

- [ ] **Step 3: TDD do filtro (puro)**

Se a lógica de filtro for extraível, criar `src/lib/calendar/obrigacoesPorRegime.ts` com função pura `obrigacoesPorRegime(todas, regime) → obrigações relevantes` + test.

- [ ] **Step 4: Verify + commit**

```bash
git commit -m "fix(dashboard): calendário fiscal filtrado por regime (DASN-SIMEI ≠ DEFIS)"
```

---

## Task 8 — P2 Regra pura "Próxima ação" (recomendarAcao)

**Files:**
- Create: `src/lib/dashboard/recomendacao.ts` + `.test.ts`

- [ ] **Step 1: RED**

```typescript
// src/lib/dashboard/recomendacao.test.ts
import { describe, expect, it } from 'vitest'
import { recomendarAcao } from './recomendacao'

const baseInput = {
  cenario: 'dentro_limite' as const,
  fatorR: undefined,
  mesEstourarTeto: null as number | null,
  elegivelFatorR: false,
  faltaLancamentoMesAtual: false,
  diaDoMes: 10,
  mesAtual: 5,
}

describe('recomendarAcao — regra ranqueada', () => {
  it('1) excesso_grave → consultar_contador', () => {
    const r = recomendarAcao({ ...baseInput, cenario: 'excesso_grave' })
    expect(r.tipo).toBe('consultar_contador')
  })
  it('2) falta lançamento e dia > 5 → lancar_mes', () => {
    const r = recomendarAcao({ ...baseInput, faltaLancamentoMesAtual: true, diaDoMes: 10 })
    expect(r.tipo).toBe('lancar_mes')
  })
  it('3) excesso_leve → planejar_migracao_me', () => {
    const r = recomendarAcao({ ...baseInput, cenario: 'excesso_leve' })
    expect(r.tipo).toBe('planejar_migracao_me')
  })
  it('4) estouro previsto nos próximos 3 meses → planejar_migracao_me', () => {
    const r = recomendarAcao({ ...baseInput, mesAtual: 5, mesEstourarTeto: 7 })
    expect(r.tipo).toBe('planejar_migracao_me')
  })
  it('5) elegível FR sem atingir → ajustar_pro_labore', () => {
    const r = recomendarAcao({
      ...baseInput,
      elegivelFatorR: true,
      fatorR: { atingeMinimo: false, aumentoFolhaMensalNecessario: 1500 } as any,
    })
    expect(r.tipo).toBe('ajustar_pro_labore')
    if (r.tipo === 'ajustar_pro_labore') expect(r.folhaSugerida).toBe(1500)
  })
  it('6) default → sem_acao_urgente', () => {
    const r = recomendarAcao(baseInput)
    expect(r.tipo).toBe('sem_acao_urgente')
  })
})
```

- [ ] **Step 2: Run RED**

Expected: módulo ausente.

- [ ] **Step 3: GREEN**

```typescript
// src/lib/dashboard/recomendacao.ts
import type { CenarioExcesso, ResultadoFatorR } from '@/types/tributario'

export type Acao =
  | { tipo: 'consultar_contador'; motivo: string }
  | { tipo: 'lancar_mes'; mes: number }
  | { tipo: 'planejar_migracao_me'; mesEstouro: number | null }
  | { tipo: 'ajustar_pro_labore'; folhaSugerida: number }
  | { tipo: 'sem_acao_urgente' }

export interface RecomendacaoInput {
  cenario: CenarioExcesso
  fatorR?: Pick<ResultadoFatorR, 'atingeMinimo' | 'aumentoFolhaMensalNecessario'>
  mesEstourarTeto: number | null
  elegivelFatorR: boolean
  faltaLancamentoMesAtual: boolean
  diaDoMes: number
  mesAtual: number
}

/** Regra ranqueada — primeira condição que casa ganha. Pura, determinística. */
export function recomendarAcao(input: RecomendacaoInput): Acao {
  if (input.cenario === 'excesso_grave') {
    return { tipo: 'consultar_contador', motivo: 'Risco de tributação retroativa: planejar urgente' }
  }
  if (input.faltaLancamentoMesAtual && input.diaDoMes > 5) {
    return { tipo: 'lancar_mes', mes: input.mesAtual }
  }
  if (input.cenario === 'excesso_leve') {
    return { tipo: 'planejar_migracao_me', mesEstouro: input.mesEstourarTeto }
  }
  if (
    input.mesEstourarTeto !== null &&
    input.mesEstourarTeto <= input.mesAtual + 3
  ) {
    return { tipo: 'planejar_migracao_me', mesEstouro: input.mesEstourarTeto }
  }
  if (input.elegivelFatorR && input.fatorR && !input.fatorR.atingeMinimo) {
    return {
      tipo: 'ajustar_pro_labore',
      folhaSugerida: input.fatorR.aumentoFolhaMensalNecessario,
    }
  }
  return { tipo: 'sem_acao_urgente' }
}
```

- [ ] **Step 4: Run GREEN**

Expected: PASS (6).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/recomendacao.ts src/lib/dashboard/recomendacao.test.ts
git commit -m "feat(dashboard): recomendarAcao — regra pura ranqueada da próxima ação"
```

---

## Task 9 — P2 IA restructure (top 4 + abas)

**Files:**
- Modify: `src/app/dashboard/page.tsx` (refatoração estrutural)
- Possivelmente split em sub-componentes em `src/components/dashboard/`

- [ ] **Step 1: Mapear o estado atual**

Ler `dashboard/page.tsx` por inteiro. Listar os blocos atuais (cards de KPI, fator R, simulações, calendário, oportunidades, conta etc.). Mapear cada um para uma de: **top-4**, **aba Monitor mensal**, **aba Fator R**, **aba Simulações**, **aba Agenda fiscal**, **aba Conta**, **rodapé** (maturidade/motor), **remover do main**.

- [ ] **Step 2: Implementar o esqueleto top-4 + tabs**

Top 4 cards (componente `<DashboardTopCards>` em `src/components/dashboard/DashboardTopCards.tsx`):
```tsx
'use client'
import { fmt, fmtPct } from '@/lib/format'
import { confidenceLevel } from '@/lib/dashboard/confidence'
import type { Acao } from '@/lib/dashboard/recomendacao'

interface Props {
  pctTetoUsado: number          // 0..100+
  projecaoAnual: number         // R$
  projecaoConfidenceMeses: number
  mesEstourarTeto: number | null
  proximaAcao: Acao
  tetoAnual: number
}

const MES_BR = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function actionLabel(a: Acao): string {
  switch (a.tipo) {
    case 'consultar_contador': return 'Consultar contador'
    case 'lancar_mes': return `Lançar ${MES_BR[a.mes-1]}`
    case 'planejar_migracao_me': return 'Planejar migração ME'
    case 'ajustar_pro_labore': return `Ajustar pró-labore (+${fmt(a.folhaSugerida)}/mês)`
    case 'sem_acao_urgente': return 'Sem ação urgente'
  }
}

export function DashboardTopCards(p: Props) {
  const conf = confidenceLevel(p.projecaoConfidenceMeses)
  const mesEstouro = p.mesEstourarTeto !== null ? MES_BR[p.mesEstourarTeto-1] : 'dentro do teto'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
      <Card label="Teto usado" value={`${Math.round(p.pctTetoUsado)}%`} sub={`Teto ${fmt(p.tetoAnual)}`} />
      <Card label="Projeção anual" value={fmt(p.projecaoAnual)} sub={conf.label} />
      <Card label="Mês provável de estouro" value={mesEstouro} sub={p.mesEstourarTeto !== null ? 'planeje migração antes' : 'sem risco previsto'} />
      <Card label="Próxima ação" value={actionLabel(p.proximaAcao)} sub="" highlight />
    </div>
  )
}

function Card({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'rgba(200,241,53,0.06)' : 'var(--bg1)',
      border: `1px solid ${highlight ? 'rgba(200,241,53,0.3)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)', padding: '16px 18px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.08, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--text1)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
```

Tabs (componente `<DashboardTabs>` em `src/components/dashboard/DashboardTabs.tsx`) — usa um state simples ou um query param para tab ativa. Sugestão: `?aba=monitor|fator-r|simulacoes|agenda|conta`.

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'

const TABS = [
  { id: 'monitor', label: 'Monitor mensal' },
  { id: 'fator-r', label: 'Fator R' },
  { id: 'simulacoes', label: 'Simulações' },
  { id: 'agenda', label: 'Agenda fiscal' },
  { id: 'conta', label: 'Conta' },
] as const
export type DashboardTab = typeof TABS[number]['id']

export function DashboardTabs({ active, children }: { active: DashboardTab; children: Record<DashboardTab, React.ReactNode> }) {
  return (
    <>
      <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {TABS.map(t => (
          <Link key={t.id} role="tab" aria-selected={active === t.id} href={`?aba=${t.id}`}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none',
              color: active === t.id ? 'var(--text1)' : 'var(--text3)',
              borderBottom: active === t.id ? '2px solid var(--lime)' : '2px solid transparent',
            }}>
            {t.label}
          </Link>
        ))}
      </div>
      <div>{children[active]}</div>
    </>
  )
}
```

- [ ] **Step 3: Migrar conteúdo existente para abas**

Em `dashboard/page.tsx`, ler `searchParams.aba` (Next 16 App Router), default = 'monitor'. Renderizar `<DashboardTopCards .../>` + `<DashboardTabs active={aba} children={{ ... }} />`. Cada child do tabs é um wrapper para os componentes que JÁ existem (Monitor mensal block, Fator R interativo, lista de simulações, calendário, formulário de conta) — não recria, só reorganiza.

- [ ] **Step 4: Recomputar inputs**

`proximaAcao` vem de `recomendarAcao({...})` no servidor (page é server component) com inputs derivados de `ctx`/`kpis`/`resultado`. Documentar a derivação no commit.

- [ ] **Step 5: Verify + commit**

```bash
git commit -m "feat(dashboard): IA decision-first — top 4 cards + abas"
```

---

## Task 10 — P3 Histórico de simulações com labels humanos (sem hash)

**Files:**
- Modify: componente de lista de simulações (locator por conteúdo: busque "#" + hash 6 chars, ou "simulações")

- [ ] **Step 1: Substituir o renderizador**

Para cada simulação salva, mostrar `${mesNomeBR(geradoEm)} ${ano} · ${cnaeDescricaoCurta} · ${cenarioLabel(alertaTeto.cenario)}`. O ID hash vai para um `title=...` (tooltip) ou um `<details>`. Função pura `simulacaoLabel(simulacao)` → string, TDD-able.

- [ ] **Step 2: TDD do labelizador**

```typescript
// src/lib/dashboard/simulacaoLabel.test.ts
import { describe, expect, it } from 'vitest'
import { simulacaoLabel } from './simulacaoLabel'

describe('simulacaoLabel', () => {
  it('formata como mês + CNAE truncado + cenário', () => {
    const label = simulacaoLabel({
      geradoEm: '2026-05-12T10:00:00Z',
      entrada: { cnae: '9602-5/01' },
      alertaTeto: { cenario: 'excesso_grave' },
      cnaeDescricao: 'Cabeleireiros',
    } as any)
    expect(label).toBe('mai/2026 · Cabeleireiros · excesso grave')
  })
})
```

```typescript
// src/lib/dashboard/simulacaoLabel.ts
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const CENARIO_LABEL: Record<string, string> = {
  dentro_limite: 'dentro do teto',
  excesso_leve: 'excesso leve',
  excesso_grave: 'excesso grave',
}
export function simulacaoLabel(s: {
  geradoEm: string
  entrada: { cnae: string }
  alertaTeto: { cenario: string }
  cnaeDescricao?: string
}): string {
  const d = new Date(s.geradoEm)
  const mes = MES[d.getMonth()]
  const ano = d.getFullYear()
  const cnae = s.cnaeDescricao ? s.cnaeDescricao.slice(0, 28) : s.entrada.cnae
  const cen = CENARIO_LABEL[s.alertaTeto.cenario] ?? s.alertaTeto.cenario
  return `${mes}/${ano} · ${cnae} · ${cen}`
}
```

- [ ] **Step 3: Wire no render**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(dashboard): histórico de simulações com label humano (sem hash)"
```

---

## Task 11 — P3 Maturidade no rodapé (TaxSourceNote)

**Files:**
- Modify: `src/app/dashboard/page.tsx` (remover card "Maturidade 4/4"; rodapé compacto)

- [ ] **Step 1: Remover o card grande**

Localizar `{/* Card 3: Maturidade do sistema */}` em `dashboard/page.tsx:~411` e remover o bloco do card.

- [ ] **Step 2: Adicionar rodapé compacto**

Ao fim da página renderizar:
```tsx
import { TaxSourceNote } from '@/components/resultado/TaxSourceNote'
// no render, ao fim:
<TaxSourceNote
  taxRuleVersion={TAX_RULE_VERSION}
  mapeamento={[
    { valores: 'Anexo, alíquota e DAS', fonte: FONTES_FISCAIS.resolucaoCgsn140 },
    { valores: 'Teto MEI', fonte: FONTES_FISCAIS.simplesNacionalLegislacao },
  ]}
  style={{ marginTop: 32, textAlign: 'center' }}
/>
```

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(dashboard): maturidade vira rodapé compacto (TaxSourceNote)"
```

---

## Task 12 — P3 Zona sensível movida para aba Conta

**Files:**
- Modify: `src/app/dashboard/page.tsx` (remover do main)
- Create/Modify: o sub-componente da aba "Conta" deve hospedar o "Excluir conta"

- [ ] **Step 1: Mover**

Identificar o bloco "Zona sensível / Excluir conta" no `dashboard/page.tsx` e movê-lo para o sub-componente da aba "Conta" (parte da Task 9). Manter a confirmação dupla.

- [ ] **Step 2: Commit**

```bash
git commit -m "refactor(dashboard): zona sensível para a aba Conta (fora do main)"
```

---

## Self-Review

**1. Cobertura do spec:**
- §4.1 FR<28%→V → Task 1 ✓
- §4.2 margem confortável gated → Task 2 ✓
- §4.3 anexo por regime → Task 3 ✓
- §4.4 dupla projeção → Task 4 ✓
- §5.1 contador clamp → Task 5 ✓
- §5.2 confiança → Task 6 ✓
- §5.3 calendário por regime → Task 7 ✓
- §6.3 recomendarAcao → Task 8 ✓
- §6.1/6.2 top-4 + abas → Task 9 ✓
- §8 declutter histórico → Task 10 ✓
- §8 maturidade rodapé → Task 11 ✓
- §8 zona sensível movida → Task 12 ✓

**2. Placeholder scan:** algumas tasks têm "ajustar ao input real" quando a assinatura exata da função externa precisa ser lida na execução — isto é instrução de localização, não placeholder de conteúdo. Aceito.

**3. Consistência de tipos:** `Acao` definido em Task 8 e consumido na Task 9 (`actionLabel`). `RegimeAtual` em Task 3. `ConfidenceLevel` em Task 6. Todos consistentes.

**4. Sequenciamento:** P0 (Tasks 1-4) **antes** de redesign (Task 9). Tasks são bite-sized. Gap nenhum.

---

## Notas de risco

- Task 4 (dupla projeção) tem investigação embutida; se o locator do segundo número for difícil, transformar em sub-tasks (4a: localizar; 4b: rotular).
- Task 9 (IA restructure) é a maior; estimar 2-3 h sozinha. Considerar dividir se necessário (top cards × tabs separados).
- Calendário (Task 7) depende do componente atual; se a estrutura de dados não modela regime, requer migração leve.
