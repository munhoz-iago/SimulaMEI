import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, Callout, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/cnae-mei-permitido'
const ARTICLE_TITLE = 'CNAEs permitidos para MEI em 2026: lista e como consultar'
const ARTICLE_DESCRIPTION =
  'Mais de 450 CNAEs são permitidos para MEI em 2026. Veja a lista das categorias mais comuns, atividades vedadas, ferramentas oficiais de consulta e como escolher o CNAE certo.'

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    'CNAE MEI 2026',
    'atividades permitidas MEI',
    'lista CNAE MEI',
    'CNAE permitido',
    'CNAE proibido MEI',
    'consulta CNAE MEI',
    'escolher CNAE MEI',
    'atividades vedadas MEI',
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

export default function CnaeMeiPermitidoPage() {
  return (
    <StaticPageLayout
      title="CNAEs permitidos para MEI em 2026"
      subtitle="Mais de 450 atividades cabem no MEI. Lista por categorias, regras de inclusão e o que faz uma atividade ser vedada."
    >
      <ArticleMeta tag="MEI · CNAE · Atividades" readingTime="7 min" />

      <Callout>
        <strong style={{ display: 'block', marginBottom: 6 }}>TL;DR</strong>
        A lista de CNAEs permitidos para MEI é definida pelo Comitê Gestor do
        Simples Nacional (Resolução CGSN) e atualizada periodicamente. Atualmente
        contempla mais de <Strong>450 atividades</Strong>, divididas em
        comércio, serviços, indústria e transporte. Atividades regulamentadas
        por conselho profissional (advocacia, medicina, engenharia, contabilidade)
        <Strong> não podem ser MEI</Strong>. Para verificar uma atividade
        específica, use o Portal do Empreendedor.
      </Callout>

      <H2>O que é o CNAE</H2>
      <P>
        CNAE (Classificação Nacional de Atividades Econômicas) é o código que
        identifica oficialmente a atividade econômica de uma empresa. Tem o
        formato <Strong>0000-0/00</Strong> (ex. 6201-5/01 para
        desenvolvimento de software sob encomenda).
      </P>
      <P>
        Para o MEI, só pode escolher CNAEs da{' '}
        <Strong>lista de atividades permitidas</Strong> publicada pelo CGSN
        (Comitê Gestor do Simples Nacional).
      </P>

      <H2>Como consultar a lista oficial</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>
          <Strong>Portal do Empreendedor</Strong>:{' '}
          gov.br/empresas-e-negocios/pt-br/empreendedor — busca por palavra-chave da atividade.
        </li>
        <li style={{ marginBottom: 10 }}>
          <Strong>Receita Federal</Strong>: tabela completa CNAE-Fiscal anexa
          às resoluções do CGSN.
        </li>
        <li style={{ marginBottom: 10 }}>
          <Strong>SimulaMEI</Strong>: consulta gratuita com filtro por nome ou
          código.{' '}
          <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 700 }}>
            Buscar CNAE no simulador
          </Link>
          .
        </li>
      </ul>

      <H2>CNAEs MEI mais comuns por categoria</H2>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>Comércio</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 6 }}>4520-0/01 — Serviços de manutenção e reparação mecânica de veículos</li>
        <li style={{ marginBottom: 6 }}>4789-0/04 — Comércio varejista de artigos de tapeçaria</li>
        <li style={{ marginBottom: 6 }}>4781-4/00 — Comércio varejista de artigos do vestuário</li>
        <li style={{ marginBottom: 6 }}>4763-6/01 — Comércio varejista de brinquedos</li>
      </ul>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>Serviços</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 6 }}>6201-5/01 — Desenvolvimento de software sob encomenda</li>
        <li style={{ marginBottom: 6 }}>9602-5/01 — Cabeleireiros, manicure e pedicure</li>
        <li style={{ marginBottom: 6 }}>9602-5/02 — Atividades de estética e tratamento de beleza</li>
        <li style={{ marginBottom: 6 }}>7319-0/02 — Promoção de vendas</li>
        <li style={{ marginBottom: 6 }}>7420-0/01 — Atividades de produção de fotografias</li>
        <li style={{ marginBottom: 6 }}>9609-2/04 — Exploração de máquinas de jogos eletrônicos (com restrições)</li>
      </ul>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>Indústria / Produção</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 6 }}>1011-2/01 — Frigorífico de abate de bovinos (pequeno porte)</li>
        <li style={{ marginBottom: 6 }}>1412-6/02 — Confecção sob medida de peças do vestuário</li>
        <li style={{ marginBottom: 6 }}>1532-7/00 — Fabricação de artigos de viagem</li>
      </ul>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>Transporte</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 6 }}>4930-2/02 — Transporte rodoviário de carga (MEI caminhoneiro)</li>
        <li style={{ marginBottom: 6 }}>4923-0/01 — Serviço de táxi (em alguns estados)</li>
      </ul>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Buscar todos os CNAEs do MEI no simulador →
      </Link>

      <H2>Atividades vedadas: por que algumas não podem ser MEI</H2>
      <P>
        Algumas atividades, mesmo de pequeno porte, <Strong>não podem ser
        MEI</Strong> por razões legais ou regulatórias:
      </P>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>1. Atividades regulamentadas por conselho profissional</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 6 }}>Advocacia (OAB)</li>
        <li style={{ marginBottom: 6 }}>Medicina, odontologia, psicologia (CFM, CFO, CFP)</li>
        <li style={{ marginBottom: 6 }}>Engenharia, arquitetura (CREA, CAU)</li>
        <li style={{ marginBottom: 6 }}>Contabilidade (CRC)</li>
        <li style={{ marginBottom: 6 }}>Jornalismo, economia (Conselhos regionais)</li>
      </ul>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>2. Atividades financeiras</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 6 }}>Bancos, corretoras, factoring</li>
        <li style={{ marginBottom: 6 }}>Cobrança e factoring</li>
        <li style={{ marginBottom: 6 }}>Cessão de créditos</li>
      </ul>

      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>3. Outras vedadas</p>
      <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
        <li style={{ marginBottom: 6 }}>Importação e exportação de mercadorias (com exceções pontuais)</li>
        <li style={{ marginBottom: 6 }}>Cessão de mão de obra (terceirização)</li>
        <li style={{ marginBottom: 6 }}>Locação de imóveis próprios (em geral)</li>
        <li style={{ marginBottom: 6 }}>Loteria, jogos de azar</li>
        <li style={{ marginBottom: 6 }}>Atividades intelectuais que exigem profissão regulamentada</li>
      </ul>

      <H2>Mudanças recentes na lista de CNAEs MEI</H2>
      <P>
        O CGSN revisa a lista <Strong>periodicamente</Strong>. Atividades
        podem entrar ou sair. Exemplos de mudanças nos últimos anos:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Algumas atividades foram <Strong>removidas</Strong> por sobreposição com profissão regulamentada.</li>
        <li style={{ marginBottom: 10 }}>Outras foram <Strong>adicionadas</Strong> para acompanhar novos mercados (atividades digitais, produção criativa).</li>
        <li style={{ marginBottom: 10 }}>O <Strong>MEI caminhoneiro</Strong> foi criado em 2018, com teto distinto. Veja{' '}
          <Link href="/aprenda/mei-caminhoneiro" style={{ color: 'var(--lime)', fontWeight: 700 }}>MEI caminhoneiro</Link>.
        </li>
      </ul>

      <H2>Como escolher o CNAE certo</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}><Strong>Comece pela atividade principal</Strong>: a que vai gerar maior receita.</li>
        <li style={{ marginBottom: 10 }}><Strong>Adicione secundárias</Strong> que você vai exercer com frequência. Veja{' '}
          <Link href="/aprenda/segundo-cnae-mei" style={{ color: 'var(--lime)', fontWeight: 700 }}>MEI com 2 atividades</Link>.
        </li>
        <li style={{ marginBottom: 10 }}><Strong>Confira o tipo de tributo</Strong>: serviço (ISS) vs comércio (ICMS) muda o DAS.</li>
        <li style={{ marginBottom: 10 }}><Strong>Pense no futuro</Strong>: se planeja expandir para atividade vedada, considere abrir ME já.</li>
      </ul>

      <H2>Quero exercer uma atividade que não é permitida ao MEI</H2>
      <P>
        Você tem duas opções:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>
          <Strong>Migrar para ME</Strong> no Simples Nacional. Veja{' '}
          <Link href="/aprenda/como-sair-do-mei-sem-multa" style={{ color: 'var(--lime)', fontWeight: 700 }}>
            como sair do MEI sem multa
          </Link>
          .
        </li>
        <li style={{ marginBottom: 10 }}>
          <Strong>Abrir um segundo CNPJ</Strong> (ME) e manter o MEI ativo só
          para a atividade permitida — <Strong>só funciona em casos
          específicos</Strong>; em geral, não é vantajoso.
        </li>
      </ul>

      <H2>Calculadora oficial de elegibilidade</H2>
      <P>
        O Portal do Empreendedor tem um <Strong>simulador oficial</Strong> que
        verifica se sua atividade desejada é permitida ao MEI. Sempre confirme
        nele antes de formalizar — a regra muda por resolução do CGSN.
      </P>

      <SimulatorCTA
        title="Veja se sua atividade cabe no MEI"
        description="O SimulaMEI tem busca por CNAE com lista 2026 atualizada e mostra qual regime é mais barato para sua combinação."
      />

      <Callout color="blue">
        Conteúdo educacional. A lista de CNAEs permitidos é regulamentada pela
        Resolução CGSN e pode mudar. Sempre confirme no Portal do Empreendedor
        antes de tomar decisões cadastrais. Confirme decisões tributárias com
        contador credenciado pelo CRC.
      </Callout>

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
