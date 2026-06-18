import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, Callout, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/como-sair-do-mei-sem-multa'
const ARTICLE_TITLE = 'Como sair do MEI sem multa em 2026: guia da transição para ME'
const ARTICLE_DESCRIPTION =
  'Migrar do MEI para ME no momento certo evita multas, juros e tributação retroativa. Veja o passo a passo: prazos de comunicação, escolha de regime e como minimizar imposto na transição.'

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    'sair do MEI sem multa',
    'transição MEI ME',
    'migrar MEI para ME',
    'desenquadramento MEI sem multa',
    'crescer além do MEI',
    'sair MEI prazo',
    'migrar para Simples Nacional',
    'planejar transição MEI',
  ],
  alternates: { canonical: ARTICLE_PATH },
  openGraph: {
    title: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    url: ARTICLE_PATH,
    type: 'article',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
  },
}

export default function ComoSairDoMeiSemMultaPage() {
  return (
    <StaticPageLayout
      title="Como sair do MEI sem multa"
      subtitle="A migração para ME é normal e esperada — o que dá multa é fazer fora do prazo ou de ofício. Com planejamento, o custo é zero."
    >
      <ArticleMeta tag="MEI · Transição · Planejamento" readingTime="7 min" />

      <Callout>
        <strong style={{ display: 'block', marginBottom: 6 }}>TL;DR</strong>
        Sair do MEI sem multa exige (1) comunicar o desenquadramento{' '}
        <Strong>antes do prazo legal</Strong>, (2) estar com todos os DAS em
        dia, e (3) escolher um regime adequado à nova realidade. Comunicar até
        janeiro do ano seguinte ao &quot;evento&quot; (excesso de receita,
        contratação, etc.) é o normal. Se o motivo for excesso superior a 20%,
        o desenquadramento pode ser retroativo — daí o risco real de imposto
        cobrado para trás.
      </Callout>

      <H2>O que gera multa na saída do MEI</H2>
      <P>
        Tecnicamente, <Strong>não existe &quot;multa por sair do MEI&quot;</Strong>.
        O que existe é:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}><Strong>Multa por comunicar fora do prazo</Strong> o desenquadramento obrigatório.</li>
        <li style={{ marginBottom: 10 }}><Strong>Imposto retroativo</Strong> quando o excesso de receita passa de 20% — não é multa, é tributo devido como ME.</li>
        <li style={{ marginBottom: 10 }}><Strong>DAS em atraso</Strong> com multa e juros, se você deixou guias vencerem.</li>
        <li style={{ marginBottom: 10 }}><Strong>Desenquadramento de ofício</Strong> com cobrança retroativa e penalidades adicionais.</li>
      </ul>

      <H2>Os prazos de comunicação obrigatória</H2>
      <P>
        Cada gatilho tem seu prazo. A regra geral é:
      </P>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 20 }}>
        {[
          {
            gatilho: 'Excesso de receita até 20% do teto',
            prazo: 'Comunicar até janeiro do ano seguinte; efeito em 1º de janeiro do ano seguinte',
            cor: 'var(--lime)',
          },
          {
            gatilho: 'Excesso de receita acima de 20% do teto',
            prazo: 'Comunicar imediatamente; efeito retroativo a 1º de janeiro do ano do excesso',
            cor: 'var(--orange)',
          },
          {
            gatilho: 'Contratação de mais de 1 funcionário',
            prazo: 'Comunicar no mês seguinte ao evento',
            cor: 'var(--yellow)',
          },
          {
            gatilho: 'Abertura de filial / inclusão de sócio / atividade vedada',
            prazo: 'Comunicar no mês seguinte ao evento',
            cor: 'var(--yellow)',
          },
        ].map(item => (
          <div
            key={item.gatilho}
            style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}
          >
            <div style={{ fontSize: 13, color: item.cor, marginBottom: 6, fontWeight: 700 }}>{item.gatilho}</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{item.prazo}</p>
          </div>
        ))}
      </div>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Calcular o custo da minha transição →
      </Link>

      <H2>Passo a passo: como sair do MEI de forma planejada</H2>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>1. Verifique se tem DAS em atraso</p>
      <P>
        Antes de qualquer movimento, regularize. Guia em aberto vira problema
        composto com o desenquadramento. Veja{' '}
        <Link href="/aprenda/das-atrasado-mei" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          como regularizar DAS atrasado
        </Link>
        .
      </P>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>2. Simule o regime ideal para a nova realidade</p>
      <P>
        Compare Simples Nacional, Lucro Presumido e (se faturar muito) Lucro
        Real. Para serviços, atenção ao Fator R: Anexo III (a partir de 6%)
        é muito mais barato que Anexo V (a partir de 15,5%).
      </P>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>3. Comunique o desenquadramento dentro do prazo</p>
      <P>
        No Portal do Simples Nacional, faça o pedido. Se for por opção, a
        comunicação pode ser feita até o último dia útil de janeiro do ano em
        que quer deixar de ser MEI. Se for obrigatória, siga o prazo do gatilho.
      </P>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>4. Configure emissão de nota fiscal como ME</p>
      <P>
        Inscrição estadual (se comércio/indústria), credenciamento na
        prefeitura para NFS-e (serviços) e — se você já era MEI — atualize seu
        certificado digital. Veja{' '}
        <Link href="/aprenda/nota-fiscal-mei" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          emissão de NFe sendo MEI/ME
        </Link>
        .
      </P>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>5. Contrate um contador habilitado</p>
      <P>
        Como ME, você precisa de contabilidade formal. O custo gira de R$ 200
        a R$ 600/mês para Simples Nacional. Sem ele, o risco de erro fiscal é
        alto.
      </P>

      <H2>Como minimizar o imposto na transição</H2>
      <Callout>
        Se você for sair em janeiro, considere <Strong>antecipar despesas
        dedutíveis</Strong> e <Strong>postergar receitas</Strong> que ainda
        possam ser registradas no ano do MEI — evita pegar essa receita já
        sob o regime ME mais oneroso. Sempre confirme com contador.
      </Callout>
      <P>
        Para serviços, planeje a folha. Aumentar pró-labore ou contratar 1
        funcionário pode levar você ao Anexo III (Fator R ≥ 28%) em vez do V.
        Veja o guia{' '}
        <Link href="/aprenda/fator-r" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          Fator R
        </Link>{' '}
        e{' '}
        <Link href="/aprenda/diferenca-anexo-iii-e-v" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          Anexo III vs Anexo V
        </Link>
        .
      </P>

      <H2>O custo de NÃO sair quando deveria</H2>
      <P>
        Adiar o desenquadramento obrigatório expõe o CNPJ ao desenquadramento
        de ofício, que vem com tributação retroativa e penalidades. Em
        contextos de excesso superior a 20%, o cálculo retroativo pode chegar
        a dezenas de milhares de reais.
      </P>

      <H2>Para contadores: ajude clientes a planejar a saída</H2>
      <P>
        Se você é contador, o SimulaMEI tem um modo Pro para gerar PDFs de
        planejamento da transição com vários cenários. Veja{' '}
        <Link href="/para-contadores" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          SimulaMEI para contadores
        </Link>
        .
      </P>

      <SimulatorCTA
        title="Veja o regime ideal antes de sair do MEI"
        description="Compare Simples, Presumido e Real para seu faturamento. Gratuito, sem cadastro, com PDF para levar ao contador."
      />

      <Callout color="blue">
        Conteúdo educacional. Sempre confirme decisões tributárias com contador
        credenciado pelo CRC. Valores e alíquotas podem mudar por legislação.
      </Callout>

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
