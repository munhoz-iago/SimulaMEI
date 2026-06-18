import type { Metadata } from 'next'
import Link from 'next/link'
import { TAX_RULE_VERSION } from '@/lib/tributario'
import { getSiteUrl } from '@/constants/site'

const PAGE_TITLE = 'SimulaMEI para Contadores — Vigia carteira MEI, alerta antes do teto'
const PAGE_DESCRIPTION =
  'A planilha de carteira MEI tem um custo. Cada cliente acima do teto vira desenquadramento, refaturamento, multa. O SimulaMEI vigia tudo em painel. 7 dias grátis, sem cartão.'
const PAGE_URL = `${getSiteUrl()}/para-contadores`

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    siteName: 'SimulaMEI',
    type: 'website',
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
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [`${getSiteUrl()}/opengraph-image`],
  },
}

// ── Paleta Mercury (intencionalmente fora do design system padrão) ────────────
const PALETTE = {
  bg: '#f5f3ee',          // off-white editorial
  bgAlt: '#ece8df',       // strip / sutil
  navy: '#1a2434',        // texto principal e CTA
  navyDeep: '#0f1722',    // footer
  ink: '#0f1722',
  body: '#3c4555',        // texto secundário
  muted: '#6b7280',
  rule: '#d8d3c7',        // bordas
  accent: '#c84a2a',      // acento editorial (problemas / alerts)
  good: '#2f7d52',        // semáforo verde
  warn: '#b07000',        // semáforo amarelo
  bad: '#a92e1a',         // semáforo vermelho
  cardBg: '#fffefa',
} as const

const SERIF = "Georgia, 'Times New Roman', 'Liberation Serif', serif"
const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

// ── Conteúdo ─────────────────────────────────────────────────────────────────
const PROBLEM_SOLUTION: Array<{ problem: string; solution: string }> = [
  {
    problem:
      'Descobri que o Pedro passou do teto quando ele me ligou em pânico em dezembro.',
    solution:
      'O painel mostra todo mês quem está perto, manda alerta antes do 5º dia útil, com semáforo (verde abaixo de 80%, amarelo 80 a 95%, vermelho a partir de 95%) e projeção anual.',
  },
  {
    problem:
      "Toda conversa de 'precisamos mudar o regime' começa do zero, refazendo a planilha.",
    solution:
      'Um clique gera um relatório com regime atual versus Simples (LP/LR), pró-labore mínimo e anexo III ou V por Fator R. PDF assinado pelo escritório no plano Pro.',
  },
  {
    problem:
      'Quem na minha carteira é Anexo III? Quem é V? Quem está prestes a virar pelo Fator R?',
    solution:
      'Uma coluna calcula Fator R rolling-12, sinaliza o anexo provável e dispara alerta na fronteira de 0,28. Histórico mensal por cliente.',
  },
  {
    problem:
      'Quando minha carteira passou de 50 MEIs, parei de acompanhar individual.',
    solution:
      'O Pro abre API REST, exporta CSV mensal e dispara webhook. 150 clientes inclusos no preço, Enterprise para carteiras maiores.',
  },
]

const CALLOUTS: Array<{ n: string; label: string }> = [
  { n: '1', label: 'Barra de carteira: limite do plano, ativos e folga real' },
  { n: '2', label: 'Alertas com severidade colorida e cliente afetado' },
  { n: '3', label: 'Pausados separados por plano e por motivo' },
  { n: '4', label: 'Trial badge persistente — sem cartão, sem cobrança' },
]

interface Testimonial {
  quote: string
  author: string
  role: string
}

// Vazio = não renderiza. NÃO fakear. Primeiro escritório real entra aqui.
const TESTIMONIALS: Testimonial[] = []
// Exemplo do formato (mantido como documentação, comentado):
// {
//   quote: 'A planilha sumiu da minha mesa em duas semanas.',
//   author: 'Beatriz Carvalho',
//   role: 'Contadora — Escritório Carvalho Contábil, São Paulo/SP',
// }

