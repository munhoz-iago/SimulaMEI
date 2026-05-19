# Relatório PDF — preço, conteúdo, template e preview travado

**Data:** 2026-05-19 · **Branch:** claude/critical-tasks-conversion-trust
**Status:** design aprovado (aguardando review do spec)

## 1. Objetivo

1. Padronizar o preço do relatório avulso em **R$ 9,90**.
2. Definir e enriquecer o **conteúdo** do PDF.
3. Redesenhar o **template** dentro dos limites do React-PDF.
4. Adicionar **preview com os dados reais do usuário, com marca d'água**, que libera o PDF limpo ao pagar.
5. Consolidar os geradores de PDF divergentes em **um** componente.

## 2. Estado atual (verificado)

- Preço vive em 3+ lugares: Stripe Price object (`STRIPE_PRICE_REPORT_ID`, externo, é o que cobra), `STRIPE_PRODUCTS.relatorio.valorCentavos = 2900` (`src/lib/stripe.ts:10`, grava em `purchases.valor_centavos`), e copy hardcoded (`src/app/relatorio/page.tsx:59` "R$ 29"; `src/app/dashboard/relatorio/page.tsx:14` `REPORT_PRICE = 29`).
- Geradores de PDF divergentes: `src/lib/reports/SimulationReportDocument.tsx` (componente mínimo: 3 blocos), doc inline em `src/app/api/relatorio-premium/route.ts`, e `src/app/api/relatorio/gerar/route.ts`.
- Predicado de acesso `profile?.plano === 'pro' || (purchases?.length ?? 0) > 0` duplicado em 4 lugares: `api/relatorio/gerar/route.ts:39`, `api/relatorio-premium/route.ts:231`, `dashboard/relatorio/page.tsx:54`, `relatorio/page.tsx:31`.
- Teste `api/checkout/report/route.test.ts:19` espera `valorCentavos: 4900` — já divergente do código (2900). Reconciliar para 990.

## 3. Decisões (fechadas com o usuário)

- Abordagem **A**: template único dirigido por `variant: 'full' | 'preview'`.
- Preview = **dados reais do próprio usuário**, marca d'água, render no servidor.
- Stripe Price object (R$ 9,90 BRL) + `STRIPE_PRICE_REPORT_ID`: **ação do dono** (não por código). Sem isso, o Stripe cobra o valor antigo.

## 4. Design

### 4.1 Preço — fonte única
Criar `src/constants/pricing.ts`:
- `REPORT_PRICE_CENTAVOS = 990`
- `REPORT_PRICE_BRL = 9.9`
- `REPORT_PRICE_LABEL = 'R$ 9,90'`
- `formatBRL(centavos: number): string` (puro, testável)

Consumidores atualizados:
- `src/lib/stripe.ts:10` → `valorCentavos: REPORT_PRICE_CENTAVOS`
- `src/app/relatorio/page.tsx:59` → `REPORT_PRICE_LABEL`
- `src/app/dashboard/relatorio/page.tsx:14` → `REPORT_PRICE = REPORT_PRICE_BRL`
- `src/app/api/checkout/report/route.test.ts` → expectativa 990 (reconcilia o 4900 divergente)

**Risco de framing (decisão):** `dashboard/relatorio/page.tsx:220/240` calcula "% mais barato/mês" comparando `REPORT_PRICE` (avulso) com `PRO_PRICE` (mensal). A R$ 9,90 avulso vs Pro mensal, a comparação "% mais barato" inverte/perde sentido. **Decisão:** trocar a narrativa do `ValueComparisonCard` de "% mais barato" para "avulso R$ 9,90 por relatório vs Pro ilimitado/mês" (comparação honesta volume-based), sem matemática de % que pode dar negativo. Detalhe de copy fica no plano.

### 4.2 Conteúdo do relatório (seções)
Tudo de `ResultadoSimulacao`/motor — sem inventar dado:
1. Capa/cabeçalho: marca, `getLegalIdentity()` (TASK-2), data, e-mail, `TAX_RULE_VERSION`.
2. Resumo do cenário: CNAE, faturamento acumulado, projeção anual, % do teto (usa `usoTetoPercent`), cenário de risco.
3. Comparativo 4 regimes: tabela + gráfico de barras (reusa `comparativo` / `buildRegimePreview`), regime mais barato destacado, economia vs. atual.
4. Fator R (se aplicável): fator atual, folha mínima, economia Anexo III×V. **Suprimido se CNAE pendente** (fronteira fiscal — `resultadoVisibilidade`, TASK-4).
5. Oportunidades: `gerarOportunidadesFiscais` (existente).
6. Fontes & metodologia: `FONTES_FISCAIS` + `TAX_RULE_VERSION` + referência textual a `/metodologia` (TASK-1/11).
7. Disclaimer + identidade legal.

