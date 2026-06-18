import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, Callout, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/desenquadramento-mei'
const ARTICLE_TITLE = 'MEI desenquadrado em 2026: o que acontece e como reverter'
const ARTICLE_DESCRIPTION =
  'Foi desenquadrado do MEI? Entenda a diferença entre desenquadramento por opção e de ofício, o que muda em impostos e contribuições, e quando dá para voltar a ser MEI.'

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    'MEI desenquadrado',
    'desenquadramento MEI',
    'perdi o MEI',
    'reverter desenquadramento',
    'sair do MEI',
    'voltar para o MEI',
    'desenquadramento de ofício',
    'opção de desenquadramento MEI',
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

export default function DesenquadramentoMeiPage() {
  return (
    <StaticPageLayout
      title="MEI desenquadrado: o que isso significa, na prática"
      subtitle="Desenquadramento pode ser bom (sinal de crescimento) ou ruim (perda de benefícios sem planejamento). A diferença está em quem puxou o gatilho."
    >
      <ArticleMeta tag="MEI · Desenquadramento" readingTime="6 min" />

      <Callout>
        <strong style={{ display: 'block', marginBottom: 6 }}>TL;DR</strong>
        Desenquadrar do MEI significa deixar de ser MEI e passar a apurar
        impostos como ME ou EPP no Simples Nacional (ou em outro regime). Pode
        ser por opção (você decide), por comunicação obrigatória (estourou
        teto, abriu filial, etc.) ou de ofício (Receita exclui sem você pedir).
        O efeito normalmente começa em 1º de janeiro seguinte; se o motivo foi
        excesso superior a 20%, pode ser retroativo.
      </Callout>

      <H2>O que é o desenquadramento</H2>
      <P>
        O desenquadramento é o ato administrativo que tira a empresa do regime
        MEI. A partir dele, o CNPJ continua ativo, mas <Strong>passa a apurar
        tributos como ME (Microempresa) ou EPP (Empresa de Pequeno Porte)</Strong>{' '}
        no Simples Nacional — ou, dependendo da escolha, em outro regime como
        Lucro Presumido.
      </P>

      <H2>Os três tipos de desenquadramento</H2>
      <P>
        Entender em qual cenário você está muda completamente o que precisa
        fazer:
      </P>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 20 }}>
        {[
          {
            tipo: 'Por opção',
            cor: 'var(--lime)',
            desc: 'Você mesmo solicita no Portal do Empreendedor. Geralmente porque quer crescer, contratar mais ou emitir nota com mais flexibilidade. Efeito a partir de 1º de janeiro do ano seguinte.',
          },
          {
            tipo: 'Por comunicação obrigatória',
            cor: 'var(--yellow)',
            desc: 'Você é obrigado a comunicar dentro de prazos legais. Causas: estourar o teto, contratar mais de um funcionário, ter sócio, abrir filial, atividade não permitida.',
          },
          {
            tipo: 'De ofício',
            cor: 'var(--orange)',
            desc: 'A Receita exclui sem você solicitar, geralmente por inadimplência (12 meses de DAS atrasado) ou irregularidade cadastral. Costuma vir com retroatividade e cobrança de tributos não recolhidos.',
          },
        ].map(item => (
          <div
            key={item.tipo}
            style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}
          >
            <div style={{ fontSize: 12, color: item.cor, marginBottom: 6, fontWeight: 700 }}>{item.tipo}</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Ver o regime mais barato depois do MEI →
      </Link>

      <H2>O que muda em impostos após o desenquadramento</H2>
      <P>
        Como MEI, você paga o DAS fixo (~R$ 70-85/mês). Após o desenquadramento
        como ME no Simples Nacional, a tributação passa a ser{' '}
        <Strong>proporcional ao faturamento</Strong>, com alíquotas iniciais a
        partir de 4% (comércio, Anexo I) ou 6% (serviços, Anexo III) — e até
        15,5% se cair no Anexo V por baixo Fator R.
      </P>
      <P>
        Para muitas empresas, a mudança é vantajosa porque permite faturar
        muito mais. Para outras, especialmente serviços com pouca folha, pode
        gerar imposto considerável.
      </P>

      <H2>Posso voltar a ser MEI depois?</H2>
      <P>
        Em geral, <Strong>sim</Strong>, desde que a empresa volte a atender aos
        requisitos do MEI: faturamento dentro do teto, no máximo um empregado,
        atividade permitida, sem sócios. A opção pelo regime MEI pode ser feita
        no Portal do Empreendedor.
      </P>
      <Callout color="orange">
        Empresas excluídas <Strong>de ofício por inadimplência</Strong>{' '}
        precisam quitar débitos antes de retornar. Reaver o MEI sem zerar
        pendências é raro.
      </Callout>

      <H2>Passo a passo se você foi desenquadrado de ofício</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Verifique o motivo no e-CAC (Receita Federal) ou Portal do Simples.</li>
        <li style={{ marginBottom: 10 }}>Liste todos os DAS em aberto. Considere regularizar via{' '}
          <Link href="/aprenda/das-atrasado-mei" style={{ color: 'var(--lime)', fontWeight: 700 }}>parcelamento do DAS</Link>.</li>
        <li style={{ marginBottom: 10 }}>Apure imposto retroativo como ME/EPP com ajuda de contador (não tente sozinho).</li>
        <li style={{ marginBottom: 10 }}>Avalie se vale voltar para o MEI ou seguir como ME — simule.</li>
        <li style={{ marginBottom: 10 }}>Comunique a regularização à Receita.</li>
      </ul>

      <H2>E se eu errei e desenquadrei sem precisar?</H2>
      <P>
        Desenquadramento por opção feito por engano normalmente só pode ser
        revertido <Strong>na próxima janela de opção pelo MEI</Strong>{' '}
        (geralmente até o fim de janeiro do ano seguinte). Durante o intervalo,
        você apura como ME.
      </P>
      <P>
        Para entender se você se enquadra nas hipóteses de desenquadramento
        obrigatório, veja{' '}
        <Link href="/aprenda/quando-sair-do-mei" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          quando devo sair do MEI
        </Link>
        .
      </P>

      <H2>Se você ainda está dentro do limite, mas perto</H2>
      <P>
        Pode ser melhor planejar uma migração antecipada do que sofrer
        desenquadramento de ofício. Leia{' '}
        <Link href="/aprenda/como-sair-do-mei-sem-multa" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          como sair do MEI sem multa
        </Link>
        .
      </P>

      <SimulatorCTA
        title="Veja qual regime te custa menos depois do MEI"
        description="O SimulaMEI compara Simples Nacional, Lucro Presumido e Lucro Real para o seu faturamento real. Em menos de 1 minuto, sem cadastro."
      />

      <Callout color="blue">
        Conteúdo educacional. Sempre confirme decisões tributárias com contador
        credenciado pelo CRC. Valores e alíquotas podem mudar por legislação.
      </Callout>

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
