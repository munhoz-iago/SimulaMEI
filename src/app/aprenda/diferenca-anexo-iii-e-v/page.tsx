import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/diferenca-anexo-iii-e-v'
const ARTICLE_TITLE = 'Anexo III ou Anexo V em 2026: Fator R e imposto menor'
const ARTICLE_DESCRIPTION = 'Entenda a diferença entre Anexo III e Anexo V, quando o Fator R muda a tributação e por que a alíquota inicial pode ir de 6% para 15,5%.'

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

export default function DiferencaAnexoIiiEVPage() {
  return (
    <StaticPageLayout
      title="Anexo III vs Anexo V do Simples Nacional"
      subtitle="Para muitas empresas de serviços, a diferença entre os anexos depende do Fator R. A consequência prática é pagar bem menos ou bem mais imposto sobre a mesma receita."
    >
      <ArticleMeta tag="Simples Nacional · Tributário" readingTime="4 min" />

      <H2>Resumo direto</H2>
      <P>
        O <Strong>Anexo III</Strong> começa com alíquota nominal de 6%. O <Strong>Anexo V</Strong>
        começa em 15,5%. Para atividades de serviços sujeitas ao Fator R, a empresa usa o Anexo III
        quando a folha dos últimos 12 meses representa pelo menos 28% da receita bruta dos últimos
        12 meses. Abaixo disso, usa o Anexo V.
      </P>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Comparar anexos com meus números →
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, marginTop: 24 }}>
        {[
          {
            title: 'Anexo III',
            rate: '6%',
            desc: 'Mais comum para serviços com folha relevante. Pode ser alcançado por Fator R ≥ 28%.',
            color: 'var(--lime)',
          },
          {
            title: 'Anexo V',
            rate: '15,5%',
            desc: 'Usado por serviços com Fator R abaixo de 28% quando a atividade está sujeita à regra.',
            color: 'var(--orange)',
          },
        ].map(item => (
          <div
            key={item.title}
            style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}
          >
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>{item.title}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 900, color: item.color }}>{item.rate}</div>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginTop: 8 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <H2>O que entra no Fator R</H2>
      <P>
        A fórmula compara <Strong>folha de salários dos últimos 12 meses</Strong> com
        <Strong> receita bruta dos últimos 12 meses</Strong>. Pró-labore, salários e encargos
        entram na conta. Distribuição de lucros não entra como folha.
      </P>

      <H2>Por que a decisão não é só aumentar pró-labore</H2>
      <P>
        Aumentar o pró-labore pode levar a empresa para o Anexo III, mas também aumenta INSS e
        pode impactar imposto de renda da pessoa física. O ponto correto é o menor pró-labore que
        melhora o regime sem criar custo maior em outra ponta.
      </P>

      <H2>Quando a comparação importa mais</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Serviços de tecnologia, consultoria, engenharia, arquitetura, saúde e design.</li>
        <li style={{ marginBottom: 10 }}>Empresas que estão saindo do MEI e projetam faturamento acima de R$ 81.000.</li>
        <li style={{ marginBottom: 10 }}>Negócios com pouca folha e muito faturamento concentrado no sócio.</li>
        <li style={{ marginBottom: 10 }}>Empresas que podem contratar ou ajustar pró-labore sem perder margem.</li>
      </ul>

      <H2>Exemplo simples</H2>
      <P>
        Uma empresa de serviços faturou R$ 180.000 em 12 meses. Se tiver folha de R$ 36.000,
        seu Fator R é 20% e ela tende ao Anexo V. Se tiver folha de R$ 54.000, o Fator R sobe
        para 30% e pode levá-la ao Anexo III.
      </P>

      <SimulatorCTA
        title="Compare os anexos com seus números"
        description="O SimulaMEI mostra o anexo provável, a alíquota efetiva e o impacto do Fator R."
      />

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
