import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { TAX_RULE_VERSION } from '@/lib/tributario'

export const metadata = {
  title: 'API Docs — SimulaMEI',
  description:
    'Documentação da API pública do SimulaMEI: simule teto MEI, Fator R e Anexo do Simples Nacional via REST e integre a apuração tributária ao seu sistema contábil.',
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: 'var(--mono)', fontSize: 13,
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 4, padding: '2px 6px', color: 'var(--lime)',
    }}>
      {children}
    </code>
  )
}

function Pre({ children, lang = 'json' }: { children: string; lang?: string }) {
  return (
    <pre data-lang={lang} style={{
      background: 'var(--bg1)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px 20px',
      fontFamily: 'var(--mono)', fontSize: 13,
      overflowX: 'auto', marginBottom: 20, lineHeight: 1.6,
      color: 'var(--text1)',
    }}>
      <code>{children.trim()}</code>
    </pre>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text1)', marginBottom: 12, marginTop: 40 }}>{children}</h2>
}

function H3({ children, method, path }: { children?: React.ReactNode; method?: string; path?: string }) {
  const METHOD_COLOR: Record<string, string> = {
    POST: 'var(--lime)', GET: 'var(--blue)', DELETE: 'var(--red)',
  }
  return (
    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 10, marginTop: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
      {method && (
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
          color: METHOD_COLOR[method] ?? 'var(--text2)',
          background: (METHOD_COLOR[method] ?? 'var(--text2)') + '18',
          border: `1px solid ${(METHOD_COLOR[method] ?? 'var(--text2)')}40`,
          borderRadius: 4, padding: '2px 8px',
        }}>
          {method}
        </span>
      )}
      {path && <Code>{path}</Code>}
      {children}
    </h3>
  )
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color,
      background: color + '18', border: `1px solid ${color}40`,
      borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--mono)',
    }}>
      {children}
    </span>
  )
}

