import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, Callout, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/segundo-cnae-mei'
const ARTICLE_TITLE = 'MEI pode ter 2 atividades? Como funciona o CNAE secundário em 2026'
const ARTICLE_DESCRIPTION =
  'Sim, o MEI pode ter até 1 CNAE principal e múltiplos secundários (até 15, geralmente). Veja regras, como adicionar, impacto no DAS e atividades não permitidas.'

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    'MEI segundo CNAE',
    'MEI duas atividades',
    'CNAE secundário MEI',
    'MEI múltiplas atividades',
    'adicionar CNAE MEI',
    'MEI 15 atividades',
    'atividades MEI 2026',
    'mudar CNAE MEI',
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

export default function SegundoCnaeMeiPage() {
  return (
    <StaticPageLayout
      title="MEI pode ter mais de uma atividade?"
      subtitle="Resposta curta: sim. O MEI tem 1 atividade principal e pode adicionar várias secundárias — desde que todas estejam na lista de CNAEs permitidos."
    >
      <ArticleMeta tag="MEI · CNAE · Atividades" readingTime="5 min" />

      <Callout>
        <strong style={{ display: 'block', marginBottom: 6 }}>TL;DR</strong>
        O MEI pode ter <Strong>1 atividade principal e várias secundárias</Strong>{' '}
        (atualmente até 15 CNAEs no total). Todas precisam estar na lista de
        CNAEs permitidos para MEI. O DAS leva em conta a natureza da atividade
        principal (comércio, serviço ou transporte) para definir os tributos
        embutidos. Adicionar ou remover CNAEs é gratuito no Portal do
        Empreendedor.
      </Callout>

      <H2>O básico: CNAE principal vs secundário</H2>
      <P>
        Todo CNPJ tem 1 <Strong>CNAE principal</Strong> — a atividade que
        gera a maior parte da receita. Além disso, pode ter CNAEs{' '}
        <Strong>secundários</Strong> — outras atividades exercidas, mesmo
        que representem fatia menor do faturamento.
      </P>
      <P>
        Para o MEI, a regra atual permite incluir até <Strong>15 CNAEs no
        total</Strong> (1 principal + 14 secundários), todos eles precisando
        estar na lista de CNAEs permitidos para o regime.
      </P>

      <H2>Por que ter mais de um CNAE</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}><Strong>Flexibilidade de faturamento:</Strong> emitir nota para clientes em diferentes nichos.</li>
        <li style={{ marginBottom: 10 }}><Strong>Adicionar comércio a serviço (ou vice-versa):</Strong> ex. cabeleireiro que também vende cosméticos.</li>
        <li style={{ marginBottom: 10 }}><Strong>Aproveitar oportunidades:</Strong> testar nova linha sem abrir outro CNPJ.</li>
        <li style={{ marginBottom: 10 }}><Strong>Não perder cliente:</Strong> se um cliente pede serviço que não está na sua principal, com CNAE secundário você atende.</li>
      </ul>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Ver CNAEs permitidos no simulador →
      </Link>

      <H2>Quais CNAEs o MEI pode ter</H2>
      <P>
        A lista de CNAEs permitidos para o MEI é definida pela Resolução do
        Comitê Gestor do Simples Nacional (CGSN). Atividades vedadas incluem:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Atividades regulamentadas por conselho (advocacia, medicina, engenharia, contabilidade).</li>
        <li style={{ marginBottom: 10 }}>Atividades intelectuais ou de profissão regulamentada.</li>
        <li style={{ marginBottom: 10 }}>Importação e exportação de mercadorias.</li>
        <li style={{ marginBottom: 10 }}>Atividades financeiras.</li>
        <li style={{ marginBottom: 10 }}>Locação de imóveis próprios (em geral).</li>
      </ul>
      <P>
        Para a lista completa, consulte o{' '}
        <Link href="/aprenda/cnae-mei-permitido" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          guia de CNAEs permitidos para MEI em 2026
        </Link>
        .
      </P>

      <H2>Impacto no DAS de ter mais de uma atividade</H2>
      <P>
        O DAS do MEI <Strong>não muda de valor</Strong> só porque você tem
        múltiplos CNAEs. O que muda é a <Strong>composição dos
        tributos</Strong> embutidos:
      </P>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { tipo: 'Só comércio', das: 'INSS + ICMS' },
          { tipo: 'Só serviço', das: 'INSS + ISS' },
          { tipo: 'Comércio + serviço', das: 'INSS + ICMS + ISS' },
          { tipo: 'Transporte', das: 'INSS + ICMS (interestadual)' },
        ].map(r => (
          <div key={r.tipo} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>{r.tipo}</div>
            <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 700 }}>{r.das}</div>
          </div>
        ))}
      </div>
      <P>
        A diferença de valor é pequena (poucos reais por mês), refletindo a
        soma dos tributos da atividade.
      </P>

      <H2>Como adicionar um CNAE secundário</H2>
      <P>
        Passo a passo no Portal do Empreendedor (gov.br):
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Acesse &quot;Já sou MEI&quot; → &quot;Atualização Cadastral&quot;.</li>
        <li style={{ marginBottom: 10 }}>Selecione &quot;Alteração de atividades&quot;.</li>
        <li style={{ marginBottom: 10 }}>Adicione os CNAEs secundários desejados (busque por palavra-chave).</li>
        <li style={{ marginBottom: 10 }}>Confira se todas as atividades selecionadas são permitidas para MEI.</li>
        <li style={{ marginBottom: 10 }}>Confirme. A alteração tem efeito imediato.</li>
      </ul>
      <Callout>
        Você pode <Strong>adicionar, remover ou trocar</Strong> CNAEs
        ilimitadamente, sem custo. Só não pode adicionar atividade vedada —
        nesse caso, precisa migrar para ME.
      </Callout>

      <H2>Cuidado: atividade exercida não declarada</H2>
      <P>
        Exercer atividade que <Strong>não está no seu CNAE registrado</Strong>{' '}
        é irregularidade. Em fiscalização, pode resultar em:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Multa por exercício de atividade não autorizada.</li>
        <li style={{ marginBottom: 10 }}>Recusa de nota fiscal pelo cliente (que precisa do CNAE certo na nota).</li>
        <li style={{ marginBottom: 10 }}>Desenquadramento se a atividade exercida não for permitida ao MEI.</li>
      </ul>
      <P>
        Regra prática: <Strong>antes de aceitar um novo tipo de serviço,
        confira se o CNAE está no cadastro</Strong>. Se não está, adicione no
        Portal do Empreendedor.
      </P>

      <H2>E quando adicionar uma atividade vedada ao MEI?</H2>
      <P>
        Se você quer exercer atividade que não é permitida ao MEI (ex.
        advocacia, engenharia, importação), a única saída é migrar para ME.
        Veja{' '}
        <Link href="/aprenda/como-sair-do-mei-sem-multa" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          como sair do MEI sem multa
        </Link>
        .
      </P>

      <SimulatorCTA
        title="Veja se seu CNAE está dentro do MEI"
        description="O SimulaMEI tem a lista completa de CNAEs permitidos e mostra qual regime é mais barato para sua combinação."
      />

      <Callout color="blue">
        Conteúdo educacional. Sempre confirme decisões tributárias com contador
        credenciado pelo CRC. Valores e alíquotas podem mudar por legislação.
      </Callout>

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
