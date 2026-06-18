import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, Callout, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/mei-caminhoneiro'
const ARTICLE_TITLE = 'MEI caminhoneiro em 2026: teto, contribuição e regras especiais'
const ARTICLE_DESCRIPTION =
  'O MEI caminhoneiro (transportador autônomo de cargas) tem teto diferenciado próximo de R$ 251.600/ano e regras específicas. Entenda quem pode optar, contribuições e diferenças do MEI comum.'

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    'MEI caminhoneiro 2026',
    'MEI transportador autônomo',
    'MEI transporte cargas',
    'teto MEI caminhoneiro',
    'DAS MEI caminhoneiro',
    'MEI TAC',
    'limite MEI transporte',
    'INSS MEI caminhoneiro',
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

export default function MeiCaminhoneiroPage() {
  return (
    <StaticPageLayout
      title="MEI caminhoneiro: teto maior, regras específicas"
      subtitle="O regime do MEI Transportador Autônomo de Cargas (TAC) tem teto cerca de 3x maior que o MEI comum — mas isso vem com obrigações distintas."
    >
      <ArticleMeta tag="MEI · Caminhoneiro · TAC" readingTime="6 min" />

      <Callout>
        <strong style={{ display: 'block', marginBottom: 6 }}>TL;DR</strong>
        O MEI caminhoneiro tem teto de faturamento anual próximo de{' '}
        <Strong>R$ 251.600</Strong> (vs. R$ 81.000 do MEI comum). O DAS é mais
        caro porque a alíquota previdenciária é maior, refletindo a base de
        contribuição compatível com a atividade. Só pode optar quem é
        transportador autônomo de cargas devidamente cadastrado no RNTRC da
        ANTT.
      </Callout>

      <H2>Quem pode ser MEI caminhoneiro</H2>
      <P>
        A categoria é destinada exclusivamente ao{' '}
        <Strong>transportador autônomo de cargas (TAC)</Strong>. Para optar,
        você precisa:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Ter CNH categoria C, D ou E.</li>
        <li style={{ marginBottom: 10 }}>Possuir veículo próprio, arrendado ou em sociedade.</li>
        <li style={{ marginBottom: 10 }}>Estar inscrito no RNTRC (Registro Nacional de Transportadores Rodoviários de Cargas) na ANTT.</li>
        <li style={{ marginBottom: 10 }}>Exercer a atividade de transporte rodoviário de cargas em caráter autônomo.</li>
      </ul>

      <H2>Teto diferenciado: por que existe</H2>
      <P>
        O MEI comum, voltado a comércio, indústria e serviços leves, tem teto
        de <Strong>R$ 81.000/ano</Strong>. Para o transportador autônomo, esse
        limite é insuficiente — diesel, manutenção de veículo, pedágios e
        comissões consomem grande parte do faturamento. Por isso, o teto do
        MEI caminhoneiro foi estabelecido em <Strong>R$ 251.600/ano</Strong>{' '}
        (com base no IPI do veículo, conforme legislação).
      </P>
      <Callout color="orange">
        Esse valor pode ser reajustado por lei. Antes de planejar para o ano,
        confirme o teto vigente no Portal do Empreendedor (gov.br).
      </Callout>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Calcular se meu faturamento cabe no teto →
      </Link>

      <H2>Quanto custa o DAS do MEI caminhoneiro</H2>
      <P>
        O DAS do MEI caminhoneiro é <Strong>maior que o DAS comum</Strong>{' '}
        porque a contribuição ao INSS é calculada sobre uma base maior — um
        percentual do teto do MEI caminhoneiro, não sobre o salário mínimo. Em
        2026, o valor mensal fica na faixa de <Strong>R$ 180 a R$ 200</Strong>{' '}
        (mais ICMS se houver transporte interestadual).
      </P>
      <P>
        Em troca, a contribuição garante mais robustez na aposentadoria,
        compatível com a renda da categoria.
      </P>

      <H2>Diferenças do MEI comum em uma tabela</H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'MEI comum', teto: 'R$ 81.000/ano', das: '~R$ 70-85/mês', cor: 'var(--text2)' },
          { label: 'MEI caminhoneiro', teto: 'R$ 251.600/ano', das: '~R$ 180-200/mês', cor: 'var(--lime)' },
        ].map(r => (
          <div key={r.label} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>{r.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, color: r.cor }}>{r.teto}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>{r.das}</div>
          </div>
        ))}
      </div>

      <H2>Posso emitir nota fiscal de serviço como MEI caminhoneiro?</H2>
      <P>
        Sim. Como prestador de serviço de transporte, o MEI caminhoneiro emite
        nota fiscal eletrônica de transporte (CT-e ou MDF-e, dependendo da
        operação) pelo portal do estado ou via aplicativo emissor gratuito da
        Sefaz. Para clientes que são pessoas físicas, a nota pode não ser
        obrigatória — mas é sempre recomendada.
      </P>
      <P>
        Para entender melhor o tema, veja{' '}
        <Link href="/aprenda/nota-fiscal-mei" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          como emitir nota fiscal sendo MEI
        </Link>
        .
      </P>

      <H2>Estourei o teto. E agora?</H2>
      <P>
        As regras de tolerância (20% acima do teto) e os efeitos do
        desenquadramento são <Strong>iguais ao MEI comum</Strong>, mas
        aplicados sobre o limite ampliado. Acima de R$ 301.920 (20% acima de
        R$ 251.600), o risco passa a ser retroativo.
      </P>
      <P>
        Confira o guia detalhado:{' '}
        <Link href="/aprenda/mei-estourou-o-teto" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          MEI estourou o teto
        </Link>
        .
      </P>

      <H2>Vale a pena migrar para ME transportadora?</H2>
      <P>
        Se você fatura próximo ao teto e quer expandir frota, contratar
        motoristas ou trabalhar com empresas que exigem maior estrutura
        fiscal, a migração para ME pode fazer sentido. Simule antes:
      </P>

      <SimulatorCTA
        title="Veja o regime ideal para sua operação"
        description="O SimulaMEI considera serviços de transporte, ICMS interestadual e mostra Simples, Presumido e Real para o seu faturamento."
      />

      <Callout color="blue">
        Conteúdo educacional. Sempre confirme decisões tributárias com contador
        credenciado pelo CRC. Valores e alíquotas podem mudar por legislação.
      </Callout>

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
