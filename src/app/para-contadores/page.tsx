import Image from 'next/image'
import Link from 'next/link'
import { TAX_RULE_VERSION } from '@/lib/tributario'
import { getSiteUrl } from '@/constants/site'

const PAGE_TITLE = 'SimulaMEI para Contadores — Painel de Carteira MEI'
const PAGE_DESCRIPTION = 'Monitore clientes MEI com alertas de teto, Fator R, relatórios por carteira e planos para contadores a partir de R$ 97/mês, com garantia de 7 dias e suporte.'
const PAGE_URL = `${getSiteUrl()}/para-contadores`

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    siteName: 'SimulaMEI',
    type: 'website' as const,
    locale: 'pt_BR',
    images: [
      {
        url: `${getSiteUrl()}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'SimulaMEI para Contadores',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [`${getSiteUrl()}/opengraph-image`],
  },
}

const VALUE_POINTS = [
  ['Carteira em risco', 'Veja quais clientes estão próximos do teto MEI antes da conversa virar urgência.'],
  ['Relatórios por cliente', 'Gere um material objetivo para justificar mudança de regime, pró-labore ou atenção ao CNAE.'],
  ['Alertas recorrentes', 'Use calendário fiscal, e-mail e histórico mensal para não depender de planilha manual.'],
  ['API no plano Pro', 'Integre simulação e alertas com rotinas internas do escritório quando a carteira crescer.'],
]

const PLAN_ROWS = [
  ['Starter', 'R$ 97/mês', 'Até 30 clientes', 'Dashboard, alertas e PDF por cliente'],
  ['Pro', 'R$ 247/mês', 'Até 150 clientes', 'API, CSV, histórico mensal e marca no PDF'],
  ['Enterprise', 'Sob consulta', 'Sem limite', 'Multi-seat, white-label completo, SLA e integrações'],
]

const TRUST_POINTS = [
  'Garantia de 7 dias',
  'Cancele quando quiser',
  'Sem fidelidade',
  'LGPD e consentimento explícito',
]

export default function ParaContadoresPage() {
  return (
    <main className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg0)', color: 'var(--text1)' }}>
      <header style={{
        padding: '20px 40px',
        borderBottom: '1px solid var(--border)',
        background: 'color-mix(in oklch, var(--bg0) 88%, transparent)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24,
            height: 24,
            background: 'var(--lime)',
            borderRadius: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink-on-accent)" strokeWidth="3">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
            </svg>
          </div>
          <span style={{ fontWeight: 900 }}>Simula<span style={{ color: 'var(--lime)' }}>MEI</span></span>
        </Link>
        <Link href="/#simulador" style={{ color: 'var(--text2)', fontSize: 13 }}>
          Voltar ao simulador
        </Link>
      </header>

      <section style={{ padding: '68px 0 56px' }}>
        <div
          className="section-shell accountant-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.08fr) minmax(340px, 0.92fr)',
            gap: 30,
            alignItems: 'start',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <span style={{ width: 30, height: 2, background: 'var(--orange)' }} />
              <span style={{ color: 'var(--orange)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
                Para escritórios contábeis
              </span>
            </div>
            <h1 style={{
              fontSize: 'clamp(34px, 5vw, 60px)',
              lineHeight: 1,
              letterSpacing: 0,
              maxWidth: 720,
              marginBottom: 18,
              textWrap: 'balance',
              overflowWrap: 'break-word',
            }}>
              Monitore todos os seus MEIs antes do teto virar problema.
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 16, lineHeight: 1.7, maxWidth: 680, marginBottom: 28, overflowWrap: 'break-word' }}>
              O plano contador transforma o motor fiscal do SimulaMEI em painel de carteira: clientes, alertas, Fator R, relatórios e API em um fluxo pensado para rotina contábil.
            </p>

            <div className="accountant-value-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 12, marginBottom: 26 }}>
              {VALUE_POINTS.map(([title, body]) => (
                <div key={title} className="surface-hover" style={{ border: '1px solid var(--border)', background: 'var(--bg1)', borderRadius: 'var(--radius)', padding: 18, minWidth: 0 }}>
                  <div style={{ color: 'var(--lime)', fontWeight: 900, marginBottom: 8 }}>{title}</div>
                  <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.55 }}>{body}</div>
                </div>
              ))}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: 16,
              alignItems: 'stretch',
              marginBottom: 22,
            }}>
              <figure style={{
                margin: 0,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: 'var(--bg1)',
                boxShadow: 'var(--panel-shadow)',
              }}>
                <Image
                  src="/images/painel-contador-preview.svg"
                  alt="Preview do painel contador com carteira MEI, alertas de teto e relatórios por cliente"
                  width={960}
                  height={620}
                  style={{ width: '100%', height: 'auto', minHeight: 240, objectFit: 'contain', display: 'block' }}
                />
              </figure>
              <div style={{
                border: '1px solid rgba(200,241,53,0.22)',
                background: 'rgba(200,241,53,0.06)',
                borderRadius: 'var(--radius-lg)',
                padding: 18,
                display: 'grid',
                alignContent: 'center',
                gap: 12,
              }}>
                <div style={{ color: 'var(--lime)', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>
                  Prova operacional
                </div>
                <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  O mesmo motor que já processou 18.300+ simulações vira triagem de carteira:
                  teto, Fator R, anexo provável e relatório para a conversa com o cliente.
                </p>
                <Link
                  href="#contadores-form"
                  className="pressable"
                  style={{
                    justifySelf: 'start',
                    background: 'var(--lime)',
                    color: 'var(--ink-on-accent)',
                    borderRadius: 'var(--radius)',
                    fontWeight: 900,
                    fontSize: 13,
                    padding: '8px 11px',
                    textDecoration: 'none',
                  }}
                >
                  Entrar na lista →
                </Link>
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 0 }}>
                <thead>
                  <tr style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>Plano</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>Preço</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>Carteira</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>Uso principal</th>
                  </tr>
                </thead>
                <tbody>
                  {PLAN_ROWS.map(([plan, price, limit, value]) => (
                    <tr key={plan}>
                      <td style={{ padding: '12px 14px', fontWeight: 900, color: plan === 'Pro' ? 'var(--lime)' : 'var(--text1)' }}>{plan}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: plan === 'Pro' ? 'var(--lime)' : 'var(--text2)' }}>{price}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text2)' }}>{limit}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text2)' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, marginBottom: 18 }}>
              {TRUST_POINTS.map(point => (
                <span
                  key={point}
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--bg1)',
                    borderRadius: 999,
                    color: 'var(--text2)',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '7px 10px',
                  }}
                >
                  {point}
                </span>
              ))}
            </div>

            <div style={{
              border: '1px solid var(--border)',
              background: 'var(--bg1)',
              borderRadius: 'var(--radius)',
              padding: 16,
              color: 'var(--text2)',
              fontSize: 13,
              lineHeight: 1.6,
            }}>
              <strong style={{ color: 'var(--text1)' }}>Segurança e confiança:</strong>{' '}
              dados de leads passam por consentimento LGPD; relatórios são estimativas auditáveis pelo
              motor {TAX_RULE_VERSION}; contato comercial também pode ser feito pelo formulário desta página.
            </div>
          </div>

          <aside className="instrument-panel" style={{ padding: 24, display: 'grid', gap: 20, alignContent: 'start', minWidth: 0 }}>
            <div style={{ color: 'var(--lime)', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>
              Trial Starter · 14 dias grátis
            </div>
            <h2 style={{ fontSize: 24, lineHeight: 1.15, marginBottom: 10 }}>
              Comece hoje, decida em 14 dias
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, marginBottom: 4 }}>
              Crie o escritório, cadastre seus primeiros clientes MEI e teste alertas + relatórios.
              Só cobramos se você gostar.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Cadastre até 30 clientes ativos',
                'Sem cartão · cancele quando quiser',
                'Relatórios PDF com sua marca',
                'Alertas automáticos de Fator R e teto',
              ].map((feature, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: 'var(--tint-lime-strong)',
                    border: '1px solid var(--tint-lime-border)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="3.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/onboarding/contador"
              className="pressable accountant-plan-link"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10,
                padding: '14px 16px',
                background: 'var(--lime)',
                color: 'var(--ink-on-accent)',
                borderRadius: 'var(--radius)',
                fontWeight: 900,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span>Criar conta e começar grátis</span>
            </Link>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 12 }}>
                Já quer ver os planos?
              </div>
              <Link
                href="/upgrade/contador"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '11px 14px',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text1)',
                  borderRadius: 'var(--radius)',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                  gap: 10,
                }}
              >
                <span>Comparativo Starter · Pro · Enterprise</span>
                <span style={{ fontSize: 16, color: 'var(--text3)' }}>→</span>
              </Link>
              <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
                Starter R$ 97/mês · Pro R$ 247/mês · Enterprise sob consulta
              </p>
              <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
                Garantia de 7 dias. Cancele quando quiser, sem fidelidade.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <footer style={{ padding: '24px 40px', borderTop: '1px solid var(--border)', color: 'var(--text3)', fontSize: 12 }}>
        Motor tributário {TAX_RULE_VERSION}. Estimativas para triagem, sempre com validação profissional habilitada.
      </footer>
    </main>
  )
}
