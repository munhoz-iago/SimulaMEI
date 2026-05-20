# Dashboard — decision-first + correção fiscal

**Data:** 2026-05-20 · **Status:** design aprovado em conversa (aguardando review do spec)

## 1. Objetivo

Transformar o dashboard de "central fiscal completa" em **instrumento de decisão mensal**, depois de fechar **erros de correção fiscal** que destruem a credibilidade do produto. Não redesenhar em cima de número errado.

## 2. Estado atual (verificado por grep)

**Erros fiscais ship-blocker (P0):**
- `src/lib/monitor.ts:332` — `title: \`Fator R abaixo de 28% — Anexo ${anexoAtual} aplicado\`` injeta `anexoAtual` que chega como `'III'` (visto na tela). Per Res. CGSN 140/2018 art. 25-A: CNAE elegível com FR<28% → **Anexo V** (não III). O `body` na linha 335 já fala em "migrar do Anexo V para o III" — sabe a regra; o title contradiz.
- `src/lib/dashboard/kpis.ts:167` — `message: \`${pct}% do teto — margem confortável\`` é o ramo default; ramos anteriores decidem por `usoTeto` (acumulado), **sem considerar `projecaoPct`**. Resultado: a 30% acumulado mas projeção crítica, mensagem diz "confortável".
- `src/lib/monitor.ts:309` — mesmo padrão na notification "Meio do caminho: X% — margem confortável" para `usoTeto > 0.5` (sem gate de projeção).
- `src/app/dashboard/page.tsx:379` — render `kpis.fatorRAtual >= 0.28 ? 'Anexo III ✓' : 'abaixo de 28%'` sem distinguir **MEI atual** vs **Anexo projetado se migrar para ME**. MEI é SIMEI (DAS fixo); não tem anexo. Mostrar "Anexo atual" pra MEI é erro de categoria.
- **Dupla projeção** (R$ 115.200 no topo × R$ 163.200 em "Motor fiscal/simulações"): cálculo ao vivo dos monthly_inputs vs uma simulação salva, sem reconciliação nem rotulagem. Locator a investigar na execução (provavelmente `lib/dashboard/kpis.ts` × `getDashboardContext`).

**Bugs/inconsistências (P1):**
- `src/app/dashboard/page.tsx:623` — `{simulationsUsed} de {FREE_SIMULATION_LIMIT} simulações usadas` sem clamp; mostrou "4 de 3". Causa provável: usuário com `office.plan='enterprise'` (admin) não respeita o limit de Free; o display não distingue plano que tem bypass.
- Confiança da projeção com 5 meses não sinalizada como base limitada.
- Calendário fiscal sem distinção de regime (DASN-SIMEI para MEI × DEFIS para ME/EPP no Simples). Hoje aparecem misturados.

**Excesso visual (P3):**
- IDs internos `#1E68F9` no histórico de simulações.
- Card "Maturidade 4/4" + versão do motor + plano + fonte ocupam espaço grande no main.
- "Zona sensível / Excluir conta" no dashboard principal (deve estar em /configurações).
- Fadiga de alerta: Crítico + Monitor + urgente + atenção + oportunidade + alta no mesmo viewport diluem urgência real.

## 3. Decisões (fechadas)

- **Sequência:** **P0** (corretude fiscal) → **P1** (honestidade de dado) → **P2** (IA decision-first) → **P3** (declutter). **Não pular ordem** — redesign sobre erro fiscal amplifica o problema.
- **IA do topo:** 4 cards apenas — **Teto usado** · **Projeção anual** · **Mês provável de estouro** · **Próxima ação recomendada**. O resto vira abas: **Monitor mensal**, **Fator R**, **Simulações**, **Agenda fiscal**, **Conta**.
- **MEI atual × Cenário Simples:** separação visual e semântica clara. Métricas de Anexo/Fator R/alíquota só aparecem rotuladas como "cenário se migrar para ME", nunca como "atual" enquanto o usuário é MEI.
- **Maturidade do motor:** **minimizar, não eliminar** — linha discreta no rodapé com link `/metodologia` (criada na TASK-11), seguindo o padrão do `TaxSourceNote` (TASK-1). Mantém a narrativa de auditabilidade sem ocupar espaço de decisão.
- **"Próxima ação":** **regra de ranqueamento pura e testável**, não opinião renderizada (ver §6).

## 4. P0 — corretude fiscal (fix antes do redesign)

### 4.1 Fator R abaixo de 28% → Anexo V (não III)
`src/lib/monitor.ts:332` — substituir o template para hardcode `Anexo V`:

```
title: 'Fator R abaixo de 28% — Anexo V aplicado'
```

O `body` (linha 335) já está correto ("migrar do Anexo V para o III"); manter. **Verificar e corrigir o upstream**: onde `anexoAtual` está sendo passado para a função builder de alerts — está vindo `'III'` (provavelmente `anexoPadrao` do CNAE, não o efetivo de `determinarAnexo`). Mudar para o efetivo (que é 'V' por definição quando `elegivelFatorR && FR<28%`).

