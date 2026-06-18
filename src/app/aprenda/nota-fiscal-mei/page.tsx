import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, Callout, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/nota-fiscal-mei'
const ARTICLE_TITLE = 'Como emitir nota fiscal sendo MEI em 2026: NFe e NFS-e'
const ARTICLE_DESCRIPTION =
  'MEI emite nota fiscal? Quando precisa? Qual diferença entre NFe (produto) e NFS-e (serviço)? Passo a passo, ferramentas gratuitas e o que muda em vendas para PJ x PF.'

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    'MEI nota fiscal eletrônica',
    'NFe MEI',
    'NFS-e MEI',
    'como emitir nota MEI',
    'MEI emissão nota fiscal',
    'nota fiscal serviço MEI',
    'aplicativo emissor MEI',
    'MEI nota para PJ',
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

export default function NotaFiscalMeiPage() {
  return (
    <StaticPageLayout
      title="Como emitir nota fiscal sendo MEI"
      subtitle="MEI pode (e às vezes deve) emitir nota fiscal eletrônica. A diferença entre NFe e NFS-e e o passo a passo de emissão sem custo."
    >
      <ArticleMeta tag="MEI · Nota Fiscal" readingTime="6 min" />

      <Callout>
        <strong style={{ display: 'block', marginBottom: 6 }}>TL;DR</strong>
        Para <Strong>vendas a pessoa física</Strong>, a nota fiscal{' '}
        <Strong>não é obrigatória</Strong> — mas é recomendada. Para vendas a
        <Strong> pessoa jurídica (PJ)</Strong>, a emissão é{' '}
        <Strong>obrigatória</Strong>. O MEI emite NFe (Nota Fiscal Eletrônica
        para produtos) ou NFS-e (Nota Fiscal de Serviço Eletrônica) — ambas
        com emissor gratuito governamental, sem necessidade de certificado
        digital pago para a maioria dos casos.
      </Callout>

      <H2>Quando o MEI precisa emitir nota fiscal</H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Cliente PF</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--lime)' }}>Opcional</div>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, lineHeight: 1.5 }}>
            Não é obrigatória, mas dá legalidade à venda e ajuda a comprovar receita.
          </p>
        </div>
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Cliente PJ</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--orange)' }}>Obrigatória</div>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, lineHeight: 1.5 }}>
            Toda venda para empresa (PJ) exige NFe ou NFS-e — a empresa precisa para abater do imposto.
          </p>
        </div>
      </div>

      <H2>NFe vs NFS-e: qual usar</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>
          <Strong>NFe (Nota Fiscal Eletrônica)</Strong>: para venda de{' '}
          <Strong>produtos/mercadorias</Strong>. Modelo 55. Emitida pelo portal
          da SEFAZ do estado.
        </li>
        <li style={{ marginBottom: 10 }}>
          <Strong>NFS-e (Nota Fiscal de Serviços Eletrônica)</Strong>: para
          prestação de <Strong>serviços</Strong>. Emitida pela prefeitura.
        </li>
        <li style={{ marginBottom: 10 }}>
          <Strong>NFC-e (Cupom Fiscal Eletrônico)</Strong>: para varejo direto
          ao consumidor. Substitui o cupom fiscal físico.
        </li>
        <li style={{ marginBottom: 10 }}>
          <Strong>CT-e / MDF-e</Strong>: transporte de cargas (MEI
          caminhoneiro). Veja{' '}
          <Link href="/aprenda/mei-caminhoneiro" style={{ color: 'var(--lime)', fontWeight: 700 }}>
            MEI caminhoneiro
          </Link>
          .
        </li>
      </ul>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Calcular seu MEI no simulador →
      </Link>

      <H2>Como emitir NFS-e (serviço)</H2>
      <P>
        Em 2026, existe o <Strong>Emissor Nacional de NFS-e</Strong> (gov.br),
        disponível para MEIs em todo o país via app mobile e portal web.
        Passo a passo:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>
          Acesse <Strong>https://www.nfse.gov.br</Strong> ou baixe o app{' '}
          <Strong>NFS-e Mobile</Strong>.
        </li>
        <li style={{ marginBottom: 10 }}>Login via gov.br (cadastro ou senha existentes).</li>
        <li style={{ marginBottom: 10 }}>Selecione &quot;Emitir nota&quot;.</li>
        <li style={{ marginBottom: 10 }}>Preencha: tomador (CNPJ ou CPF), descrição do serviço, valor.</li>
        <li style={{ marginBottom: 10 }}>O sistema preenche CNAE, ISS e código tributário automaticamente.</li>
        <li style={{ marginBottom: 10 }}>Emita. A nota é enviada por e-mail ao tomador.</li>
      </ul>
      <Callout>
        Algumas prefeituras ainda usam emissor próprio em vez do Emissor
        Nacional. Confira no site da prefeitura ou ligue para o setor de
        tributos antes da primeira emissão.
      </Callout>

      <H2>Como emitir NFe (produto)</H2>
      <P>
        Para venda de mercadorias, o MEI precisa:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}><Strong>Inscrição estadual</Strong> (gratuita; solicite na Sefaz do estado).</li>
        <li style={{ marginBottom: 10 }}>Usar o <Strong>emissor gratuito da Sefaz</Strong> do estado, ou um sistema integrado.</li>
        <li style={{ marginBottom: 10 }}>Para emissão pelo emissor da Sefaz, normalmente é necessário <Strong>certificado digital A1 ou A3</Strong> — custo entre R$ 150 e R$ 400/ano.</li>
        <li style={{ marginBottom: 10 }}>Alguns estados oferecem <Strong>NFA-e (avulsa)</Strong> sem certificado para emissão esporádica.</li>
      </ul>

      <H2>Quanto custa emitir nota como MEI</H2>
      <P>
        Para serviços (NFS-e): <Strong>gratuito</Strong> pelo Emissor
        Nacional ou pelo portal da prefeitura.
      </P>
      <P>
        Para produtos (NFe): pode ser gratuito (NFA-e) ou ter custo de
        certificado digital (R$ 150-400/ano). Sistemas integrados pagos (Bling,
        ContaAzul, etc.) começam em R$ 30-50/mês — vale a pena se você emite
        mais de 10 notas/mês.
      </P>

      <H2>Erros comuns ao emitir</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}><Strong>CNAE incorreto</Strong>: emitir nota com atividade que não está no cadastro do MEI gera rejeição ou multa. Veja{' '}
          <Link href="/aprenda/segundo-cnae-mei" style={{ color: 'var(--lime)', fontWeight: 700 }}>como adicionar CNAE secundário</Link>.
        </li>
        <li style={{ marginBottom: 10 }}><Strong>Não emitir para PJ</Strong>: o cliente pode reportar à Receita, gerando autuação.</li>
        <li style={{ marginBottom: 10 }}><Strong>Não declarar a receita na DASN</Strong>: a Receita cruza notas emitidas. Veja{' '}
          <Link href="/aprenda/dasn-simei" style={{ color: 'var(--lime)', fontWeight: 700 }}>DASN-SIMEI</Link>.
        </li>
        <li style={{ marginBottom: 10 }}><Strong>Emissão acima do teto</Strong>: se o valor anual de notas passa R$ 81.000, o desenquadramento é praticamente automático na revisão.</li>
      </ul>

      <H2>Posso emitir nota fiscal de R$ 0,01?</H2>
      <P>
        Tecnicamente sim, mas não há motivo prático para isso. A nota fiscal
        é prova de uma operação comercial real. Para clientes que pedem
        &quot;nota de cortesia&quot; ou &quot;nota sem valor&quot;, oriente
        que a operação precisa ter valor real declarado.
      </P>

      <H2>E quando virar ME?</H2>
      <P>
        Como ME, a emissão de NFe se torna obrigatória para mais cenários e
        as ferramentas de gestão fiscal ficam mais robustas. Você precisará
        de certificado digital e provavelmente contratará software de gestão.
        Veja{' '}
        <Link href="/aprenda/como-sair-do-mei-sem-multa" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          como sair do MEI sem multa
        </Link>
        .
      </P>

      <SimulatorCTA
        title="Simule seu MEI antes da próxima nota"
        description="O SimulaMEI mostra se você está perto do teto ou se está na hora de virar ME — em menos de 1 minuto."
      />

      <Callout color="blue">
        Conteúdo educacional. Sempre confirme decisões tributárias com contador
        credenciado pelo CRC. Valores e alíquotas podem mudar por legislação.
      </Callout>

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
