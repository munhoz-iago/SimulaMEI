# tasks-simulamei-2026-05-16

## STATUS DE EXECUÇÃO (2026-05-16)

Branch `claude/critical-tasks-conversion-trust` (a partir de `c6fb0d4`).
WIP da auditoria codex preservado em `git stash` (não commitado).
Test runner: vitest. Suíte: 184 pass / 1 fail **pré-existente e de infra**
(`/api/simular` 500 — precisa Supabase/rate-limit; provado em baseline,
não relacionado a estas mudanças).

| Task | Estado |
|---|---|
| TASK-1 Trust (fonte) | ✅ feito — 3 superfícies + fonte por valor |
| TASK-2 Identidade | ✅ feito — env-driven + .env.example |
| TASK-3 Analytics | ✅ feito (corrigido — aditivo, sem rename) |
| TASK-4 CNAE pendente | ✅ feito — fronteira fiscal (frontend-only) |
| TASK-5 Empty-state CNAE | ✅ feito |
| TASK-6 Gate visual | ✅ feito — preview locked |
| TASK-8 JSON-LD | ✅ feito — dados legais (WebApplication já cobria) |
| TASK-9 Meta/noindex | ✅ feito |
| TASK-10 Conteúdo | ✅ feito — 2 páginas (revisar prosa fiscal) |
| TASK-11 Metodologia | ✅ feito |
| TASK-7 Mobile | 📋 review documentado — validação visual pendente (dono) |
| TASK-12 CSP | ✅ decisão documentada (sem big-bang) |

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
  - motor retorna ResultadoSimulacao completo MAS com Anexo/FatorR em
    FALLBACK conservador (anexoPadrao:'III', elegivelFatorR:false) —
    NÃO curado. teto/projeção/risco são EXATOS (independem de curadoria).
  - beco sem saída é 100% frontend: SimulatorSection.tsx:60 cnaePendente,
    bloqueio em :128 (handleSimular) e :412 (botão disabled)
RISCO FISCAL (corrigido): só desbloquear e mostrar o resultado completo
  exibe Anexo/alíquota/DAS NÃO CURADOS como se fossem confiáveis — pior
  que bloquear num produto fiscal. Precisa de FRONTEIRA, não tipo gigante.
PROBLEM: SimulatorSection recusa enviar CNAE pendente (beco frontend);
  e o resultado completo não pode ser exibido como confiável p/ pendente.
ACTION (mínima, dedup-safe, com fronteira fiscal):
- Extrair gate puro testável: pendente NÃO bloqueia; gate = apenas !cnae
- Remover cnaePendente das condições em handleSimular:128 e botão :412
- Quando classificacaoTributaria==='pendente': exibir SOMENTE teto/
  projeção/risco (exatos). SUPRIMIR/travar os cards de Anexo, alíquota,
  DAS e Fator R (não renderizar fallback conservador como confiável).
- CnaePendenteNotice: explica que teto é exato e Anexo/Fator R ficam
  indisponíveis até curadoria; CTA "avisar quando curado"
- NÃO criar PartialResults paralelo; NÃO tocar tipo/API/motor.
  A fronteira é de RENDER (que cards mostrar), não de cálculo.
SUCCESS: CNAE pendente → simula, mostra só teto/projeção + notice,
  Anexo/Fator R suprimidos; teste do gate e do filtro de cards verdes
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
TOTAL: 12 tasks · todas endereçadas · 1 review documentado (TASK-7) · suíte 184/1-infra
```

---

## RODADA 2 — execução de todas as pendentes (2026-05-16)

10 tasks implementadas via TDD/coerência + commits atômicos. 2 tratadas
com ressalva honesta (anunciadas antes de começar):

### TASK-7 — review responsivo (NÃO há mudança de código)

Limitação real: não consigo validar render em 390px (Chrome não reduz
viewport abaixo do mínimo; sem device emulation). **Não editei CSS às
cegas** num `responsive.css` tuned que não consigo ver — seria violar
verify-before-completion.

Achado: a camada responsiva **existe e é deliberada** (`src/app/styles/
responsive.css`): `.sim-grid/.gate-grid/.full-grid/.res-grid` colapsam
p/ 1 coluna ≤900px; `.mes-grid`, `.prolabore-toggle-row`,
`.full-results-actions` tratados ≤480px. TabelaDAS usa `overflow-x:auto`
intencional.

**Pendente de validação visual do dono em 390px real:**
- Touch targets <44px: linhas do dropdown CNAE (`CnaeRow` ~36px), links
  "ver ficha"/mailto pequenos, thumb do slider.
- Slider e dropdown CNAE no toque (interação, precisa device).
- Overflow horizontal a 390px exato (banner de resultado / MonoVal).

### TASK-12 — CSP via segura (decisão documentada, sem big-bang)

`script-src` (vetor real de XSS) **já tem nonce por requisição**. Só
`style-src` tem `'unsafe-inline'`, e o codebase usa `style={{ }}`
pervasivo — remover = refactor grande de alto risco visual. Implementado
como **decisão documentada em `csp.ts`** (comentário; zero mudança de
comportamento; csp.test.ts segue verde). Endurecer fica para depois da
migração de estilos inline críticos.

### Ações do dono

1. Setar em prod `NEXT_PUBLIC_LEGAL_ENTITY_NAME` / `_TAX_ID` /
   `_CONTACT_EMAIL` (senão identidade cai no fallback).
2. Validação visual mobile 390px (itens TASK-7 acima).
3. Revisão de contador na prosa fiscal das 2 páginas novas (TASK-10).
4. Fix do teste pré-existente `/api/simular` (mock `next/cache` +
   supabase) — independente deste trabalho.
