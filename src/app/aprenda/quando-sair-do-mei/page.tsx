import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, Callout, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/quando-sair-do-mei'
const ARTICLE_TITLE = 'Quando sair do MEI em 2026: teto, excesso e migração'
const ARTICLE_DESCRIPTION = 'Entenda quando o MEI precisa migrar para ME: limite de faturamento, excesso de 20%, contratação, sócios, filial e atividade não permitida.'

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  alternates: { canonical: ARTICLE_PATH },
  openGraph: {
    title: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    url: ARTICLE_PATH,
  },
}

export default function QuandoSairDoMeiPage() {
  return (
    <StaticPageLayout
      title="Quando devo sair do MEI?"
      subtitle="Sair do MEI não é fracasso. Normalmente é sinal de crescimento, mas precisa ser planejado para evitar imposto retroativo e multas."
    >
      <ArticleMeta tag="MEI · Teto 2026" readingTime="5 min" />

      <H2>O principal gatilho: faturamento</H2>
      <P>
        O limite anual do MEI comum é de <Strong>R$ 81.000</Strong>. Para MEI caminhoneiro,
        o limite é maior: <Strong>R$ 251.600</Strong>. Se a empresa abriu durante o ano,
        o limite é proporcional aos meses de atividade.
      </P>
      <Callout>
        Regra prática: acompanhe a projeção anual, não só o faturamento já emitido. Um MEI com
        R$ 67.500 acumulados em outubro parece dentro do teto, mas está projetando R$ 81.000 no ano.
      </Callout>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Ver minha projeção anual agora →
      </Link>

      <H2>Se passar até 20% do limite</H2>
      <P>
        Quando o excesso não passa de 20%, o desenquadramento costuma produzir efeitos a partir de
        <Strong> 1º de janeiro do ano seguinte</Strong>. Ainda assim, você precisa comunicar o
        desenquadramento e pagar o DAS sobre o excesso na declaração anual.
      </P>
      <P>
        Para o MEI comum, 20% acima do teto equivale a <Strong>R$ 97.200</Strong>. Acima disso,
        o risco muda de patamar.
      </P>

      <H2>Se passar mais de 20% do limite</H2>
      <P>
        Quando a receita ultrapassa o limite em mais de 20%, o desenquadramento pode ser
        <Strong> retroativo a 1º de janeiro do ano em que ocorreu o excesso</Strong>. Se isso
        acontecer no ano de abertura do CNPJ, a retroatividade pode ir até a data de abertura.
      </P>
      <Callout color="orange">
        Esse é o cenário que mais pede contador: a empresa passa a apurar tributos como ME ou EPP
        no Simples Nacional desde a data de efeito do desenquadramento.
      </Callout>

      <H2>Outros motivos para deixar de ser MEI</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Contratar mais de um empregado.</li>
        <li style={{ marginBottom: 10 }}>Ter sócio ou participar de outra empresa em situação vedada.</li>
        <li style={{ marginBottom: 10 }}>Abrir filial.</li>
        <li style={{ marginBottom: 10 }}>Incluir atividade econômica que não é permitida ao MEI.</li>
        <li style={{ marginBottom: 10 }}>Comprar insumos ou mercadorias acima do limite permitido em relação às vendas.</li>
      </ul>

      <H2>Como planejar a transição</H2>
      <P>
        Antes de pedir o desenquadramento, simule cenários no Simples Nacional, Lucro Presumido e
        Lucro Real. Para serviços sujeitos ao Fator R, a diferença entre Anexo III e Anexo V pode
        mudar completamente a decisão de pró-labore e contratação.
      </P>

      <SimulatorCTA
        title="Veja se você está perto do teto"
        description="O SimulaMEI calcula a projeção anual e mostra o risco de desenquadramento em menos de 1 minuto."
      />

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
