import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, Callout, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/pro-labore-mei'
const ARTICLE_TITLE = 'Pró-labore no MEI 2026: o MEI precisa pagar? Quanto? Como?'
const ARTICLE_DESCRIPTION =
  'O MEI tradicional não tem pró-labore — paga DAS com INSS embutido. Entenda o que muda na migração para ME, quando pró-labore vira obrigação e como ele afeta o Fator R.'

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    'pró-labore MEI',
    'MEI faz pró-labore',
    'salário MEI',
    'retirada MEI',
    'pró-labore ME',
    'pró-labore Simples Nacional',
    'INSS pró-labore',
    'pró-labore Fator R',
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

export default function ProLaboreMeiPage() {
  return (
    <StaticPageLayout
      title="Pró-labore para MEI: existe? Como funciona?"
      subtitle="Confusão clássica: muitos MEIs acham que precisam tirar pró-labore. Na verdade, o MEI tradicional não tem essa figura — só ME e EPP têm."
    >
      <ArticleMeta tag="MEI · Pró-labore · INSS" readingTime="5 min" />

      <Callout>
        <strong style={{ display: 'block', marginBottom: 6 }}>TL;DR</strong>
        O MEI <Strong>não paga pró-labore</Strong>: o DAS já inclui INSS sobre
        um salário mínimo. O sócio retira lucros direto, isento de IR. Quando
        a empresa migra para ME no Simples Nacional, surge o pró-labore como
        figura obrigatória — ele entra no Fator R e pode reduzir muito a
        alíquota de Simples para serviços.
      </Callout>

      <H2>Por que o MEI não tem pró-labore</H2>
      <P>
        O MEI já contribui ao INSS via DAS — em 2026, 5% do salário mínimo
        para serviços/comércio e variações para caminhoneiros. Esse desconto
        garante o benefício previdenciário e cumpre a função do pró-labore. Em
        troca, o titular pode <Strong>retirar lucros sem incidência de
        imposto de renda</Strong>, dentro do limite do faturamento.
      </P>
      <P>
        Você pode &quot;tirar do caixa&quot; o quanto quiser (dentro do que
        a empresa fatura), e isso configura distribuição de lucros — não
        pró-labore.
      </P>

      <H2>O que muda ao migrar para ME</H2>
      <P>
        Quando a empresa cresce e se desenquadra para ME (ou EPP) no Simples
        Nacional, <Strong>o pró-labore vira obrigatório</Strong> para sócios
        que trabalham na empresa. A regra geral exige:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}><Strong>Mínimo:</Strong> 1 salário mínimo vigente.</li>
        <li style={{ marginBottom: 10 }}><Strong>INSS:</Strong> 11% retido na fonte do pró-labore.</li>
        <li style={{ marginBottom: 10 }}><Strong>IRRF:</Strong> conforme tabela progressiva, se ultrapassar a faixa de isenção.</li>
        <li style={{ marginBottom: 10 }}><Strong>Folha:</Strong> o pró-labore entra como folha de salários para fins do Fator R.</li>
      </ul>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Simular pró-labore e Fator R com meus dados →
      </Link>

      <H2>Pró-labore e Fator R: o segredo do imposto baixo</H2>
      <P>
        Para empresas de serviços no Simples, o pró-labore é{' '}
        <Strong>alavanca direta do Fator R</Strong>. O cálculo do Fator R:
      </P>
      <Callout>
        <strong style={{ display: 'block', marginBottom: 8 }}>Fórmula:</strong>
        Fator R = (Folha + pró-labore dos últimos 12 meses) ÷ Receita bruta dos
        últimos 12 meses
      </Callout>
      <P>
        Se o resultado for ≥ 28%, a empresa cai no <Strong>Anexo III</Strong>{' '}
        (alíquota inicial de 6%) em vez do <Strong>Anexo V</Strong> (15,5%).
        Diferença que pode chegar a R$ 17.000/ano para faturamento de R$ 180k.
      </P>

      <H2>Exemplo prático: até que valor de pró-labore vale a pena?</H2>
      <P>
        Suponha receita de R$ 180.000/ano e folha de funcionários = R$ 0.
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Pró-labore de R$ 1.518/mês (mínimo): Fator R = 10% → Anexo V.</li>
        <li style={{ marginBottom: 10 }}>Pró-labore de R$ 4.200/mês: Fator R = 28% → Anexo III.</li>
      </ul>
      <P>
        Aumentar o pró-labore custa R$ 32k a mais por ano em &quot;salário do
        sócio&quot;, mas reduz imposto Simples em R$ 17k e melhora a base do INSS.
        O saldo líquido geralmente compensa. <Strong>Mas atenção:</Strong> esse
        aumento também eleva o IRRF do sócio. O ponto correto é o menor pró-
        labore que atinge o Anexo III sem gerar IRRF excessivo.
      </P>
      <Callout color="orange">
        Nunca aumente pró-labore sem simular o saldo líquido considerando
        INSS, IRRF e a redução do Simples. O SimulaMEI faz essa conta.
      </Callout>

      <H2>Distribuição de lucros: ainda existe no ME?</H2>
      <P>
        Sim. Além do pró-labore obrigatório, o sócio do ME pode receber{' '}
        <Strong>distribuição de lucros isenta de IR</Strong>, desde que a
        empresa tenha contabilidade regular que comprove o lucro. Esse é um
        ponto onde o trabalho do contador faz diferença direta no que você
        leva para casa.
      </P>

      <H2>E o INSS? Vou aposentar com pró-labore mínimo?</H2>
      <P>
        A aposentadoria é calculada sobre a média das contribuições. Pró-
        labore mínimo (1 salário mínimo) garante 1 SM de aposentadoria. Para
        valores maiores, é preciso pagar INSS adicional como contribuinte
        individual (até o teto do INSS, ~R$ 8.157,41 em 2026) ou via pró-
        labore mais alto da empresa.
      </P>

      <H2>Resumo: MEI x ME no quesito pró-labore</H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { regime: 'MEI', prolabore: 'Não existe', inss: 'DAS (5% SM)', cor: 'var(--lime)' },
          { regime: 'ME / EPP', prolabore: 'Mínimo 1 SM', inss: '11% sobre pró-labore', cor: 'var(--yellow)' },
        ].map(r => (
          <div key={r.regime} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>{r.regime}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 800, color: r.cor }}>{r.prolabore}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>{r.inss}</div>
          </div>
        ))}
      </div>

      <P>
        Para entender quando faz sentido migrar e levar pró-labore em conta,
        veja{' '}
        <Link href="/aprenda/quando-sair-do-mei" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          quando devo sair do MEI
        </Link>{' '}
        e o guia{' '}
        <Link href="/aprenda/fator-r" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          Fator R
        </Link>
        .
      </P>

      <SimulatorCTA
        title="Calcule pró-labore ótimo no simulador"
        description="O SimulaMEI mostra qual pró-labore minimiza imposto total considerando Fator R, INSS e IRRF. Em menos de 1 minuto."
      />

      <Callout color="blue">
        Conteúdo educacional. Sempre confirme decisões tributárias com contador
        credenciado pelo CRC. Valores e alíquotas podem mudar por legislação.
      </Callout>

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
