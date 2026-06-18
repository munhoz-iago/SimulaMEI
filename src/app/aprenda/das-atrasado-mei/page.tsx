import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, Callout, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/das-atrasado-mei'
const ARTICLE_TITLE = 'DAS MEI atrasado em 2026: como regularizar sem multa pesada'
const ARTICLE_DESCRIPTION =
  'Pagou o DAS MEI fora do prazo? Veja como gerar a guia atualizada, qual é a multa e os juros típicos, o risco de exclusão do Simples Nacional e o passo a passo para regularizar.'

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    'DAS MEI atrasado',
    'como pagar DAS atrasado',
    'DAS em atraso',
    'multa DAS MEI',
    'regularizar MEI',
    'DAS vencido',
    'parcelamento DAS MEI',
    'exclusão MEI Simples',
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

export default function DasAtrasadoMeiPage() {
  return (
    <StaticPageLayout
      title="DAS MEI atrasado: como regularizar sem dor maior"
      subtitle="Atrasar uma guia não é o fim do mundo, mas acumular meses de DAS atrasado vira problema sério — pode custar o INSS e até o CNPJ ativo no Simples."
    >
      <ArticleMeta tag="MEI · Regularização" readingTime="6 min" />

      <Callout>
        <strong style={{ display: 'block', marginBottom: 6 }}>TL;DR</strong>
        DAS MEI em atraso pode ser regularizado a qualquer momento pelo Portal do
        Empreendedor (gov.br). A guia atualizada inclui multa (geralmente 0,33%
        ao dia, limitada a 20%) e juros pela Selic. Manter o atraso por 12 meses
        consecutivos coloca o MEI em risco de exclusão de ofício do Simples
        Nacional. Quando o valor pesar, peça parcelamento — mas pague primeiro
        os últimos 12 meses para preservar benefícios do INSS.
      </Callout>

      <H2>O que é o DAS e por que o atraso é caro</H2>
      <P>
        O DAS (Documento de Arrecadação do Simples Nacional) é a guia única que o
        MEI paga todo mês. Ela cobre <Strong>INSS, ISS e/ou ICMS</Strong>{' '}
        conforme a atividade. O valor é fixo e gira em torno de R$ 70 a R$ 85
        em 2026, dependendo se a atividade é serviço, comércio ou ambos.
      </P>
      <P>
        Atrasar significa, na prática, ficar sem cobertura previdenciária no mês
        e acumular acréscimos legais. A multa começa em <Strong>0,33% por dia
        de atraso</Strong> e está limitada a 20% do valor da guia. Em cima
        disso, incidem juros pela <Strong>Selic acumulada</Strong> mais 1% no
        mês do pagamento.
      </P>

      <H2>Como gerar a guia atualizada do DAS atrasado</H2>
      <P>
        Você pode gerar pelo <Strong>Portal do Empreendedor</Strong>{' '}
        (gov.br/empresas) ou pelo <Strong>PGMEI</Strong> no site da Receita
        Federal. O passo a passo é simples:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Acesse o PGMEI e informe o CNPJ.</li>
        <li style={{ marginBottom: 10 }}>Selecione &quot;Emitir Guia&quot; e escolha o ano e o mês em atraso.</li>
        <li style={{ marginBottom: 10 }}>O sistema calcula automaticamente multa + juros até a data atual.</li>
        <li style={{ marginBottom: 10 }}>Imprima a guia (DAS-MEI) e pague em qualquer banco ou pelo Pix.</li>
        <li style={{ marginBottom: 10 }}>Guarde o comprovante por 5 anos — pode ser pedido em fiscalização.</li>
      </ul>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Calcular meu custo MEI atual no simulador →
      </Link>

      <H2>Quanto custa um DAS atrasado: simulação</H2>
      <P>
        Suponha um DAS comércio de <Strong>R$ 70,60</Strong> não pago há 90
        dias. A multa aplicada (limitada a 20%) chega ao máximo: R$ 14,12.
        Somando juros Selic do período, o acréscimo total pode passar de R$ 18.
        Você pagaria perto de <Strong>R$ 89</Strong> por uma guia que valia R$
        70,60 originalmente — quase 26% a mais.
      </P>
      <Callout color="orange">
        Acumular 12 meses atrasados em uma só leva. O ideal é gerar e pagar mês
        a mês, ou parcelar — o que é mais barato que deixar a multa crescer.
      </Callout>

      <H2>Risco real: exclusão do Simples Nacional</H2>
      <P>
        O MEI que fica com <Strong>12 meses consecutivos de DAS em atraso</Strong>{' '}
        pode ser excluído de ofício do Simples Nacional na revisão anual da
        Receita. Depois da exclusão, regularizar exige migração para outro
        regime e perdas de benefícios — incluindo a contagem de tempo para
        aposentadoria do INSS naqueles meses.
      </P>
      <P>
        Atrasos pontuais não geram exclusão imediata, mas o monitoramento é
        anual: melhor zerar a inadimplência ao final de cada exercício.
      </P>

      <H2>Como parcelar o DAS atrasado</H2>
      <P>
        Se o acumulado pesar, é possível pedir <Strong>parcelamento via
        Receita Federal</Strong> (e-CAC), normalmente em até 60 parcelas mensais
        com valor mínimo por parcela. O parcelamento mantém o MEI ativo durante
        o pagamento, mas atrasar parcelas pode resultar em rescisão do acordo.
      </P>

      <H2>Erros comuns a evitar</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}><Strong>Pagar só os 12 últimos meses</Strong> e ignorar o restante: a Receita ainda enxerga o atraso anterior.</li>
        <li style={{ marginBottom: 10 }}><Strong>Pagar via boleto vencido antigo</Strong>: a guia precisa estar atualizada para os encargos baterem.</li>
        <li style={{ marginBottom: 10 }}><Strong>Confiar em terceiros</Strong>: existem &quot;regularizadores&quot; cobrando para emitir o que você emite grátis no gov.br.</li>
      </ul>

      <H2>E se eu não estou mais faturando?</H2>
      <P>
        Se a empresa parou de operar, considere o{' '}
        <Link href="/aprenda/desenquadramento-mei" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          desenquadramento do MEI
        </Link>{' '}
        ou a baixa do CNPJ. Continuar com DAS pendente sem operar acumula
        inadimplência sem benefício previdenciário.
      </P>
      <P>
        Para casos onde o motivo do atraso foi ter ultrapassado o teto, veja o
        guia{' '}
        <Link href="/aprenda/mei-estourou-o-teto" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          MEI estourou o teto
        </Link>
        .
      </P>

      <SimulatorCTA
        title="Pense no próximo passo, não só na multa"
        description="O SimulaMEI estima seu enquadramento ideal e mostra se vale continuar como MEI ou migrar para ME — em menos de 1 minuto."
      />

      <Callout color="blue">
        Conteúdo educacional. Sempre confirme decisões tributárias com contador
        credenciado pelo CRC. Valores e alíquotas podem mudar por legislação.
      </Callout>

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