### 4.3 Template (React-PDF — escopo honesto)
Viável e no escopo: `Font.register` da fonte de marca **Space Grotesk** (TTF; mesma do site) para títulos, com fallback `Helvetica` se o load falhar em serverless; corpo em `Helvetica`, faixa de cabeçalho com cor de marca, página clara print-friendly com acentos, logo via `Image` (`public/icons/icon-512.png`), cards de seção (borda/raio), **gráfico de barras com primitivas `Svg`/`Rect`/`Text`** do `@react-pdf/renderer`, rodapé `fixed` com paginação + identidade + "/metodologia".
Fora de escopo (limite técnico React-PDF): CSS grid, blur, sombra rica, animação, efeitos web.

### 4.4 Preview travado + fluxo
`SimulationReportDocument({ variant })`:
- `variant='preview'`: `<View fixed>` com texto "AMOSTRA" diagonal repetido (baixa opacidade) sobre o conteúdo real + rodapé "Pague R$ 9,90 para liberar o PDF limpo".
- `variant='full'`: sem marca d'água.

Fluxo: simular → gate de e-mail (existente) → preview do próprio resultado (`variant='preview'`) → CTA "Liberar PDF — R$ 9,90" → checkout Stripe existente (`/api/checkout/report`) → on purchase, rota serve `variant='full'`.

### 4.5 Acesso (centralizar — dedup)
Criar `hasReportAccess(plan: string | null | undefined, purchasesCount: number): boolean` puro (= `plan === 'pro' || purchasesCount > 0`). Substituir as 4 cópias. Regras:
- preview (`variant='preview'`): exige apenas usuário autenticado.
- full (`variant='full'`): exige `hasReportAccess` true, revalidado server-side na rota.

### 4.6 Consolidação dos geradores
`api/relatorio-premium/route.ts` (doc inline) e `api/relatorio/gerar/route.ts` passam a chamar `SimulationReportDocument(variant)`. Remover o doc inline divergente. Manter o cast `as unknown as React.ReactElement<DocumentProps>` (React 19 + react-pdf, já usado).

## 5. Erros & bordas

- Falha de carga de fonte → fallback `Helvetica` (render não quebra).
- Falha de `renderToBuffer` → 500 + log (padrão atual mantido).
- Preview nunca serve `full`: a rota `full` revalida `hasReportAccess` no servidor.
- Marca d'água é server-side (não burlável via DOM/client).
- CNAE pendente: seções tributárias suprimidas no PDF também (consistência com a fronteira fiscal da TASK-4).

## 6. Testes (TDD)

Unitável (RED→GREEN):
- `formatBRL` e a fonte-única de preço (valor + label).
- `hasReportAccess(plan, purchasesCount)` (matriz: pro/free/null × 0/>0).
- decisão `variant → aplica marca d'água?`.
- seleção de seções por CNAE pendente (alinha com `resultadoVisibilidade` da TASK-4).

Não unitável (sinalizar para validação visual do dono):
- Fidelidade visual do PDF. Entregável: gerar 1 PDF de amostra (`variant='preview'` e `'full'`) para conferência manual.

## 7. Fora de escopo / pendências do dono

- Criar o Stripe Price de 990 BRL e setar `STRIPE_PRICE_REPORT_ID` (sem isso o Stripe cobra valor antigo). Será anotado no `.env.example`.
- Validação visual do PDF (amostra gerada para isso).
- Sem fac-símile HTML; sem efeitos web no PDF.

## 8. Sinergias com trabalho já entregue

TASK-1 (`FONTES_FISCAIS`/`TaxSourceNote`), TASK-2 (`getLegalIdentity`), TASK-4 (`resultadoVisibilidade` — CNAE pendente), TASK-11 (`/metodologia`), bug fix (`usoTetoPercent`). O relatório reusa essas peças — não duplica.

## 9. Arquivos afetados

Novos: `src/constants/pricing.ts` (+teste), `src/lib/auth/report-access.ts` (`hasReportAccess`, +teste).
Alterados: `src/lib/stripe.ts`, `src/app/relatorio/page.tsx`, `src/app/dashboard/relatorio/page.tsx`, `src/lib/reports/SimulationReportDocument.tsx` (variant + redesign), `src/app/api/relatorio-premium/route.ts` (usar componente), `src/app/api/relatorio/gerar/route.ts` (usar componente + `hasReportAccess`), `.env.example` (nota Stripe Price), testes correlatos.
