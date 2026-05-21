# SimulaMEI

> **Motor fiscal educacional para Microempreendedores Individuais (MEI)**  
> Simule teto de faturamento, calcule Fator R, encontre seu CNAE e compare regimes tributários — com precisão e sem juridiquês.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]() [![Tests](https://img.shields.io/badge/tests-182%20passing-brightgreen)]() [![Coverage](https://img.shields.io/badge/coverage-80%25%2B-blue)]() [![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## O que o SimulaMEI faz

O SimulaMEI é uma ferramenta de **estimativa tributária** projetada para responder perguntas concretas que todo MEI enfrenta:

| Pergunta | Resposta do SimulaMEI |
|----------|----------------------|
| "Vou estourar o teto MEI este ano?" | Projeção linear de 12 meses com alerta de risco |
| "Meu Fator R está bom?" | Cálculo completo com análise de economia potencial |
| "Devo ficar no Simples ou mudar para Presumido?" | Comparativo lado a lado com custo total (impostos + INSS) |
| "Qual CNAE me enquadra melhor?" | Busca em 1.300+ códigos com classificação fiscal automática |

### Para quem é

**MEI Autônomo** — Pessoa física com CNPJ MEI, faturamento irregular, que precisa de respostas rápidas no celular ou notebook sem complicação técnica.

**Contador** — Profissional que gerencia carteiras de MEIs e precisa de visão consolidada, alertas automáticos e histórico de simulações por cliente.

---

## O que o sistema promete

### 1. Precisão fiscal
- Tabelas oficiais do Simples Nacional atualizadas (TAX_RULE_VERSION: 2026-04-28)
- Cálculo correto de Fator R incluindo CLT, pró-labore, INSS patronal e FGTS
- Comparativo realista: Simples vs Lucro Presumido vs Lucro Real vs CLT

### 2. Respostas rápidas
- Simulação síncrona em <50ms (motor 100% client-side quando possível)
- Interface "número antes da explicação" — resultado visível imediatamente
- Compartilhamento via link com todos os parâmetros embutidos

### 3. Transparência total
- Memória de cálculo detalhada para cada número apresentado
- Versão das regras fiscais usada em cada simulação
- Alertas honestos, não alarmistas — âmbar em vez de vermelho quando possível

### 4. Privacidade por design
- Simulações anônimas possíveis (sem cadastro)
- Dados de clientes do contador isolados por RLS (Row Level Security)
- Chaves de API com hash HMAC-SHA256, nunca armazenadas em texto plano

---

## Arquitetura do sistema

### Stack tecnológica

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 16 App Router)                          │
│  ├── React 19 + TypeScript strict                           │
│  ├── Tailwind CSS v4 (design system "Terminal")             │
│  └── Componentes Server/Client híbridos                     │
├─────────────────────────────────────────────────────────────┤
│  Backend (Edge Functions)                                   │
│  ├── Next.js Route Handlers (API)                           │
│  ├── Supabase SSR (PostgreSQL + auth)                       │
│  └── Stripe (pagamentos)                                    │
├─────────────────────────────────────────────────────────────┤
│  Motor Tributário (TypeScript puro)                         │
│  ├── Síncrono, sem I/O — roda client ou server              │
│  ├── 182 testes, 80%+ cobertura nos módulos críticos      │
│  └── Versionado: TAX_RULE_VERSION por simulação             │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de diretórios

```
src/
├── app/                    # Rotas Next.js (App Router)
│   ├── api/               # Endpoints REST
│   ├── (auth)/            # Login, registro, callbacks
│   └── ...                # Páginas públicas
├── components/
│   ├── ui/                # Primitivos (Badge, Tag, MonoVal)
│   ├── resultado/         # Cards de resultado fiscal
│   ├── simulador/         # Inputs e controles
│   ├── layout/            # Hero, nav, footer
│   └── accountant/        # Dashboard de contador
├── lib/
│   ├── tributario/        # Motor fiscal ★
│   │   ├── __tests__/     # 21 testes do motor
│   │   ├── index.ts       # Orquestrador simular()
│   │   ├── alertas.ts     # Teto MEI, projeções
│   │   ├── fatorR.ts      # Cálculo Fator R
│   │   ├── simples.ts     # Simples Nacional
│   │   ├── presumido.ts   # Lucro Presumido
│   │   ├── real.ts        # Lucro Real
│   │   └── cnae.ts        # 1.300+ códigos CNAE
│   ├── accountant/        # Lógica de escritório
│   │   ├── portfolio.ts   # Análise de carteira ★
│   │   ├── clients.ts     # CRUD de clientes
│   │   └── alerts.ts      # Alertas automáticos
│   └── supabase/          # Clientes SSR
└── types/                 # Tipagens TypeScript
```

### Motor Tributário em detalhes

```typescript
// Uso básico — retorna tudo em uma chamada
const resultado = simular({
  faturamentoAcumulado: 54_000,  // até o mês atual
  mesAtual: 4,                    // abril
  cnae: '6201-5/01',             // desenvolvimento de software
  folhaMensal: 2_500,            // pró-labore + salários
  tipoMei: 'geral',              // ou 'caminhoneiro'
})

// Retorna:
// ├── alertaTeto: projeção anual, cenário de excesso
// ├── fatorR: folha 12 meses, percentual, economia potencial
// ├── anexoAtual: III, IV ou V
// └── comparativo: Simples vs Presumido vs Real vs CLT
```

---

## Funcionalidades principais

### Para MEI autônomo

| Funcionalidade | Descrição | Estado |
|----------------|-----------|--------|
| Simulação de teto | Projeção linear + alertas 70/80/95/100% | ✅ Produção |
| Cálculo Fator R | Análise completa com pró-labore ideal | ✅ Produção |
| Comparativo de regimes | Simples vs Presumido vs Real vs CLT | ✅ Produção |
| Busca CNAE | Autocomplete em 1.300+ códigos oficiais | ✅ Produção |
| Compartilhamento | Link com parâmetros codificados | ✅ Produção |
| Relatório detalhado | PDF com memória de cálculo | 🔜 Roadmap |

### Para Contadores

| Funcionalidade | Descrição | Estado |
|----------------|-----------|--------|
| Cadastro de clientes | CRUD com validação de CNAE | ✅ Produção |
| Simulação por cliente | Histórico persistido por cliente | ✅ Produção |
| Alertas automáticos | Cron diário de teto/Fator R | ✅ Produção |
| Dashboard de carteira | Visão consolidada de risco ★ | 🚧 Implementando |
| API REST | Chave Bearer com rate limit | ✅ Produção |
| Webhooks | Notificações de mudança de anexo | 🔜 Roadmap |

★ Funcionalidade em desenvolvimento ativo

---

## Começando

### Requisitos

- Node.js 20+
- npm 10+
- Conta Supabase (projeto gratuito suficiente)
- (Opcional) Conta Stripe para pagamentos
- (Opcional) Conta Resend para emails

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-org/simulamei.git
cd simulamei

# Instale dependências
npm ci

# Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves Supabase

# Rode migrações no Supabase (SQL em supabase/migrations/)

# Inicie em modo desenvolvimento
npm run dev
# Abra http://localhost:3000
```

### Variáveis de ambiente

```bash
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (opcional, para pagamentos)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (opcional, para emails)
RESEND_API_KEY=re_...

# Segurança da API de contadores
SIMULAMEI_API_KEY_SECRET=sua_chave_secreta_para_hash
```

---

## Scripts disponíveis

```bash
npm run dev              # Servidor de desenvolvimento (porta 3000)
npm run build            # Build de produção
npm run start            # Servidor de produção (após build)
npm run lint             # ESLint — verificação de código
npm run test             # Testes unitários (Vitest)
npm run test:coverage    # Testes com relatório de cobertura
npm run cnae:check       # Verifica atualizações na tabela CNAE oficial
```

---

## CI/CD e Qualidade

### Quality Gate

Todo código que entra em `main` passa por:

1. **Lint** — ESLint com regras Next.js + TypeScript strict
2. **Testes** — 182 testes, cobertura mínima 80% em módulos tributários
3. **Type Check** — `tsc --noEmit` sem erros
4. **Build** — Next.js build sem falhas

### Deploy

- **Preview**: Vercel gera preview para cada Pull Request
- **Produção**: Deploy automático no push para `main`

### Monitoramento

- **CNAE**: Script mensal `cnae:check` compara base local com Receita Federal
- **Fiscal**: Testes de snapshot garantem que cálculos não mudam sem aviso

---

## API para Contadores

### Autenticação

Todas as requisições usam Bearer token no header:

```bash
-H "Authorization: Bearer smei_sua_chave_aqui"
```

### Endpoints

#### Simular (público via chave)

```bash
GET /api/contadores/simulate?faturamentoAcumulado=54000&mesAtual=4&cnae=6201-5%2F01&folhaMensal=2500&tipoMei=geral
```

**Resposta 200:**
```json
{
  "ok": true,
  "usage": { "used": 42, "limit": 1000 },
  "resultado": {
    "alertaTeto": { "projecaoAnual": 162000, "cenario": "dentro_limite" },
    "fatorR": { "fatorR": 0.28, "atingeMinimo": true, "economiaAnual": 7600 },
    "comparativo": { "melhorRegime": "simplesAtual", "economiaVsMelhor": 0 }
  }
}
```

#### Gerenciar clientes (autenticado)

```bash
# Listar
GET /api/accountant/clients?page=1&filter=active

# Criar
POST /api/accountant/clients
{ "nome": "Cliente Exemplo", "cnae": "6201-5/01", "tipoMei": "geral" }

# Simular para cliente
POST /api/accountant/clients/[id]/simulate
{ "faturamentoAcumulado": 54000, "mesAtual": 4, "folhaMensal": 2500 }
```

### Códigos de erro

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 400 | Parâmetros inválidos |
| 401 | Chave API ausente ou inválida |
| 429 | Limite mensal de requisições atingido |
| 500 | Erro interno (raro, logado no servidor) |

---

## Design System

O SimulaMEI segue o conceito **"The Fiscal Terminal"** — interface densa mas nunca barulhenta, inspirada em painéis de instrumentos, não em dashboards SaaS genéricos.

### Princípios

1. **Número antes da explicação** — o resultado fica no topo
2. **Confiança pelos dados** — mostra a fonte, não selos genéricos
3. **Alerta sem alarme** — âmbar com instrução, vermelho só para bloqueio

### Paleta (OKLCH)

| Token | Valor | Uso |
|-------|-------|-----|
| `--lime` | oklch(88% 0.19 126) | Ação afirmativa, confirmado |
| `--yellow` | oklch(82% 0.15 85) | Atenção, próximo do limite |
| `--orange` | oklch(73% 0.18 52) | Risco, revisão necessária |
| `--red` | oklch(66% 0.21 28) | Erro, bloqueado |
| `--blue` | oklch(68% 0.15 252) | Informativo, contexto |

Detalhes completos em [DESIGN.md](./DESIGN.md).

---

## Contribuindo

### Reportando bugs

Prefira issues com:
- Passos para reproduzir
- Valores de entrada que causam o problema
- Comportamento esperado vs observado
- TAX_RULE_VERSION da simulação (visível no resultado)

### Sugestões de features

Abra uma issue com prefixo `[Feature]` descrevendo:
- Qual problema resolve
- Quem beneficia (MEI ou Contador)
- Exemplo de uso

### Código

1. Fork o repositório
2. Crie branch: `git checkout -b feature/nome-descritivo`
3. Commit: mensagens em português, imperativo ("Adrega cálculo de...")
4. Push e abra Pull Request
5. Aguarde CI (lint + testes + build)

---

## Licença

MIT License — veja [LICENSE](./LICENSE) para detalhes.

**Nota importante**: O SimulaMEI é uma ferramenta de estimativa baseada em regras públicas da Receita Federal. Os resultados são orientativos e não substituem a análise de um contador habilitado para sua situação específica.

---

## Contato

- **Site**: https://simulamei.com.br
- **Email**: contato@simulamei.com.br
- **Issues**: https://github.com/seu-org/simulamei/issues

---

<p align="center">
  <strong>Feito com precisão fiscal e sem juridiquês.</strong>
</p>
