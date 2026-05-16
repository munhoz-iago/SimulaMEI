# tasks-simulamei-2026-05-16

## STATUS DE EXECUÇÃO (2026-05-16)

Branch `claude/critical-tasks-conversion-trust` (a partir de `c6fb0d4`).
WIP da auditoria codex preservado em `git stash` (não commitado).
Test runner: vitest. Suíte: 175 pass / 1 fail **pré-existente e de infra**
(`/api/simular` 500 — precisa Supabase/rate-limit; provado em baseline,
não relacionado a estas mudanças).

| Task | Estado | Commits |
|---|---|---|
| TASK-3 | ✅ feito (corrigido — ver nota) | `1f864f7`, `ec98631` |
| TASK-2 | ✅ feito | `f202979`, `ec98631` |
| TASK-1 | ✅ feito (3 superfícies) | `012f2f1`, `d8dafe0` |
| TASK-4 | ⏳ reanalisado — frontend-only (ver bloco) | — |

Cada item feito via TDD (RED→GREEN), typecheck limpo nos arquivos tocados.

> **Reanálise de coerência/dedup (pedida explicitamente):** TASK-3 e TASK-4
> estavam majoritariamente erradas contra o código. Corrigidas antes de
> executar. Detalhe em cada bloco.

---

```
## CONTEXT
STACK: Next.js App Router + Vercel + PostHog + Supabase Auth + Stripe
AUTH: login em src/app/auth/login; registro em src/app/auth/registro
INFRA: deploy Vercel; motor versionado (TAX_RULE_VERSION=BR-MEI-SN-2026-04-28); vitest
JÁ FEITO (não recriar): JSON-LD base src/app/page.tsx · PostHog opt-out default PostHogProvider.tsx:34 · skip link HomeClient.tsx:37 · FONTES_FISCAIS em lib/tributario/oportunidades/fontes.ts · classificacaoTributaria 'curada'|'pendente' já em CnaeInfo · getCnae() já retorna pendente c/ fallback Anexo III
AÇÃO DO DONO: setar em prod NEXT_PUBLIC_LEGAL_ENTITY_NAME / _TAX_ID / _CONTACT_EMAIL (senão TASK-2 cai no fallback "Operado por SimulaMEI")
```

## P0 — Receita, Confiança e Medição

```
## TASK-1 · 🔴 · Trust · ✅ FEITO
FILE: src/components/resultado/TaxSourceNote.tsx (novo, +teste) + PartialResults.tsx + FullResults.tsx + TabelaDAS.tsx
FEITO: formatTaxSourceLine (puro, testado) + TaxSourceNote; inserido nas 3 superfícies de resultado.
DEDUP: NÃO criado src/lib/tributario/fontes.ts — reusado FONTES_FISCAIS existente.
```

```
## TASK-2 · 🔴 · Trust · ✅ FEITO
FILE: src/constants/site.ts (+teste) + Footer.tsx + EmailGate.tsx
FEITO: resolveLegalIdentity/getLegalIdentity env-driven (puro, testado); render footer + gate.
REGRA: nunca fabrica CNPJ; fallback honesto "Operado por <nome>". Fonte única (site.ts).
```

```
## TASK-3 · 🔴 · Analytics · ✅ FEITO (CORRIGIDO)
FILE: src/lib/analytics/events.ts (+teste) + EmailGate.tsx
SPEC ERRADA: renomear 7 eventos + criar view_home/view_result/unlock_full_result.
REALIDADE: $pageview já capturado (dup); taxonomia coerente usada em 6 arquivos;
  rename quebraria histórico PostHog.
FEITO (aditivo): buildEmailCapturedProps + LeadSaveStatus; email_captured agora
  carrega leadSaveStatus real do /api/leads (antes o sucesso era descartado).
```

## P1 — Produto / Simulador