const PLANS: Array<{
  name: string
  price: string
  priceNote: string
  tagline: string
  features: string[]
  cta: { label: string; href: string }
  featured?: boolean
}> = [
  {
    name: 'Starter',
    price: 'R$ 97',
    priceNote: '/mês',
    tagline: 'Para escritórios começando a digitalizar a carteira.',
    features: [
      'Até 30 clientes MEI ativos',
      'Painel de carteira com semáforo de teto',
      'Alertas por e-mail antes do 5º dia útil',
      'Relatório por cliente (PDF)',
      'Suporte por e-mail',
    ],
    cta: { label: 'Começar grátis 7 dias', href: '/onboarding/contador?plan=starter' },
  },
  {
    name: 'Pro',
    price: 'R$ 247',
    priceNote: '/mês',
    tagline: 'Para escritórios que querem padronizar a operação.',
    features: [
      'Até 150 clientes MEI ativos',
      'PDF assinado com a marca do escritório',
      'API REST + exportação CSV mensal',
      'Webhook por evento (cliente em risco, mudança de anexo)',
      'Histórico mensal e fronteira de Fator R',
      'Suporte prioritário',
    ],
    cta: { label: 'Começar grátis 7 dias', href: '/onboarding/contador?plan=pro' },
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    priceNote: '',
    tagline: 'Para escritórios com carteira acima de 150 MEIs ou time multi-seat.',
    features: [
      'Carteira sem limite contratual',
      'Multi-seat com perfis e auditoria',
      'White-label completo no PDF e painel',
      'Integrações sob contrato',
      'SLA dedicado',
    ],
    cta: {
      label: 'Falar com comercial',
      href: 'mailto:contato@simulamei.com.br?subject=Plano%20Enterprise%20%E2%80%94%20Contato%20comercial',
    },
  },
]

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Como funciona o trial de 7 dias?',
    a: 'Você cria o escritório, cadastra seus clientes MEI e usa todas as funções do Starter por 7 dias. Não pedimos cartão. Se você decidir não assinar, o painel é congelado e os dados ficam preservados pelo tempo previsto na nossa política de privacidade.',
  },
  {
    q: 'Meu cliente MEI vê o painel?',
    a: 'Não. O painel é do escritório. O cliente recebe apenas o relatório que você decidir enviar (PDF), assinado pela sua marca no plano Pro. Nada do seu controle interno vai para o cliente.',
  },
  {
    q: 'Consigo importar minha lista de clientes?',
    a: 'Sim. Você pode cadastrar manualmente ou subir um CSV com nome, CNPJ, faturamento acumulado e CNAE. Quem sobe a lista no primeiro dia já vê o semáforo no segundo.',
  },
  {
    q: 'Os alertas chegam onde?',
    a: 'E-mail do contador responsável (sempre), painel (sempre), e-mail dos sócios do escritório quando configurado, e webhook no plano Pro. Não enviamos alerta para o cliente final sem você pedir.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Sem fidelidade, sem multa, sem ligação para reter. Você cancela no portal de assinatura e os dados ficam disponíveis para exportação pelo período previsto na nossa política.',
  },
  {
    q: 'Como vocês tratam LGPD?',
    a: 'O escritório é o controlador dos dados dos clientes; o SimulaMEI é operador. Coletamos somente o necessário para o cálculo fiscal, registramos consentimento explícito em campos sensíveis e nunca compartilhamos com terceiros sem instrução do escritório.',
  },
]

const TRUST_STRIP_LINE =
  'Atendendo escritórios em capitais e interior do Brasil. Os primeiros escritórios parceiros ainda estão em validação e seus nomes vão aparecer aqui assim que autorizarem.'

// Logos vazios: se nenhum autorizou, não renderiza placeholder fake.
const PARTNER_LOGOS: Array<{ name: string; src: string; alt: string }> = []

export default function ParaContadoresPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: PALETTE.bg,
        color: PALETTE.ink,
        fontFamily: SANS,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      <TopNav />
      <Hero />
      <TrustStrip />
      <ProblemSolution />
      <PanelScreenshot />
      {TESTIMONIALS.length > 0 && <TestimonialsSection items={TESTIMONIALS} />}
      <Pricing />
      <Faq />
      <Footer />
    </main>
  )
}

