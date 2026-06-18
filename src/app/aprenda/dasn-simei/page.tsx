import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, Callout, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/dasn-simei'
const ARTICLE_TITLE = 'DASN-SIMEI 2026: o que é, prazo e como declarar'
const ARTICLE_DESCRIPTION =
  'A DASN-SIMEI é a declaração anual obrigatória do MEI. Veja o prazo (até 31 de maio), como declarar passo a passo, multa por atraso e o que fazer se sua receita foi zero.'

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    'DASN-SIMEI 2026',
    'declaração anual MEI',
    'declaração MEI prazo',
    'DASN-SIMEI atraso',
    'multa DASN-SIMEI',
    'como declarar MEI',
    'declaração receita MEI',
    'DASN-SIMEI passo a passo',
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

export default function DasnSimeiPage() {
  return (
    <StaticPageLayout
      title="DASN-SIMEI: a declaração anual do MEI"
      subtitle="Mesmo que o MEI já pague DAS mensalmente, ainda precisa fazer uma declaração anual. Perder o prazo gera multa e pode levar a desenquadramento."
    >
      <ArticleMeta tag="MEI · Obrigação Anual" readingTime="5 min" />

      <Callout>
        <strong style={{ display: 'block', marginBottom: 6 }}>TL;DR</strong>
        A DASN-SIMEI declara o <Strong>faturamento total do ano anterior</Strong>{' '}
        e o número de funcionários. Prazo: até <Strong>31 de maio de cada
        ano</Strong>. Faz-se gratuitamente no Portal do Simples Nacional, em
        poucos minutos. Multa por atraso: R$ 50, com 50% de desconto se paga
        dentro do prazo da notificação.
      </Callout>

      <H2>O que é a DASN-SIMEI</H2>
      <P>
        DASN-SIMEI significa <Strong>Declaração Anual do Simples Nacional
        para o MEI</Strong>. É a forma como a Receita Federal sabe quanto sua
        empresa faturou no ano anterior — informação usada para confirmar que
        você está dentro do teto do MEI e que o regime continua adequado.
      </P>
      <P>
        Diferente do DAS (mensal), a DASN-SIMEI é <Strong>anual e
        gratuita</Strong>. Não há imposto a recolher na declaração — só
        prestação de contas.
      </P>

      <H2>Quem é obrigado a declarar</H2>
      <P>
        <Strong>Todo MEI ativo no ano anterior</Strong>. Mesmo que você tenha:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Faturado <Strong>R$ 0</Strong> no ano (declaração de inatividade).</li>
        <li style={{ marginBottom: 10 }}>Aberto o CNPJ no meio do ano.</li>
        <li style={{ marginBottom: 10 }}>Fechado o CNPJ durante o ano — neste caso, a declaração é feita junto à baixa.</li>
        <li style={{ marginBottom: 10 }}>Sido desenquadrado durante o ano (declara o período como MEI).</li>
      </ul>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Calcular minha projeção de faturamento →
      </Link>

      <H2>Prazo de entrega</H2>
      <P>
        O prazo é <Strong>até 31 de maio</Strong> do ano seguinte. Por
        exemplo: a DASN-SIMEI referente ao ano-calendário 2025 vence em
        <Strong> 31 de maio de 2026</Strong>.
      </P>
      <Callout color="orange">
        Datas podem ser ajustadas por instrução normativa. Confirme no Portal
        do Simples Nacional antes do prazo final.
      </Callout>

      <H2>Como declarar: passo a passo</H2>
      <P>
        A declaração é feita 100% online, sem certificado digital:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>
          Acesse <Strong>https://www8.receita.fazenda.gov.br/SimplesNacional/</Strong>{' '}
          ou o Portal do Empreendedor.
        </li>
        <li style={{ marginBottom: 10 }}>Selecione &quot;DASN-SIMEI&quot; e informe o CNPJ + código de acesso.</li>
        <li style={{ marginBottom: 10 }}>Informe a <Strong>receita bruta total</Strong> do ano (soma das notas + recebimentos sem nota).</li>
        <li style={{ marginBottom: 10 }}>Separe a receita por tipo: comércio, indústria, serviços, transporte.</li>
        <li style={{ marginBottom: 10 }}>Informe se teve <Strong>empregado contratado</Strong> no ano (sim/não).</li>
        <li style={{ marginBottom: 10 }}>Confira, transmita e imprima o recibo. Guarde por 5 anos.</li>
      </ul>

      <H2>Como calcular a receita bruta</H2>
      <P>
        A receita bruta inclui <Strong>tudo o que entrou no caixa pela
        atividade</Strong>: vendas, serviços prestados, recebimentos por
        comissão, mesmo sem nota fiscal. <Strong>Não inclui</Strong>:
        empréstimos pessoais, devoluções de clientes, juros bancários
        recebidos.
      </P>
      <Callout>
        Recomendação: mantenha planilha mensal de receita ao longo do ano. Na
        hora de declarar, é só somar 12 meses.
      </Callout>

      <H2>Multa por atraso</H2>
      <P>
        Se você perder o prazo de 31 de maio:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}><Strong>Multa mínima de R$ 50,00</Strong>.</li>
        <li style={{ marginBottom: 10 }}>Multa pode ser de 2% ao mês sobre tributos devidos (geralmente, R$ 0 para MEI, então fica o mínimo).</li>
        <li style={{ marginBottom: 10 }}><Strong>50% de desconto</Strong> se você declarar e pagar antes da notificação da Receita.</li>
      </ul>
      <P>
        Não declarar por <Strong>vários anos consecutivos</Strong> pode levar à
        exclusão de ofício do MEI. Veja{' '}
        <Link href="/aprenda/desenquadramento-mei" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          desenquadramento do MEI
        </Link>
        .
      </P>

      <H2>Erros comuns na DASN-SIMEI</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}><Strong>Esquecer receita sem nota</Strong>: a Receita compara com movimentação bancária. Declare o real.</li>
        <li style={{ marginBottom: 10 }}><Strong>Confundir categoria</Strong>: serviços pagam ISS, comércio paga ICMS. Errar muda o DAS.</li>
        <li style={{ marginBottom: 10 }}><Strong>Não declarar empregado</Strong>: omissão gera multa adicional na Caixa (FGTS) e Receita.</li>
        <li style={{ marginBottom: 10 }}><Strong>Inativo &quot;esqueceu&quot; de declarar</Strong>: mesmo CNPJ parado precisa declarar.</li>
      </ul>

      <H2>O que faz a DASN-SIMEI gerar?</H2>
      <P>
        Depois da declaração, você pode:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}><Strong>Imprimir o recibo</Strong> para guardar.</li>
        <li style={{ marginBottom: 10 }}><Strong>Imprimir o Comprovante de Inscrição e Situação Cadastral</Strong> (útil para bancos).</li>
        <li style={{ marginBottom: 10 }}><Strong>Verificar se estourou o teto</Strong>: se faturou acima de R$ 81.000 (MEI comum), o sistema avisa.</li>
      </ul>

      <H2>Se você estourou o teto durante o ano</H2>
      <P>
        A DASN-SIMEI vai mostrar isso. Daí a importância de planejar a
        transição antes:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>
          <Link href="/aprenda/mei-estourou-o-teto" style={{ color: 'var(--lime)', fontWeight: 700 }}>
            MEI estourou o teto: o que fazer
          </Link>
        </li>
        <li style={{ marginBottom: 10 }}>
          <Link href="/aprenda/como-sair-do-mei-sem-multa" style={{ color: 'var(--lime)', fontWeight: 700 }}>
            Como sair do MEI sem multa
          </Link>
        </li>
      </ul>

      <SimulatorCTA
        title="Planeje sua próxima DASN com antecedência"
        description="O SimulaMEI projeta seu faturamento anual em segundos. Saiba se vai cumprir o teto antes de chegar maio."
      />

      <Callout color="blue">
        Conteúdo educacional. Sempre confirme decisões tributárias com contador
        credenciado pelo CRC. Valores e alíquotas podem mudar por legislação.
      </Callout>

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
