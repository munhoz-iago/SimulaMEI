import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'

const PAGE_TITLE = 'Aprenda sobre MEI e Simples Nacional — SimulaMEI'
const PAGE_DESCRIPTION = 'Guias práticos sobre teto MEI, Fator R, Anexo III vs V e quando sair do MEI. Conteúdo atualizado para 2026.'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/aprenda' },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: '/aprenda',
    siteName: 'SimulaMEI',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
}

const ARTIGOS = [
  {
    href: '/aprenda/fator-r',
    titulo: 'O que é o Fator R e como calcular',
    desc: 'Entenda o indicador que define se você paga menos imposto no Anexo III ou mais no Anexo V — e como aumentar seu Fator R.',
    tag: 'Fator R · Simples Nacional',
    tempo: '4 min',
    accent: 'var(--lime)',
  },
  {
    href: '/aprenda/quando-sair-do-mei',
    titulo: 'Quando devo sair do MEI? Guia 2026',
    desc: 'Os 4 gatilhos que obrigam a migração, o que acontece se você estourar o teto e como planejar a transição sem pagar multa.',
    tag: 'MEI · Teto 2026',
    tempo: '5 min',
    accent: 'var(--yellow)',
  },
  {
    href: '/aprenda/diferenca-anexo-iii-e-v',
    titulo: 'Anexo III vs Anexo V do Simples Nacional',
    desc: 'A diferença de alíquota pode chegar a 9,5 pontos percentuais. Veja qual enquadramento se aplica à sua atividade e quanto você pode economizar.',
    tag: 'Simples Nacional · Tributário',
    tempo: '4 min',
    accent: 'var(--orange)',
  },
  {
    href: '/aprenda/limite-mei-2026',
    titulo: 'Limite do MEI em 2026: quanto posso faturar',
    desc: 'Teto comum e do caminhoneiro, limite proporcional no ano de abertura, tolerância de 20% e por que a projeção pesa mais que o acumulado.',
    tag: 'MEI · Teto 2026',
    tempo: '4 min',
    accent: 'var(--lime)',
  },
  {
    href: '/aprenda/mei-estourou-o-teto',
    titulo: 'MEI estourou o teto: o que fazer agora',
    desc: 'Os dois cenários (até 20% e acima de 20%), o risco de tributação retroativa e os passos para migrar sem multa evitável.',
    tag: 'MEI · Desenquadramento',
    tempo: '5 min',
    accent: 'var(--yellow)',
  },
  {
    href: '/aprenda/das-atrasado-mei',
    titulo: 'DAS MEI atrasado: como regularizar sem multa pesada',
    desc: 'Como gerar a guia atualizada, multa e juros típicos, o risco de exclusão do Simples e o passo a passo para regularizar.',
    tag: 'MEI · Regularização',
    tempo: '6 min',
    accent: 'var(--orange)',
  },
  {
    href: '/aprenda/desenquadramento-mei',
    titulo: 'MEI desenquadrado: o que acontece e como reverter',
    desc: 'Os três tipos (opção, comunicação obrigatória e de ofício), o que muda em impostos e quando dá para voltar a ser MEI.',
    tag: 'MEI · Desenquadramento',
    tempo: '6 min',
    accent: 'var(--yellow)',
  },
  {
    href: '/aprenda/mei-caminhoneiro',
    titulo: 'MEI caminhoneiro: teto e regras especiais',
    desc: 'Teto próximo de R$ 251.600/ano, DAS diferenciado e quem pode optar pelo regime de transportador autônomo de cargas.',
    tag: 'MEI · Caminhoneiro',
    tempo: '6 min',
    accent: 'var(--lime)',
  },
  {
    href: '/aprenda/como-sair-do-mei-sem-multa',
    titulo: 'Como sair do MEI sem multa em 2026',
    desc: 'Prazos de comunicação, escolha de regime e como minimizar imposto na transição para ME — passo a passo.',
    tag: 'MEI · Transição',
    tempo: '7 min',
    accent: 'var(--lime)',
  },
  {
    href: '/aprenda/pro-labore-mei',
    titulo: 'Pró-labore no MEI: precisa pagar? Quanto? Como?',
    desc: 'O MEI não tem pró-labore — só ME e EPP têm. Veja o que muda na migração e como o pró-labore afeta o Fator R.',
    tag: 'MEI · Pró-labore',
    tempo: '5 min',
    accent: 'var(--orange)',
  },
  {
    href: '/aprenda/dasn-simei',
    titulo: 'DASN-SIMEI: o que é, prazo e como declarar',
    desc: 'A declaração anual obrigatória do MEI. Prazo (31 de maio), passo a passo, multa por atraso e o que fazer se receita foi zero.',
    tag: 'MEI · DASN',
    tempo: '5 min',
    accent: 'var(--yellow)',
  },
  {
    href: '/aprenda/segundo-cnae-mei',
    titulo: 'MEI pode ter 2 atividades? Como funciona CNAE secundário',
    desc: 'Sim, MEI tem 1 atividade principal e múltiplas secundárias (até 15). Veja regras, como adicionar e atividades vedadas.',
    tag: 'MEI · CNAE',
    tempo: '5 min',
    accent: 'var(--lime)',
  },
  {
    href: '/aprenda/mei-funcionario',
    titulo: 'MEI pode ter funcionário? Regras 2026 completas',
    desc: 'Custo total mensal (~R$ 1.700-1.900), folha, FGTS, INSS patronal de 3% e quando vale contratar.',
    tag: 'MEI · Funcionário',
    tempo: '6 min',
    accent: 'var(--orange)',
  },
  {
    href: '/aprenda/nota-fiscal-mei',
    titulo: 'Como emitir nota fiscal sendo MEI',
    desc: 'Quando NFe ou NFS-e é obrigatória, ferramentas gratuitas, certificado digital e o que muda em vendas para PJ x PF.',
    tag: 'MEI · Nota Fiscal',
    tempo: '6 min',
    accent: 'var(--lime)',
  },
  {
    href: '/aprenda/cnae-mei-permitido',
    titulo: 'Lista de CNAEs permitidos para MEI em 2026',
    desc: 'Mais de 450 CNAEs permitidos, principais categorias, atividades vedadas e ferramentas oficiais de consulta.',
    tag: 'MEI · CNAE',
    tempo: '7 min',
    accent: 'var(--yellow)',
  },
]