// ── Componentes ──────────────────────────────────────────────────────────────

function TopNav() {
  return (
    <header
      style={{
        borderBottom: `1px solid ${PALETTE.rule}`,
        background: PALETTE.bg,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '18px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            color: PALETTE.navy,
            textDecoration: 'none',
            fontFamily: SERIF,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          <span aria-hidden="true" style={{ color: PALETTE.accent }}>·</span>
          SimulaMEI
        </Link>
        <nav style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
          <Link
            href="#pricing"
            style={{
              color: PALETTE.body,
              fontSize: 14,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Planos
          </Link>
          <Link
            href="#faq"
            style={{
              color: PALETTE.body,
              fontSize: 14,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            FAQ
          </Link>
          <Link
            href="/onboarding/contador"
            style={{
              background: PALETTE.navy,
              color: PALETTE.bg,
              padding: '10px 16px',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Começar grátis
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      style={{
        padding: 'clamp(56px, 8vw, 110px) 0 clamp(40px, 6vw, 80px)',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)',
          gap: 'clamp(28px, 5vw, 64px)',
          alignItems: 'center',
        }}
        className="mercury-hero-grid"
      >
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: PALETTE.accent,
              margin: '0 0 24px',
            }}
          >
            Para escritórios contábeis
          </p>
          <h1
            id="hero-title"
            style={{
              fontFamily: SERIF,
              fontSize: 'clamp(38px, 5.8vw, 68px)',
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: PALETTE.navy,
              margin: '0 0 28px',
              textWrap: 'balance',
            }}
          >
            A planilha de carteira MEI tem um custo.
          </h1>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.65,
              color: PALETTE.body,
              margin: '0 0 36px',
              maxWidth: 560,
            }}
          >
            Cada cliente acima do teto vira MEI desenquadrado, refaturamento, multa.
            O SimulaMEI vigia tudo em painel. Teste 7 dias grátis — só cobramos se
            você ficar.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Link
              href="/onboarding/contador"
              style={{
                background: PALETTE.navy,
                color: PALETTE.bg,
                padding: '16px 26px',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Comece grátis 7 dias
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="#pricing"
              style={{
                color: PALETTE.navy,
                padding: '16px 18px',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'underline',
                textUnderlineOffset: 4,
                textDecorationThickness: 1,
              }}
            >
              Ver planos e preços
            </Link>
          </div>
          <p
            style={{
              marginTop: 22,
              fontSize: 13,
              color: PALETTE.muted,
            }}
          >
            Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>

        <HeroPanelCard />
      </div>
    </section>
  )
}

function HeroPanelCard() {
  const rows: Array<{ name: string; pct: number; status: 'good' | 'warn' | 'bad' }> = [
    { name: 'João Vasconcellos', pct: 93, status: 'warn' },
    { name: 'Maria Aparecida', pct: 62, status: 'good' },
    { name: 'Pedro Reis', pct: 118, status: 'bad' },
  ]

  return (
    <aside
      aria-label="Exemplo do painel de carteira"
      style={{
        background: PALETTE.cardBg,
        border: `1px solid ${PALETTE.rule}`,
        borderRadius: 10,
        padding: '22px 22px 18px',
        boxShadow: '0 18px 40px -28px rgba(15, 23, 34, 0.32)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: PALETTE.muted,
          }}
        >
          Carteira · novembro
        </span>
        <span style={{ fontSize: 12, color: PALETTE.muted }}>3 de 28 clientes</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {rows.map((r, i) => {
          const color =
            r.status === 'good' ? PALETTE.good : r.status === 'warn' ? PALETTE.warn : PALETTE.bad
          const label =
            r.status === 'bad' ? 'ULTRAPASSOU' : `${r.pct}% do teto`
          return (
            <li
              key={r.name}
              style={{
                padding: '14px 0',
                borderBottom:
                  i < rows.length - 1 ? `1px solid ${PALETTE.rule}` : 'none',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                rowGap: 8,
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: SERIF,
                    fontSize: 17,
                    color: PALETTE.navy,
                    fontWeight: 500,
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    height: 6,
                    background: PALETTE.bgAlt,
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(r.pct, 100)}%`,
                      height: '100%',
                      background: color,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  marginLeft: 14,
                  fontSize: 12,
                  fontWeight: 700,
                  color,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </div>
            </li>
          )
        })}
      </ul>
      <p
        style={{
          marginTop: 16,
          marginBottom: 0,
          fontSize: 12,
          lineHeight: 1.55,
          color: PALETTE.muted,
        }}
      >
        Mock representativo. Dados reais aparecem assim que você cadastra o primeiro cliente.
      </p>
    </aside>
  )
}

function TrustStrip() {
  return (
    <section
      aria-label="Cobertura e parceiros"
      style={{
        background: PALETTE.bgAlt,
        borderTop: `1px solid ${PALETTE.rule}`,
        borderBottom: `1px solid ${PALETTE.rule}`,
        padding: '22px 0',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
          display: 'grid',
          gridTemplateColumns: PARTNER_LOGOS.length > 0 ? '1fr auto' : '1fr',
          gap: 18,
          alignItems: 'center',
        }}
        className="mercury-trust-grid"
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: PALETTE.body,
            maxWidth: 720,
          }}
        >
          {TRUST_STRIP_LINE}
        </p>
        {PARTNER_LOGOS.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              gap: 26,
              alignItems: 'center',
            }}
          >
            {PARTNER_LOGOS.map((logo) => (
              <li key={logo.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo.src}
                  alt={logo.alt}
                  height={26}
                  style={{ height: 26, width: 'auto', opacity: 0.85 }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function ProblemSolution() {
  return (
    <section
      aria-labelledby="problems-title"
      style={{ padding: 'clamp(72px, 9vw, 120px) 0' }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <h2
          id="problems-title"
          style={{
            fontFamily: SERIF,
            fontSize: 'clamp(30px, 4vw, 44px)',
            fontWeight: 400,
            color: PALETTE.navy,
            margin: '0 0 12px',
            letterSpacing: '-0.015em',
            lineHeight: 1.15,
            maxWidth: 760,
            textWrap: 'balance',
          }}
        >
          O que o contador fala. O que o painel responde.
        </h2>
        <p
          style={{
            fontSize: 17,
            color: PALETTE.body,
            margin: '0 0 56px',
            maxWidth: 620,
            lineHeight: 1.6,
          }}
        >
          Os quatro pontos que mais aparecem em conversa com escritórios.
        </p>
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gap: 'clamp(36px, 4vw, 56px)',
          }}
        >
          {PROBLEM_SOLUTION.map((pair, idx) => (
            <li
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '64px minmax(0, 1fr) minmax(0, 1fr)',
                gap: 'clamp(20px, 3vw, 42px)',
                paddingTop: 'clamp(28px, 3vw, 40px)',
                borderTop: `1px solid ${PALETTE.rule}`,
              }}
              className="mercury-ps-row"
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: SERIF,
                  fontSize: 26,
                  color: PALETTE.accent,
                  fontWeight: 500,
                  lineHeight: 1,
                }}
              >
                {String(idx + 1).padStart(2, '0')}
              </span>
              <blockquote
                style={{
                  margin: 0,
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 'clamp(20px, 2.3vw, 26px)',
                  lineHeight: 1.4,
                  color: PALETTE.navy,
                  letterSpacing: '-0.005em',
                }}
              >
                &ldquo;{pair.problem}&rdquo;
              </blockquote>
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  lineHeight: 1.7,
                  color: PALETTE.body,
                }}
              >
                {pair.solution}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function PanelScreenshot() {
  return (
    <section
      aria-labelledby="panel-title"
      style={{
        padding: 'clamp(72px, 9vw, 110px) 0',
        borderTop: `1px solid ${PALETTE.rule}`,
        borderBottom: `1px solid ${PALETTE.rule}`,
        background: PALETTE.bgAlt,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <h2
          id="panel-title"
          style={{
            fontFamily: SERIF,
            fontSize: 'clamp(30px, 4vw, 44px)',
            fontWeight: 400,
            color: PALETTE.navy,
            margin: '0 0 12px',
            letterSpacing: '-0.015em',
            lineHeight: 1.15,
            maxWidth: 760,
            textWrap: 'balance',
          }}
        >
          O painel que substitui sua planilha.
        </h2>
        <p
          style={{
            fontSize: 17,
            color: PALETTE.body,
            margin: '0 0 44px',
            maxWidth: 620,
            lineHeight: 1.6,
          }}
        >
          Quatro coisas que ficam permanentes na sua mesa, no mesmo lugar, atualizadas todo mês.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
            gap: 'clamp(28px, 4vw, 48px)',
            alignItems: 'start',
          }}
          className="mercury-panel-grid"
        >
          {/* TODO: trocar por screenshot real capturado via Playwright quando UI estabilizar */}
          <PanelMockup />

          <ol
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: 22,
            }}
          >
            {CALLOUTS.map((c) => (
              <li
                key={c.n}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '38px 1fr',
                  gap: 16,
                  alignItems: 'start',
                  paddingTop: 12,
                  borderTop: `1px solid ${PALETTE.rule}`,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: SERIF,
                    fontSize: 20,
                    color: PALETTE.accent,
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {c.n}
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    lineHeight: 1.55,
                    color: PALETTE.navy,
                  }}
                >
                  {c.label}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/**
 * Mockup HTML do painel (dark-theme). Substitui screenshot real até a UI
 * do /contador estabilizar; aí esta função é trocada por um <Image> do
 * arquivo capturado via Playwright.
 */
function PanelMockup() {
  const stats = [
    { label: 'Carteira ativa', value: '23 / 30', meta: '87% do plano' },
    { label: 'Clientes', value: '28', meta: '+3 este mês' },
    { label: 'Pausados manual', value: '2', meta: 'por motivo' },
    { label: 'Por plano', value: '3', meta: 'planos ativos' },
  ]
  const alerts: Array<{
    title: string
    body: string
    severity: 'crit' | 'warn' | 'info'
    when: string
  }> = [
    {
      title: 'Pedro Reis · ultrapassou o teto',
      body: 'Projeção R$ 95.420 — 117% do limite anual MEI. Refaturamento risco alto.',
      severity: 'crit',
      when: 'há 2 dias',
    },
    {
      title: 'João Vasconcellos · 93% do teto',
      body: 'Tendência mensal estável. Conversar sobre Simples antes de dezembro.',
      severity: 'warn',
      when: 'há 4 dias',
    },
    {
      title: 'Carlos Mendes · Fator R 0,27',
      body: 'Próximo da fronteira 0,28 — Anexo III pode virar V no próximo trimestre.',
      severity: 'warn',
      when: 'há 1 dia',
    },
    {
      title: 'DAS de novembro',
      body: 'Gerados para 26 clientes. 2 sem CNPJ confirmado, ver pendências.',
      severity: 'info',
      when: 'há 6 horas',
    },
  ]
  const sevColor = (s: 'crit' | 'warn' | 'info') =>
    s === 'crit' ? '#ff6a52' : s === 'warn' ? '#f0b54a' : '#5fb4ff'

  return (
    <figure
      aria-label="Mockup do painel SimulaMEI Contador"
      style={{
        margin: 0,
        background: '#0f0f0f',
        borderRadius: 10,
        border: `1px solid ${PALETTE.rule}`,
        overflow: 'hidden',
        color: '#e8e8e8',
        fontFamily: SANS,
        boxShadow: '0 24px 60px -32px rgba(15, 23, 34, 0.4)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          background: '#0a0a0a',
          borderBottom: '1px solid #1f1f1f',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#c8f135', fontWeight: 800, fontSize: 14 }}>SimulaMEI</span>
          <span style={{ color: '#6b6b6b', fontSize: 12 }}>·</span>
          <span style={{ color: '#bcbcbc', fontSize: 12 }}>Escritório Demo</span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: 'rgba(200, 241, 53, 0.12)',
            color: '#c8f135',
            padding: '4px 10px',
            borderRadius: 999,
            border: '1px solid rgba(200, 241, 53, 0.32)',
          }}
        >
          TRIAL · 5 DIAS RESTANTES
        </span>
      </div>
      {/* Sub-nav */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '10px 14px 0',
          borderBottom: '1px solid #1f1f1f',
        }}
      >
        {[
          { label: 'Visão geral', active: true },
          { label: 'Clientes', active: false },
          { label: 'Assinatura', active: false },
        ].map((tab) => (
          <span
            key={tab.label}
            style={{
              fontSize: 12,
              padding: '7px 12px',
              borderRadius: '6px 6px 0 0',
              background: tab.active ? '#1a1a1a' : 'transparent',
              color: tab.active ? '#fff' : '#9a9a9a',
              fontWeight: tab.active ? 600 : 500,
            }}
          >
            {tab.label}
          </span>
        ))}
      </div>
      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: '#1f1f1f',
        }}
      >
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#0f0f0f', padding: '16px 14px' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#7a7a7a',
                marginBottom: 6,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: '#9a9a9a', marginTop: 4 }}>{s.meta}</div>
          </div>
        ))}
      </div>
      {/* Alerts grid 2x2 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1,
          background: '#1f1f1f',
        }}
      >
        {alerts.map((a) => (
          <div
            key={a.title}
            style={{
              background: '#111',
              padding: '14px 14px',
              borderLeft: `3px solid ${sevColor(a.severity)}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span style={{ color: '#e8e8e8', fontWeight: 600, fontSize: 13 }}>{a.title}</span>
              <span style={{ color: '#6b6b6b', fontSize: 10, whiteSpace: 'nowrap' }}>
                {a.when}
              </span>
            </div>
            <p style={{ margin: 0, color: '#a0a0a0', fontSize: 12, lineHeight: 1.5 }}>{a.body}</p>
          </div>
        ))}
      </div>
    </figure>
  )
}

function TestimonialsSection({ items }: { items: Testimonial[] }) {
  return (
    <section
      aria-labelledby="testimonials-title"
      style={{ padding: 'clamp(72px, 9vw, 110px) 0' }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <h2
          id="testimonials-title"
          style={{
            fontFamily: SERIF,
            fontSize: 'clamp(30px, 4vw, 44px)',
            fontWeight: 400,
            color: PALETTE.navy,
            margin: '0 0 44px',
            letterSpacing: '-0.015em',
            lineHeight: 1.15,
            maxWidth: 760,
          }}
        >
          O que os primeiros escritórios dizem.
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 28,
          }}
        >
          {items.map((t, i) => (
            <figure
              key={i}
              style={{
                margin: 0,
                padding: '28px 28px 24px',
                background: PALETTE.cardBg,
                borderLeft: `3px solid ${PALETTE.accent}`,
              }}
            >
              <blockquote
                style={{
                  margin: 0,
                  fontFamily: SERIF,
                  fontStyle: 'italic',
                  fontSize: 19,
                  lineHeight: 1.55,
                  color: PALETTE.navy,
                  letterSpacing: '-0.005em',
                }}
              >
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption
                style={{
                  marginTop: 18,
                  fontSize: 13,
                  color: PALETTE.muted,
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: PALETTE.navy, fontWeight: 600 }}>{t.author}</strong>
                <br />
                {t.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      style={{
        padding: 'clamp(72px, 9vw, 120px) 0',
        borderTop: `1px solid ${PALETTE.rule}`,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <h2
          id="pricing-title"
          style={{
            fontFamily: SERIF,
            fontSize: 'clamp(32px, 4.4vw, 48px)',
            fontWeight: 400,
            color: PALETTE.navy,
            margin: '0 0 14px',
            letterSpacing: '-0.015em',
            lineHeight: 1.1,
            textWrap: 'balance',
          }}
        >
          Planos e preços.
        </h2>
        <p
          style={{
            fontSize: 17,
            color: PALETTE.body,
            margin: '0 0 56px',
            maxWidth: 620,
            lineHeight: 1.6,
          }}
        >
          Todos começam com 7 dias grátis, sem cartão. Você decide depois.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
          }}
          className="mercury-pricing-grid"
        >
          {PLANS.map((p) => (
            <article
              key={p.name}
              style={{
                position: 'relative',
                background: p.featured ? PALETTE.navy : PALETTE.cardBg,
                color: p.featured ? PALETTE.bg : PALETTE.ink,
                border: p.featured
                  ? `1px solid ${PALETTE.navy}`
                  : `1px solid ${PALETTE.rule}`,
                borderRadius: 10,
                padding: '32px 28px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                boxShadow: p.featured
                  ? '0 22px 50px -28px rgba(15, 23, 34, 0.5)'
                  : 'none',
              }}
            >
              {p.featured && (
                <span
                  style={{
                    position: 'absolute',
                    top: -14,
                    left: 28,
                    background: PALETTE.accent,
                    color: PALETTE.bg,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '6px 12px',
                    borderRadius: 999,
                  }}
                >
                  Mais escolhido
                </span>
              )}
              <header>
                <h3
                  style={{
                    fontFamily: SERIF,
                    fontSize: 24,
                    fontWeight: 500,
                    margin: '0 0 8px',
                    color: 'inherit',
                  }}
                >
                  {p.name}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: p.featured ? 'rgba(245, 243, 238, 0.78)' : PALETTE.body,
                  }}
                >
                  {p.tagline}
                </p>
              </header>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span
                  style={{
                    fontFamily: SERIF,
                    fontSize: 38,
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {p.price}
                </span>
                {p.priceNote && (
                  <span
                    style={{
                      fontSize: 14,
                      color: p.featured ? 'rgba(245, 243, 238, 0.7)' : PALETTE.muted,
                      fontWeight: 500,
                    }}
                  >
                    {p.priceNote}
                  </span>
                )}
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'grid',
                  gap: 10,
                }}
              >
                {p.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '18px 1fr',
                      gap: 10,
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: p.featured ? 'rgba(245, 243, 238, 0.92)' : PALETTE.body,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        color: p.featured ? PALETTE.bg : PALETTE.accent,
                        fontWeight: 700,
                        lineHeight: 1.5,
                      }}
                    >
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={p.cta.href}
                style={{
                  marginTop: 'auto',
                  background: p.featured ? PALETTE.bg : PALETTE.navy,
                  color: p.featured ? PALETTE.navy : PALETTE.bg,
                  padding: '13px 16px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                {p.cta.label}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      style={{
        padding: 'clamp(72px, 9vw, 120px) 0',
        borderTop: `1px solid ${PALETTE.rule}`,
        background: PALETTE.bgAlt,
      }}
    >
      <div
        style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        <h2
          id="faq-title"
          style={{
            fontFamily: SERIF,
            fontSize: 'clamp(30px, 4vw, 44px)',
            fontWeight: 400,
            color: PALETTE.navy,
            margin: '0 0 36px',
            letterSpacing: '-0.015em',
            lineHeight: 1.15,
          }}
        >
          Perguntas frequentes.
        </h2>
        <div style={{ display: 'grid' }}>
          {FAQ.map((item, i) => (
            <details
              key={i}
              {...(i === 0 ? { open: true } : {})}
              style={{
                borderTop: `1px solid ${PALETTE.rule}`,
                ...(i === FAQ.length - 1 ? { borderBottom: `1px solid ${PALETTE.rule}` } : {}),
                padding: '20px 0',
              }}
              className="mercury-faq-item"
            >
              <summary
                style={{
                  cursor: 'pointer',
                  listStyle: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  fontFamily: SERIF,
                  fontSize: 'clamp(18px, 2.2vw, 22px)',
                  color: PALETTE.navy,
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                  alignItems: 'baseline',
                }}
              >
                {item.q}
                <span
                  aria-hidden="true"
                  style={{ fontSize: 22, color: PALETTE.accent, lineHeight: 1 }}
                  className="mercury-faq-marker"
                >
                  +
                </span>
              </summary>
              <p
                style={{
                  marginTop: 14,
                  marginBottom: 0,
                  fontSize: 16,
                  lineHeight: 1.7,
                  color: PALETTE.body,
                  maxWidth: 680,
                }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const cols: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
    {
      heading: 'Produto',
      links: [
        { label: 'Simulador MEI', href: '/' },
        { label: 'Para Contadores', href: '/para-contadores' },
        { label: 'Onboarding contador', href: '/onboarding/contador' },
        { label: 'Aprenda', href: '/aprenda' },
      ],
    },
    {
      heading: 'Recursos',
      links: [
        { label: 'Limite MEI 2026', href: '/aprenda/limite-mei-2026' },
        { label: 'Fator R', href: '/aprenda/fator-r-anexos' },
        { label: 'Desenquadramento', href: '/aprenda/desenquadramento-mei' },
        { label: 'DAS atrasado', href: '/aprenda/das-atrasado-mei' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Termos de uso', href: '/termos' },
        { label: 'Privacidade e LGPD', href: '/privacidade' },
      ],
    },
  ]

  return (
    <footer
      style={{
        background: PALETTE.navyDeep,
        color: 'rgba(245, 243, 238, 0.86)',
        padding: '0',
      }}
    >
      {/* CTA final */}
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: 'clamp(56px, 7vw, 96px) 32px clamp(48px, 6vw, 72px)',
          borderBottom: '1px solid rgba(245, 243, 238, 0.12)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) auto',
          gap: 28,
          alignItems: 'center',
        }}
        className="mercury-footer-cta"
      >
        <div>
          <h2
            style={{
              fontFamily: SERIF,
              fontSize: 'clamp(28px, 3.6vw, 42px)',
              fontWeight: 400,
              color: PALETTE.bg,
              margin: '0 0 12px',
              letterSpacing: '-0.015em',
              lineHeight: 1.15,
              textWrap: 'balance',
            }}
          >
            7 dias grátis. Sem cartão.
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              lineHeight: 1.6,
              color: 'rgba(245, 243, 238, 0.72)',
              maxWidth: 540,
            }}
          >
            Cadastre seu escritório, suba sua carteira, veja o painel acordar. Decida depois.
          </p>
        </div>
        <Link
          href="/onboarding/contador"
          style={{
            background: PALETTE.bg,
            color: PALETTE.navy,
            padding: '16px 24px',
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            justifySelf: 'end',
          }}
        >
          Comece grátis 7 dias <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Link map */}
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: 'clamp(40px, 5vw, 60px) 32px',
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 1fr) repeat(3, minmax(160px, 1fr))',
          gap: 40,
        }}
        className="mercury-footer-links"
      >
        <div>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 22,
              fontWeight: 600,
              color: PALETTE.bg,
              letterSpacing: '-0.01em',
              marginBottom: 12,
            }}
          >
            <span aria-hidden="true" style={{ color: PALETTE.accent }}>·</span> SimulaMEI
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.6,
              color: 'rgba(245, 243, 238, 0.6)',
              maxWidth: 240,
            }}
          >
            Motor fiscal e radar de teto para MEIs e escritórios contábeis.
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.heading}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(245, 243, 238, 0.55)',
                marginBottom: 14,
              }}
            >
              {col.heading}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 9 }}>
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    style={{
                      color: 'rgba(245, 243, 238, 0.84)',
                      fontSize: 14,
                      textDecoration: 'none',
                    }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Meta */}
      <div
        style={{
          borderTop: '1px solid rgba(245, 243, 238, 0.12)',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '22px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            fontSize: 12,
            color: 'rgba(245, 243, 238, 0.5)',
          }}
        >
          <span>
            Motor tributário {TAX_RULE_VERSION}. 18.300+ simulações processadas.
          </span>
          <span>Operado por SimulaMEI · {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  )
}