```
## TASK-4 · 🔴 · Frontend · ⏳ REANALISADO (frontend-only)
FILE: src/components/simulador/SimulatorSection.tsx + src/components/resultado/CnaePendenteNotice.tsx (novo)
SPEC ERRADA (over-engineered): criar ResultadoSimulacaoParcial + branch /api/simular
  + PartialCnaeResults + mudar motor. TUDO desnecessário:
  - getCnae() (cnae.ts:80) já retorna CnaeInfo classificacaoTributaria:'pendente'
    com fallback conservador Anexo III
  - /api/simular:125 NÃO dá 400 p/ pendente (getCnae truthy) — API já responde
  - motor já retorna ResultadoSimulacao completo (Anexo/FatorR conservadores;
    teto/projeção/risco EXATOS)
  - beco sem saída é 100% frontend: SimulatorSection.tsx:60 cnaePendente,
    bloqueio em :128 (handleSimular) e :412 (botão disabled)
PROBLEM: SimulatorSection recusa enviar CNAE pendente (beco frontend).
ACTION (mínima, dedup-safe):
- Extrair gate puro testável: pendente NÃO bloqueia; gate = apenas !cnae
- Remover cnaePendente das condições em handleSimular:128 e botão :412
- Criar CnaePendenteNotice (banner: teto/projeção exatos; Anexo/FatorR
  estimativa conservadora; CTA "avisar quando curado") — render JUNTO ao
  resultado normal quando classificacaoTributaria==='pendente'
- NÃO criar PartialResults paralelo; NÃO tocar tipo/API/motor
SUCCESS: CNAE pendente → simula e mostra resultado + notice; teste do gate verde
DEP: nenhuma
```

```
## TASK-5 · 🟡 · Frontend
FILE: src/components/simulador/CnaeAutocomplete.tsx:210
PROBLEM: Busca CNAE sem match não explica restrição de ocupação MEI.
ACTION: empty-state explicando ocupações MEI; links /cnae e /aprenda/quando-sair-do-mei; CTA "Sugerir CNAE"
SUCCESS: busca sem resultado exibe mensagem + links
DEP: nenhuma
```

```
## TASK-6 · 🟡 · Frontend
FILE: src/components/resultado/EmailGate.tsx
PROBLEM: Lista textual do gate parece igual ao resultado grátis.
ACTION: preview visual (mini barras via resultado.comparativo) + blur/lock nos cards
SUCCESS: gate exibe preview visual com cards bloqueados
DEP: nenhuma
```

```
## TASK-7 · 🟡 · Frontend
FILE: src/components/simulador/* + src/components/resultado/*
PROBLEM: Layout mobile do simulador não validado.
ACTION: validar 390px (slider/CNAE/mês/gate/resultado); touch targets <44px
SUCCESS: fluxo completável em 390px sem overflow
DEP: nenhuma
```

## P2 — Higiene Técnica / SEO

```
## TASK-8 · 🟡 · SEO
FILE: src/app/page.tsx
PROBLEM: JSON-LD existe mas sem dados legais/SoftwareApplication.
ACTION: validar Rich Results; +sameAs, dados legais, SoftwareApplication; ArticleJsonLd nos artigos
SUCCESS: Rich Results sem erro
DEP: TASK-2
```

```
## TASK-9 · 🟡 · SEO
FILE: metadata de src/app/api-docs, privacidade, termos
PROBLEM: Descriptions curtas em páginas indexadas.
ACTION: reescrever; privacidade+termos robots index:false
SUCCESS: description 150–160 ou noindex
DEP: nenhuma
```

```
## TASK-10 · 🟢 · Conteúdo
FILE: src/app/aprenda/limite-mei-2026 + mei-estourou-o-teto (novos) + aprenda/page.tsx:25 + sitemap.ts:17
PROBLEM: Faltam 2 das 5 páginas do cluster (3 já existem).
ACTION: criar 2 rotas; atualizar ARTIGOS e LEARNING_PAGES
SUCCESS: rotas 200 (>300 palavras) no sitemap
DEP: nenhuma
```

```
## TASK-11 · 🟢 · Conteúdo
FILE: src/app/metodologia/page.tsx (novo)
PROBLEM: Sem página de metodologia.
ACTION: criar /metodologia (versão motor, fontes, limites); linkar do resultado/footer
SUCCESS: /metodologia 200 e linkada
DEP: TASK-1
```

```
## TASK-12 · 🟢 · Segurança
FILE: src/lib/security/csp.ts:5
PROBLEM: CSP permite style-src 'unsafe-inline'; muito style inline no projeto.
ACTION: migrar estilos inline críticos p/ classes; depois remover 'unsafe-inline'
SUCCESS: CSP sem 'unsafe-inline' e sem violação
DEP: TASK-1, TASK-4, TASK-6 (por último)
```

```
TOTAL: 12 tasks · 3🔴 feitas (1,2,3) · 1🔴 pendente reanalisada (4) · 5🟡 · 3🟢 · estimativa restante: M
```
