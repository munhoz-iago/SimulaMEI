# tasks-simulamei-2026-05-16

```
## CONTEXT
STACK: Next.js App Router + Vercel + PostHog + Supabase Auth + Stripe
AUTH: login em src/app/auth/login; registro em src/app/auth/registro
INFRA: deploy Vercel; motor fiscal versionado (ex. BR-MEI-SN-2026-04-28); test runner vitest
NOTE: simulador É a home (/, âncora #simulador); resultado ungated; gate de e-mail libera "análise completa"
JÁ FEITO (não recriar): JSON-LD base em src/app/page.tsx:98 · PostHog opt-out default em src/components/providers/PostHogProvider.tsx:34 · skip link em src/components/home/HomeClient.tsx:37
ORDEM: executar P0 → P1 → P2. Não tratar como checklist plano.
```

## P0 — Receita, Confiança e Medição

```
## TASK-1 · 🔴 · Trust
FILE: src/lib/tributario/fontes.ts (novo) + src/components/resultado/TaxSourceNote.tsx (novo)
PROBLEM: Números do resultado sem base legal nem fonte inline.
ACTION:
- Criar fontes.ts com fonte por regra: teto MEI, tolerância 20%, Fator R 28%, Anexo III/V, Lucro Presumido, INSS pró-labore
- Criar TaxSourceNote.tsx (renderiza "Fonte: <norma> · Motor <versão>")
- Inserir nota em PartialResults, FullResults, TabelaDAS e no disclaimer
SUCCESS: cada card de valor renderiza fonte+versão do motor no DOM
DEP: nenhuma
```

```
## TASK-2 · 🔴 · Trust
FILE: src/constants/site.ts + src/components/layout/Footer.tsx:104 + src/components/resultado/EmailGate.tsx:108
PROBLEM: Nenhuma identidade empresarial (CNPJ/razão social) no site.
ACTION:
- Adicionar LEGAL_ENTITY_NAME, LEGAL_TAX_ID, LEGAL_EMAIL, LEGAL_CITY em site.ts
- Renderizar no footer e na tela de gate de e-mail
- Sem placeholder: se não houver CNPJ, usar "Operado por <nome>"
SUCCESS: identidade legal real presente no DOM do footer e do gate
DEP: nenhuma
```

```
## TASK-3 · 🔴 · Analytics
FILE: src/lib/analytics/events.ts:5
PROBLEM: Eventos de funil não canônicos nem verificados no PostHog.
ACTION:
- Normalizar nomes: view_home, start_simulation, complete_simulation, view_result, submit_lead, unlock_full_result, checkout_start
- Emitir view_home no mount da home; view_result quando resultado aparece
- Emitir submit_lead só após resposta de /api/leads, com prop leadSaveStatus
- Emitir unlock_full_result ao abrir resultado completo
- Emitir checkout_start no CheckoutButton com plan, price, source
SUCCESS: os 7 eventos aparecem no PostHog em teste manual do fluxo completo
DEP: nenhuma
```

## P1 — Produto / Simulador

```
## TASK-4 · 🔴 · Frontend
FILE: src/types/tributario.ts + /api/simular + src/components/resultado/PartialCnaeResults.tsx (novo) + src/components/simulador/SimulatorSection.tsx:412
PROBLEM: CNAE oficial sem curadoria vira beco sem saída (bloqueio em SimulatorSection.tsx:128 e :412).
ACTION:
- Criar tipo ResultadoSimulacaoParcial em tributario.ts
- /api/simular: CNAE oficial sem curadoria retorna teto/projeção/risco + status 'partial_cnae_pending'
- Criar PartialCnaeResults.tsx
- Botão vira "Ver teto parcial" quando cnaePendente
- CTA "Avisar quando este CNAE estiver completo"
SUCCESS: CNAE sem curadoria exibe resultado parcial de teto, sem bloqueio
DEP: nenhuma
```

```
## TASK-5 · 🟡 · Frontend
FILE: src/components/simulador/CnaeAutocomplete.tsx:210
PROBLEM: Busca CNAE sem match não explica restrição de ocupação MEI.
ACTION:
- Empty-state: "Nem toda atividade é permitida ao MEI; busque por código ou descrição oficial"
- Adicionar links /cnae e /aprenda/quando-sair-do-mei
- Adicionar CTA "Sugerir CNAE"
SUCCESS: busca sem resultado exibe mensagem + links, não vazio mudo
DEP: nenhuma
```