function ParamRow({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
  return (
    <tr>
      <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--lime)' }}>{name}</td>
      <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--blue)' }}>{type}</td>
      <td style={{ padding: '8px 12px', fontSize: 12 }}>
        {required ? <Badge color="var(--orange)">obrigatório</Badge> : <span style={{ color: 'var(--text3)' }}>opcional</span>}
      </td>
      <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text2)' }}>{desc}</td>
    </tr>
  )
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 20 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <thead>
          <tr style={{ background: 'var(--bg2)' }}>
            {['Parâmetro', 'Tipo', 'Req?', 'Descrição'].map(h => (
              <th key={h} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text2)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export default function ApiDocsPage() {
  const baseUrl = 'https://simulamei.com.br/api'

  return (
    <StaticPageLayout
      title="API Docs"
      subtitle={`Motor tributário ${TAX_RULE_VERSION} · Base URL: ${baseUrl}`}
    >
      {/* Status */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32,
        background: 'rgba(200,241,53,0.08)', border: '1px solid rgba(200,241,53,0.2)',
        borderRadius: 'var(--radius)', padding: '8px 14px',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)' }} />
        <span style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 600 }}>Especificação v1</span>
        <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>· beta privado</span>
      </div>

      <H2>Autenticação</H2>
      <p style={{ marginBottom: 16 }}>
        A API para contadores usa API Key no header <Code>Authorization</Code> no formato Bearer.
        As chaves são armazenadas apenas como hash no servidor.
      </p>
      <Pre>{`curl "${baseUrl}/contadores/simulate?faturamentoAcumulado=54000&mesAtual=4&cnae=6201-5%2F01&folhaMensal=2500&tipoMei=geral" \\
  -H "Authorization: Bearer smei_sua_chave_aqui"`}</Pre>

      <H2>Rate Limiting Planejado</H2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 28, border: '1px solid var(--border)' }}>
        <thead>
          <tr style={{ background: 'var(--bg2)' }}>
            {['Plano', 'Req/dia', 'Req/mês', 'Preço'].map(h => (
              <th key={h} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text2)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ['Free', '100', '1.000', 'Grátis'],
            ['Pro', '10.000', '500.000', 'R$ 49/mês'],
          ].map(([plano, dia, mes, preco]) => (
            <tr key={plano}>
              <td style={{ padding: '8px 14px', fontWeight: 600, color: plano === 'Pro' ? 'var(--lime)' : 'var(--text1)' }}>{plano}</td>
              <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 13 }}>{dia}</td>
              <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 13 }}>{mes}</td>
              <td style={{ padding: '8px 14px', fontSize: 13, color: 'var(--text2)' }}>{preco}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginBottom: 28, fontSize: 13, color: 'var(--text3)' }}>
        Headers de resposta: <Code>X-RateLimit-Limit</Code>, <Code>X-RateLimit-Remaining</Code>, <Code>X-RateLimit-Reset</Code>.
      </p>

      {/* ── Endpoints ── */}
      <H2>Endpoints</H2>

      {/* GET /contadores/simulate */}
      <H3 method="GET" path="/contadores/simulate" />
      <p style={{ marginBottom: 16 }}>
        Executa a simulação tributária completa. Retorna alerta de teto, Fator R, Anexo provável
        e comparativo de regimes.
      </p>
      <H3>Parâmetros da query string</H3>
      <Table>
        <ParamRow name="faturamentoAcumulado" type="number" required desc="Faturamento acumulado no ano até o mês atual (ex: 54000)" />
        <ParamRow name="mesAtual" type="number" required desc="Mês atual do calendário (1–12)" />
        <ParamRow name="cnae" type="string" required desc="Código CNAE com máscara (ex: '6201-5/01')" />
        <ParamRow name="folhaMensal" type="number" required desc="Valor mensal da folha de pró-labore/salários em reais" />
        <ParamRow name="tipoMei" type="string" required desc="'geral' ou 'caminhoneiro'" />
      </Table>
      <Pre lang="bash">{`curl "${baseUrl}/contadores/simulate?faturamentoAcumulado=54000&mesAtual=4&cnae=6201-5%2F01&folhaMensal=2500&tipoMei=geral" \\
  -H "Authorization: Bearer smei_sua_chave_aqui"`}</Pre>
      <p style={{ marginBottom: 8, fontSize: 13, color: 'var(--text2)' }}>Resposta (200 OK):</p>
      <Pre>{`{
  "entrada": { "faturamentoAcumulado": 54000, "mesAtual": 4, "cnae": "6201-5/01", ... },
  "alertaTeto": {
    "projecaoAnual": 162000,
    "tetoAnual": 81000,
    "percentualUtilizado": 98.77,
    "cenario": "dentro_limite"
  },
  "fatorR": {
    "fatorR": 0.375,
    "fatorRPercent": 37.5,
    "atingeMinimo": true,
    "anexoResultante": "III",
    "proLaboreMinimo": 1867.5,
    "economiaAnual": 7600
  },
  "anexoAtual": "III",
  "comparativo": {
    "simplesAnexoAtual": { "aliquotaEfetiva": 0.06, "dasAnual": 4800 },
    "presumido": { "total": 18240, "aliquotaEfetiva": 0.228 },
    "real": { "total": 11776, "aliquotaEfetiva": 0.1472 },
    "melhorRegime": "simplesAtual",
    "economiaVsMelhor": 0
  },
  "taxRuleVersion": "${TAX_RULE_VERSION}",
  "geradoEm": "2026-04-29T12:00:00.000Z"
}`}</Pre>

      {/* GET /cnae */}
      <H3 method="GET" path="/cnae" />
      <p style={{ marginBottom: 16 }}>
        Busca CNAEs por texto. Útil para autocomplete.
      </p>
      <Table>
        <ParamRow name="q" type="string" required desc="Texto de busca (mínimo 2 caracteres)" />
        <ParamRow name="limit" type="number" desc="Máximo de resultados (padrão: 10, máx: 50)" />
      </Table>
      <Pre>{`GET ${baseUrl}/cnae?q=programas+computador&limit=5

// Resposta
{
  "results": [
    {
      "cnae": "6201-5/01",
      "descricao": "Desenvolvimento de programas de computador sob encomenda",
      "anexoPadrao": "V",
      "elegivelFatorR": true,
      "categoria": "ti_consultoria"
    }
  ],
  "total": 1
}`}</Pre>

      {/* GET /cnae/:codigo */}
      <H3 method="GET" path="/cnae/:codigo" />
      <p style={{ marginBottom: 16 }}>Retorna dados detalhados de um CNAE específico.</p>
      <Pre>{`GET ${baseUrl}/cnae/6201-5%2F01

// Resposta
{
  "cnae": "6201-5/01",
  "descricao": "Desenvolvimento de programas de computador sob encomenda",
  "anexoPadrao": "V",
  "elegivelFatorR": true,
  "categoria": "ti_consultoria"
}`}</Pre>

      {/* GET /teto */}
      <H3 method="GET" path="/teto" />
      <p style={{ marginBottom: 16 }}>Retorna os limites vigentes do MEI.</p>
      <Pre>{`GET ${baseUrl}/teto

// Resposta
{
  "taxRuleVersion": "${TAX_RULE_VERSION}",
  "limites": {
    "geral":        { "anual": 81000, "mensalProporcional": 6750 },
    "caminhoneiro": { "anual": 251600, "mensalProporcional": 20966.67 }
  },
  "fatorRMinimo": 0.28,
  "vigenciaDesde": "2026-01-01"
}`}</Pre>

      {/* Erros */}
      <H2>Erros</H2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, border: '1px solid var(--border)' }}>
        <thead>
          <tr style={{ background: 'var(--bg2)' }}>
            {['Status', 'Código', 'Descrição'].map(h => (
              <th key={h} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text2)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            ['400', 'invalid_params', 'Parâmetros ausentes ou com formato incorreto'],
            ['401', 'missing_api_key', 'Header Authorization Bearer ausente ou inválido'],
            ['403', 'invalid_api_key', 'Chave inválida, revogada ou de outro ambiente'],
            ['429', 'rate_limit_exceeded', 'Limite de requisições atingido. Ver X-RateLimit-Reset'],
            ['500', 'internal_error', 'Erro interno — abra uma issue no GitHub'],
          ].map(([status, code, desc]) => (
            <tr key={status} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 13, color: parseInt(status) >= 500 ? 'var(--red)' : parseInt(status) >= 400 ? 'var(--orange)' : 'var(--text1)' }}>{status}</td>
              <td style={{ padding: '8px 14px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--blue)' }}>{code}</td>
              <td style={{ padding: '8px 14px', fontSize: 13, color: 'var(--text2)' }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H2>SDKs e exemplos</H2>
      <p style={{ marginBottom: 16 }}>Exemplos de integração disponíveis no repositório:</p>
      <Pre>{`# Node.js / TypeScript
npm install simulamei-sdk

import { SimulaMEI } from 'simulamei-sdk'
const client = new SimulaMEI({ apiKey: process.env.SIMULAMEI_API_KEY })
const resultado = await client.simular({ faturamentoAcumulado: 54000, mesAtual: 4, cnae: '6201-5/01', folhaMensal: 2500, tipoMei: 'geral' })

# Python (em breve)
# pip install simulamei`}</Pre>

      <div style={{
        marginTop: 32, padding: '20px 24px',
        background: 'var(--bg1)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text2)',
      }}>
        A API pública ainda está em <strong style={{ color: 'var(--yellow)' }}>beta privado</strong>.
        Para solicitar acesso antecipado, envie um e-mail para{' '}
        <a href="mailto:iagomunhoz48@gmail.com" style={{ color: 'var(--lime)' }}>iagomunhoz48@gmail.com</a>
        {' '}com seu caso de uso.
      </div>
    </StaticPageLayout>
  )
}