TDD: teste do alert-builder do monitor — para entrada `elegivelFatorR=true, fatorRAtual=0.15`, o título deve conter `Anexo V` (não `Anexo III`).

### 4.2 "Margem confortável" gated pela projeção
`src/lib/dashboard/kpis.ts:167` e `src/lib/monitor.ts:309` — adicionar guarda: se `projecaoPct >= 100`, NÃO emitir "margem confortável"; em vez disso, mensagem honesta tipo `"Uso atual moderado, mas projeção (${projecaoPct}%) excede o teto"`. Restruturar a árvore de decisão para ramificar primeiro por `projecaoPct` (sinal mais relevante), depois por `usoTeto`.

TDD: testes da função de contexto cobrindo:
- `usoTeto=0.30, projecaoPct=150` → mensagem NÃO contém "confortável", contém alerta de projeção.
- `usoTeto=0.30, projecaoPct=60` → "margem confortável" OK.

### 4.3 "Anexo atual" em contexto MEI
`src/app/dashboard/page.tsx:379` — distinguir regime do usuário ao renderizar o label. Se o usuário é MEI (precisa identificar a flag no contexto; provavelmente derivada de `user_profiles.tipo_mei` ou similar), o label vira **"Anexo projetado se migrar para ME"** com cor mais neutra. Se já é ME no Simples, mantém "Anexo atual".

Idealmente, criar um helper puro `labelAnexoPorRegime(regime, anexo)` em `src/lib/dashboard/labels.ts` (ou similar), TDD-able.

### 4.4 Dupla projeção 115k × 163k
Investigação na execução: localizar as duas fontes (cálculo ao vivo dos monthly_inputs × simulação salva mais recente). Decidir uma **fonte canônica** para o topo do dashboard (recomendação: a projeção viva dos monthly_inputs, com `projecaoAnual` do motor sobre o acumulado). Onde a "simulação salva" aparece, **rotular explicitamente** ("Última simulação salva — não reflete os lançamentos mensais"). Garantir consistência: o número grande do topo é o do `kpis`; outros aparecem com data e rótulo.

## 5. P1 — honestidade de dado

### 5.1 Clamp + framing do contador de simulações
`src/app/dashboard/page.tsx:623` — duas mudanças:
- Display clamp **segurança**: `Math.min(simulationsUsed, FREE_SIMULATION_LIMIT)` no numerador (nunca mostrar `4 de 3`).
- Framing por plano: se o usuário tem bypass (`office.plan` enterprise/pro, ou plano `pro`), **não exibir o contador Free**; mostrar "Plano sem limite" ou esconder o card.

### 5.2 Confiança da projeção com base limitada
Sinalizar visualmente quando `monthsOfHistory < 6`: badge "Projeção com base limitada — N meses de histórico". Não bloqueia nada, mas calibra a confiança.

Pure helper testável: `confidenceLevel(monthsOfHistory) → 'limitada' | 'razoavel' | 'forte'` (limiares: <6, 6–9, ≥10), com o label apropriado.

### 5.3 Calendário fiscal por regime
Quando `regime === 'mei'`: mostrar **DASN-SIMEI** anual + DAS mensal. Quando `regime === 'simples'`: **DEFIS** + apurações mensais. Não mostrar os dois misturados. Os componentes existentes que enumeram obrigações devem receber `regime` como prop e filtrar.

## 6. P2 — IA decision-first

### 6.1 Top fixo (4 cards apenas)

| Card | Conteúdo | Fonte |
|---|---|---|
| Teto usado | `${pct}% (${fmt(faturAcum)})` + barra | kpis.usoTeto |
| Projeção anual | `${fmt(projecaoAnual)}` + cenário | kpis.alertaTeto |
| Mês provável de estouro | nome do mês ou "dentro do teto" | derivar de motor (mesEstourarTeto) |
| Próxima ação | call-to-action curto + link | §6.3 (regra pura) |

### 6.2 Abas
- **Monitor mensal** — lançamentos do ano, gráfico de evolução (faturamento mês a mês + linha de teto + projeção), CTA "lançar mês atual" se faltando.
- **Fator R** — só visível se `elegivelFatorR`. Atual + folha mínima + economia III×V (componente `FatorRInterativo` já existe).
- **Simulações** — histórico **com labels humanos** ("Cenário set/2026 com pró-labore R$3k"), não IDs hash. CTA "nova simulação". Aplica clamp da P1.
- **Agenda fiscal** — obrigações do regime corrente (DASN-SIMEI vs DEFIS — P1.3).
- **Conta** — plano, configurações, **e aqui (não no main) a zona sensível / excluir conta**.

### 6.3 "Próxima ação" — regra pura ranqueada (TDD)

Não é opinião renderizada — é função pura testável:

