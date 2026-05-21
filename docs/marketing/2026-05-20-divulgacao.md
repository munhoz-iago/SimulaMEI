# SimulaMEI — Kit de divulgação 2026-05-20

> Material pronto para virar post. Cada ângulo é um diferencial **observável no produto** (não promessa). Texto em PT-BR, tom técnico-honesto.
>
> **Versão do motor:** `BR-MEI-SN-2026-04-28` · **Suíte:** 272 testes verdes em 59 arquivos · **Stack:** Next 16 + React 19 + Supabase + Stripe + Vercel · **Base CNAE:** 1.331 ocupações MEI oficiais.

---

## 1. Tese de posicionamento (use isto antes de qualquer post)

> **SimulaMEI é o simulador fiscal que mostra a fonte de cada número e admite o que não sabe.**

Em produto fiscal, o vetor de credibilidade não é "calcula rápido" — é **rastreabilidade** (de onde veio cada valor) e **honestidade de fronteira** (o que o motor *não* pode afirmar). Foi nisso que o produto avançou nas últimas duas semanas.

---

## 2. O que mudou (em uma frase cada)

1. **Fonte por valor.** Cada DAS, alíquota e Anexo no resultado aponta a norma exata. Não tem "trust me bro".
2. **Fronteira fiscal real.** CNAE sem curadoria → mostra teto e projeção (exatos) e **bloqueia** Anexo/Fator R em vez de chutar um fallback como autoridade.
3. **Erro fiscal silencioso corrigido.** Quando Fator R < 28%, a regra é **Anexo V** — quase nenhum simulador mostra isso direito. O motor agora aplica e rotula como tal.
4. **PDF a R$ 9,90, com preview do que se compra.** Era R$ 29 e sem preview. Hoje custa R$ 9,90, mostra um preview travado **com os dados reais do usuário**, e o PDF tem template novo (fonte Space Grotesk, fontes citadas, custo por regime).
5. **Fim do PDF vitalício.** Acesso por *fingerprint* do conteúdo: cada simulação distinta → uma compra. Justo para o usuário, sustentável para o produto.
6. **Identidade legal honesta.** Footer/relatório mostram a entidade legal real (env-driven). Sem CNPJ inventado.
7. **Dashboard decision-first.** Saiu da "vitrine de KPI" para "te conto o que decidir agora": Anexo rotulado por regime, "margem confortável" gated pela projeção, procedência da projeção exibida.
8. **/metodologia público.** Versão do motor, fontes consultadas, limites declarados. Página que você manda para o contador antes de discutir.

---

## 3. Posts prontos para colar

### 3.1 — LinkedIn longo (story do bug fiscal)

> Achei um bug silencioso no SimulaMEI essa semana — e provavelmente o mesmo bug está em metade dos simuladores MEI/Simples que você usa.
>
> **Regra (Res. CGSN 140/2018, art. 25-A):** uma atividade de serviço elegível ao Fator R com FR < 28% **deve ser tributada pelo Anexo V**, não pelo III.
>
> No nosso monitor de alertas, eu estava rotulando como "Anexo III" qualquer caso em que a categoria curada era III, **mesmo quando o Fator R do mês caía abaixo de 28%**. O DAS estava correto, mas o rótulo mentia.
>
> Corrigido em 6531851. Suíte cobre o caso. Dashboard agora diz "Anexo V aplicado (Fator R abaixo de 28%)" em vez do III silencioso.
>
> Detalhe: o erro só apareceu porque insistimos em **mostrar a fonte de cada número** — quando você bota o art. 25-A ao lado do rótulo, a inconsistência grita.
>
> Moral: em produto fiscal, transparência radical não é só ética. É **debug**.
>
> #fiscal #MEI #SimplesNacional #produto

---

### 3.2 — Twitter/X thread (5 tweets)

**(1/5)** A coisa mais difícil em construir um simulador fiscal honesto não é o cálculo. É admitir o que o motor **não pode** afirmar.

**(2/5)** Exemplo: um CNAE que não passou pela curadoria do nosso time. A escolha fácil é cair num Anexo padrão (III) "para não travar o fluxo". É o que quase todo simulador faz.

**(3/5)** O problema: a UI mostra "Anexo III, alíquota X%" como se fosse fato. O usuário compartilha com o contador. O contador refaz. Briga.

**(4/5)** Nossa decisão: CNAE pendente **simula** (teto e projeção são exatos), mas **suprime** Anexo e Fator R. Aparece um aviso explicando que essa parte está aguardando curadoria.

**(5/5)** Resultado prático: menos cards, mas zero números fictícios apresentados como autoridade. Em produto fiscal, **fronteira honesta vale mais que feature completa**. simulamei.com.br

---

### 3.3 — Instagram/LinkedIn carrossel (6 cards)

| # | Frente (frase) | Verso (1 linha de prova) |
|---|---|---|
| 1 | "Quanto custa o teto MEI estourar?" | Capa. Print do simulador com alerta de teto. |
| 2 | "Mostramos a fonte de cada número." | Print do bloco "Fonte: Resolução CGSN 140/2018, art. X — Anexo III". |
| 3 | "Se não conhecemos seu CNAE, dizemos isso." | Print da notice de CNAE pendente: teto exato + Anexo bloqueado. |
| 4 | "Fator R < 28% = Anexo V. Sempre." | Print do dashboard com "Anexo V aplicado". |
| 5 | "Relatório PDF: R$ 9,90, com preview real." | Print do preview travado mostrando dados do próprio usuário. |
| 6 | "1.331 CNAEs · motor versionado · 272 testes." | CTA: simulamei.com.br/metodologia |