```
## TASK-6 · 🟡 · Frontend
FILE: src/components/resultado/EmailGate.tsx:14
PROBLEM: Lista textual do gate parece igual ao resultado grátis.
ACTION:
- Substituir lista por preview visual: mini barras dos regimes via resultado.comparativo
- Aplicar blur/lock nos cards "Comparativo completo", "Fator R interativo", "Relatório"
- Promessa do gate visualmente distinta do resultado grátis
SUCCESS: tela do gate renderiza preview visual com cards bloqueados
DEP: nenhuma
```

```
## TASK-7 · 🟡 · Frontend
FILE: src/components/simulador/* + src/components/resultado/*
PROBLEM: Layout mobile do simulador não validado.
ACTION:
- Validar 390px: busca CNAE, sliders, botões de mês, gate, resultado
- Corrigir touch targets < 44px
- overflow-x:hidden só se não mascarar layout quebrado
SUCCESS: fluxo completável em 390px sem overflow; Lighthouse mobile rodado
DEP: nenhuma
```

## P2 — Higiene Técnica / SEO

```
## TASK-8 · 🟡 · SEO
FILE: src/app/page.tsx:98
PROBLEM: JSON-LD existe mas sem dados legais/SoftwareApplication; artigos sem ArticleJsonLd.
ACTION:
- Validar schema atual no Rich Results
- Adicionar sameAs, dados legais reais e SoftwareApplication
- Garantir ArticleJsonLd nas páginas de artigo
SUCCESS: Rich Results Test valida sem erro, com SoftwareApplication e dados legais
DEP: TASK-2
```

```
## TASK-9 · 🟡 · SEO
FILE: metadata de src/app/api-docs, src/app/privacidade, src/app/termos
PROBLEM: Descriptions curtas em páginas indexadas.
ACTION:
- Reescrever descriptions de api-docs, privacidade, termos
- privacidade e termos: robots { index: false }
- api-docs: indexar só se API pública for estratégia
SUCCESS: cada página tem description 150–160 chars OU noindex aplicado
DEP: nenhuma
```

```
## TASK-10 · 🟢 · Conteúdo
FILE: src/app/aprenda/limite-mei-2026/page.tsx (novo) + src/app/aprenda/mei-estourou-o-teto/page.tsx (novo) + src/app/aprenda/page.tsx:25 + src/app/sitemap.ts:17
PROBLEM: Faltam 2 das 5 páginas do cluster (3 já existem).
ACTION:
- Criar /aprenda/limite-mei-2026 e /aprenda/mei-estourou-o-teto
- Atualizar ARTIGOS em aprenda/page.tsx:25
- Atualizar LEARNING_PAGES em sitemap.ts:17
SUCCESS: 2 rotas novas retornam 200 (>300 palavras) e estão no sitemap
DEP: nenhuma
```

```
## TASK-11 · 🟢 · Conteúdo
FILE: src/app/metodologia/page.tsx (novo)
PROBLEM: Sem página de metodologia com fontes e versão do motor.
ACTION:
- Criar /metodologia: versão do motor, fontes oficiais, limites conhecidos, escopo de estimativa
- Linkar do resultado, footer e disclaimer
SUCCESS: /metodologia retorna 200 e é linkada do resultado e footer
DEP: TASK-1
```

```
## TASK-12 · 🟢 · Segurança
FILE: src/lib/security/csp.ts:5
PROBLEM: CSP permite style-src 'unsafe-inline'; projeto usa muito style inline.
ACTION:
- Migrar estilos inline críticos para classes/CSS primeiro
- Só depois remover 'unsafe-inline' de style-src em csp.ts
SUCCESS: CSP sem 'unsafe-inline' e site renderiza sem violação no console
DEP: TASK-1, TASK-4, TASK-6 (executar por último)
```

```
TOTAL: 12 tasks · 4🔴 críticas · 5🟡 importantes · 3🟢 melhorias · estimativa: G
```

---
STATUS EXECUÇÃO (2026-05-16): WIP codex stashado em stash@{0}. Branch claude/critical-tasks-conversion-trust. Implementando 🔴 via TDD (vitest).