```ts
type Acao =
  | { tipo: 'lancar_mes', mes: number }
  | { tipo: 'planejar_migracao_me', mesEstouro: number }
  | { tipo: 'ajustar_pro_labore', folhaSugerida: number }
  | { tipo: 'consultar_contador', motivo: string }
  | { tipo: 'sem_acao_urgente' }

function recomendarAcao(input: {
  faltaLancamentoMesAtual: boolean,
  cenario: CenarioExcesso,   // do alertaTeto
  fatorR?: ResultadoFatorR,
  mesEstourarTeto: number | null,
  elegivelFatorR: boolean,
}): Acao
```

**Regra de ranqueamento (em ordem; primeira que casa ganha):**
1. `cenario === 'excesso_grave'` → `consultar_contador` (motivo: "tributação retroativa, planejar urgente").
2. `faltaLancamentoMesAtual && currentDay > 5` → `lancar_mes`.
3. `cenario === 'excesso_leve'` ou `mesEstourarTeto !== null && mesEstourarTeto <= currentMonth + 3` → `planejar_migracao_me`.
4. `elegivelFatorR && fatorR && !fatorR.atingeMinimo` → `ajustar_pro_labore` (folha sugerida = `fatorR.aumentoFolhaMensalNecessario`).
5. Default → `sem_acao_urgente`.

`src/lib/dashboard/recomendacao.ts` + `.test.ts`, TDD-puro. UI renderiza o action label + link conforme tipo.

## 7. Reusar trabalho já entregue

- **`TaxSourceNote`** (TASK-1) — usar no rodapé do dashboard: "Motor v… · Metodologia" com link `/metodologia`.
- **Fronteira fiscal de CNAE pendente** (TASK-4, `resultadoVisibilidade`) — aplicar também no dashboard: se o CNAE configurado é pendente, suprimir Anexo/Fator R/alíquota (consistência com simulador).
- **`hasReportAccess`** (TASK-3) — já está sendo usado no `dashboard/relatorio` da página de relatório; nada novo aqui.
- **`gerarOportunidadesFiscais`** (motor existente) — a aba "Monitor" pode listar as top-3 oportunidades; o "Próxima ação" pode incorporar como uma das fontes.

## 8. P3 — declutter

- Histórico de simulações: substituir IDs `#1E68F9` por label humano. Formato: `"${mesNomeBR} ${ano} · ${cnaeDescricaoCurta} · ${cenario}"`. Manter o ID acessível em tooltip/details.
- "Maturidade 4/4" — remover o card grande; substituir por linha de rodapé única `Motor vX · Metodologia` (componente: pequeno wrapper de `TaxSourceNote`).
- "Versão do motor", "Fonte de dados" — mesmo rodapé.
- "Zona sensível / Excluir conta" — mover para `/dashboard/conta` (aba), com confirmação dupla.
- **Fadiga de alerta:** definir hierarquia visual estrita — só **um** alerta crítico visível por vez no top; demais como contadores nas abas. Critério: priority = 'alta'/'crítica' do builder de monitor virá no topo; 'media' nas abas; 'baixa' suprimida do top.

## 9. Fora de escopo / pendências do dono

- Migração de dados/seed para corrigir contagens (`simulationsUsed`) — só o display aqui.
- Investigação backend de count vs office.plan bypass: a execução pode propor mudança server-side, mas decisão de modelar plano canonical fica com o dono.
- Conteúdo final de copy fiscal nas mensagens (revisar com contador, mesma nota da TASK-10).
- Mobile real: revisão visual em 390px continua dependendo de validação visual do dono (limitação do ambiente já estabelecida).

## 10. Estratégia de testes

**TDD (puras, RED→GREEN):**
- `monitor.ts` alert-builder: matriz Fator R (FR<28%/eligível → V; FR≥28%/eligível → III; CNAE não elegível → não emite alert FR).
- `kpis.ts` `buildContextFromMonthly`: matriz usoTeto × projecaoPct (não dizer "confortável" quando projeção crítica).
- `dashboard/recomendacao.ts`: 5 ramos da regra de ranqueamento (cada um casa só na sua condição).
- `dashboard/labels.ts` `labelAnexoPorRegime`: MEI → "projetado se migrar"; Simples → "atual".
- `dashboard/confidence.ts` `confidenceLevel`: limiares 6 e 10.

**Não unitável (sinalizar):** layout responsivo, fidelidade visual; pede validação visual do dono em 390px e dispositivo real.

## 11. Arquivos afetados (estimativa)

**Novos:**
- `src/lib/dashboard/recomendacao.ts` + `.test.ts`
- `src/lib/dashboard/labels.ts` + `.test.ts`
- `src/lib/dashboard/confidence.ts` + `.test.ts`

**Modificados:**
- `src/lib/monitor.ts` (FR title + margem confortável)
- `src/lib/dashboard/kpis.ts` (margem confortável gated por projeção)
- `src/app/dashboard/page.tsx` (top 4 cards, abas, declutter, contador clamp, anexo label, rodapé maturidade)
- componentes do calendário fiscal (filtro por regime)
- componente de histórico de simulações (label humano)
- componente da aba conta (zona sensível movida pra lá)

Estimativa: G (grande; ≥ 8h de execução cuidadosa por causa do redesign).