---

### 3.4 — Story / Reels de bastidor (script de 30 s)

[Tela: editor com o teste `monitor.test.ts` rodando verde]
> "Esse teste aqui só existe porque a gente errou. Tinha um caso onde o Fator R caía abaixo de 28% e a gente mostrava Anexo III — quando a regra é Anexo V."
[Cola na URL do commit 6531851]
> "Corrigido. Mas o que importa é o porquê: a gente mostra a regra ao lado do número. Quando o número e a regra brigam, o bug aparece."
[Fade pra logo]
> "SimulaMEI. Simulador fiscal que admite o que não sabe."

---

### 3.5 — Notinha curta (Telegram/grupo de contadores)

> Pequeno update do SimulaMEI:
>
> 1. Corrigimos um caso silencioso onde Fator R < 28% saía rotulado como Anexo III. Agora rotula Anexo V (regra do art. 25-A).
> 2. CNAE pendente agora simula com fronteira fiscal: teto e projeção exibidos, Anexo/Fator R suprimidos com aviso.
> 3. Dashboard agora distingue "Anexo atual" (Simples Nacional) de "Anexo projetado" (saída do MEI).
> 4. PDF caiu para R$ 9,90 com preview dos próprios dados antes da compra.
> 5. /metodologia explica motor, fontes e limites — link bom para mandar antes de uma reunião.
>
> simulamei.com.br · feedback é ouro

---

## 4. Screenshots/ângulos a capturar (lista pro post)

- [ ] Resultado completo com o bloco de **fonte por valor** visível ao lado do DAS
- [ ] Notice de **CNAE pendente** ("teto exato · Anexo aguardando curadoria")
- [ ] Card do dashboard com **"Anexo V aplicado (Fator R abaixo de 28%)"**
- [ ] **Preview travado** do PDF mostrando dados reais do usuário com CTA R$ 9,90
- [ ] Página **/metodologia** rolando: versão do motor + lista de fontes
- [ ] Bloco "**Meus relatórios pagos**" com botão de re-download

---

## 5. Métricas para citar (verificadas hoje)

| Métrica | Valor | Onde verifico |
|---|---|---|
| Versão do motor tributário | `BR-MEI-SN-2026-04-28` | `src/lib/tributario/limitesMei.ts:7` |
| CNAEs MEI mapeados | 1.331 oficiais | `src/components/layout/HeroSection.tsx:7` |
| Testes verdes | 272 / 272 (59 arquivos) | `npm test -- --run` |
| Preço do relatório PDF | R$ 9,90 (Stripe Price LIVE) | commit `0021e02` |
| Bugs fiscais corrigidos esta semana | 4 (P0) | commits `6531851`, `bf8b16f`, `0df26b9`, `32ad81c` |
| Páginas de conteúdo no cluster MEI | 5 (3 + 2 novas) | `aprenda/` |
| Faixa de cobertura de Anexos no motor | I–V (incl. Fator R + CST) | `lib/tributario/simples.ts` |

---

## 6. Tom de voz (regras simples)

- **Mostre, não prometa.** Cada afirmação tem um print, um commit, um caminho de arquivo.
- **Admita o limite.** "CNAE pendente · Anexo aguardando curadoria" vende mais que "100% de cobertura".
- **Cite a norma.** Resolução, lei, artigo. Não é jargão — é currículo.
- **Nada de "IA mágica".** O motor é versionado, testável, auditável. É *isso* que diferencia.
- **Português direto.** Frase curta. Vírgula no lugar. Sem "potencializamos".

---

## 7. O que **não** dizer (ainda)

- "Cobertura completa de CNAEs" — temos curadoria para grande parte; **CNAE pendente continua existindo**.
- "Substitui contador" — o produto **suporta** a decisão e prepara conversa com contador.
- "Calculadora oficial da Receita" — não somos; somos calculadora **versionada e citável**.
- Roadmap não vendido (planos futuros, integração WhatsApp etc.) — só anuncie quando estiver no ar.

---

## 8. Calendário sugerido (semana atual)

| Dia | Canal | Peça | Ângulo |
|---|---|---|---|
| Hoje | LinkedIn | 3.1 (story bug fiscal) | Credibilidade técnica |
| +1 | Twitter | 3.2 (thread fronteira) | Posicionamento |
| +2 | Story | 3.4 (bastidor 30s) | Bastidor + humano |
| +3 | Carrossel | 3.3 (6 cards) | Saturação visual |
| +5 | Grupo contadores | 3.5 (notinha) | B2B direto |

---

*Doc gerado em 2026-05-20. Atualize quando shippar o próximo lote. Para o relatório técnico completo, ver `docs/superpowers/plans/2026-05-20-dashboard-decision-first.md` e Obsidian `SimulaMEI/26 - Estado Atual (2026-05-20)`.*