export default function AprendaPage() {
  return (
    <StaticPageLayout
      title="Aprenda sobre MEI e tributação"
      subtitle="Guias práticos, sem jargão, para você tomar decisões fiscais com confiança."
    >
      <div style={{ display: 'grid', gap: 14 }}>
        {ARTIGOS.map(a => (
          <Link
            key={a.href}
            href={a.href}
            className="article-card surface-hover pressable"
            style={{
              display: 'block',
              position: 'relative',
              overflow: 'hidden',
              padding: '22px 24px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'linear-gradient(135deg, var(--bg1), rgba(255,255,255,0.015))',
              textDecoration: 'none', color: 'inherit',
            }}
          >
            <div className="article-card-marker" style={{ background: a.accent }} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>{a.tag}</span>
              <span>·</span>
              <span>{a.tempo} de leitura</span>
            </div>
            <h2 style={{ fontSize: 'clamp(19px, 2.4vw, 23px)', fontWeight: 800, color: 'var(--text1)', marginBottom: 8, lineHeight: 1.22 }}>
              {a.titulo}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
              {a.desc}
            </p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 14, fontSize: 13, color: a.accent, fontWeight: 800,
            }}>
              Ler artigo <span className="article-card-cta">→</span>
            </span>
          </Link>
        ))}
      </div>
    </StaticPageLayout>
  )
}
