import type { Metadata } from 'next'
import Link from 'next/link'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { ArticleJsonLd } from '@/components/seo/ArticleJsonLd'
import { ArticleMeta, Callout, H2, P, SimulatorCTA, Strong } from '@/components/article/Body'

const ARTICLE_PATH = '/aprenda/mei-funcionario'
const ARTICLE_TITLE = 'MEI pode ter funcionário em 2026? Regras completas e custos'
const ARTICLE_DESCRIPTION =
  'O MEI pode contratar 1 funcionário, com salário-mínimo ou piso da categoria. Veja custo total mensal (~R$ 1.700-1.900), folha, FGTS, INSS patronal e quando vale contratar.'

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    'MEI funcionário 2026',
    'MEI contratar empregado',
    'MEI 1 funcionário',
    'custo funcionário MEI',
    'folha MEI',
    'FGTS MEI',
    'INSS patronal MEI',
    'MEI 2 funcionários',
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

export default function MeiFuncionarioPage() {
  return (
    <StaticPageLayout
      title="MEI pode contratar funcionário? Sim — com limites"
      subtitle="A regra é simples: 1 empregado, salário mínimo ou piso da categoria. Passar disso obriga migração para ME. Mas o custo real envolve mais do que só o salário."
    >
      <ArticleMeta tag="MEI · Contratação · Folha" readingTime="6 min" />

      <Callout>
        <strong style={{ display: 'block', marginBottom: 6 }}>TL;DR</strong>
        O MEI pode ter <Strong>até 1 funcionário</Strong>, com remuneração de
        no máximo o salário mínimo ou o piso da categoria profissional (o que
        for maior). Custo total mensal típico: <Strong>cerca de 1,25x o
        salário pago</Strong> — entre R$ 1.700 e R$ 1.900 para 1 funcionário
        no mínimo. Contratar o 2º obriga migração para ME.
      </Callout>

      <H2>A regra do 1 funcionário</H2>
      <P>
        O MEI pode contratar <Strong>1 (um) empregado</Strong>, com salário
        equivalente ao maior entre:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}><Strong>Salário mínimo</Strong> nacional vigente.</li>
        <li style={{ marginBottom: 10 }}><Strong>Piso salarial da categoria</Strong> (definido por sindicato ou convenção coletiva).</li>
      </ul>
      <P>
        Em 2026, o salário mínimo é de aproximadamente R$ 1.518. Algumas
        categorias (vendedor, motorista, técnico) têm piso superior — confira
        a convenção coletiva da sua área antes de contratar.
      </P>

      <H2>Custo real de um funcionário para o MEI</H2>
      <P>
        O salário é só uma parte. O custo mensal total inclui:
      </P>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 20 }}>
        {[
          { item: 'Salário mensal', valor: 'R$ 1.518 (mínimo)' },
          { item: 'FGTS (8% sobre salário)', valor: 'R$ 121,44' },
          { item: 'INSS patronal MEI (3%)', valor: 'R$ 45,54' },
          { item: 'Provisão de 13º (1/12)', valor: 'R$ 126,50' },
          { item: 'Provisão de férias + 1/3 (1/12)', valor: 'R$ 168,67' },
          { item: 'Vale-transporte (até 6% do salário)', valor: 'R$ 91,08' },
          { item: 'Total mensal aproximado', valor: 'R$ 2.071,23', bold: true },
        ].map(r => (
          <div key={r.item} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: r.bold ? 'rgba(200,241,53,0.08)' : 'var(--bg1)',
            border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: r.bold ? 700 : 400 }}>{r.item}</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: r.bold ? 800 : 600, color: r.bold ? 'var(--lime)' : 'var(--text1)' }}>{r.valor}</span>
          </div>
        ))}
      </div>
      <Callout color="orange">
        Esse cálculo é uma aproximação. Convenção coletiva pode adicionar
        cesta básica, plano de saúde ou outros encargos. Sempre verifique a
        convenção da categoria.
      </Callout>

      <Link href="/#simulador" style={{ color: 'var(--lime)', fontWeight: 800 }}>
        Comparar custo MEI com e sem funcionário →
      </Link>

      <H2>INSS patronal do MEI: 3%</H2>
      <P>
        Diferente de empresas comuns (que pagam ~20% de INSS patronal sobre
        folha), o MEI tem <Strong>alíquota reduzida de 3%</Strong> sobre o
        salário do funcionário. Esse é um dos benefícios mais subaproveitados
        do regime.
      </P>

      <H2>Obrigações trabalhistas do MEI empregador</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>Registrar o funcionário na <Strong>eSocial Doméstico Simplificado para MEI</Strong>.</li>
        <li style={{ marginBottom: 10 }}>Emitir <Strong>Carteira de Trabalho Digital</Strong> e assinar o vínculo.</li>
        <li style={{ marginBottom: 10 }}>Pagar salário até o <Strong>5º dia útil</Strong> do mês seguinte.</li>
        <li style={{ marginBottom: 10 }}>Depositar FGTS e GFIP via DAE eSocial.</li>
        <li style={{ marginBottom: 10 }}>Pagar 13º salário (1ª parcela em novembro, 2ª em dezembro).</li>
        <li style={{ marginBottom: 10 }}>Conceder férias (após 12 meses) com 1/3 constitucional.</li>
        <li style={{ marginBottom: 10 }}>Cumprir convenção coletiva (cesta básica, vale-refeição, etc., se exigido).</li>
      </ul>

      <H2>Quando vale a pena contratar como MEI</H2>
      <P>
        Considere o custo total. Para um MEI faturando R$ 6.750/mês (próximo
        ao teto anual), contratar 1 funcionário a R$ 2.071/mês consome ~31%
        do faturamento. Para fazer sentido:
      </P>
      <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
        <li style={{ marginBottom: 10 }}>O funcionário deve gerar receita adicional <Strong>maior que R$ 2.071</Strong>.</li>
        <li style={{ marginBottom: 10 }}>Ou liberar seu tempo para tarefas que tragam, no mínimo, esse retorno.</li>
        <li style={{ marginBottom: 10 }}>Avalie alternativas: prestador autônomo (com nota), terceirização parcial.</li>
      </ul>

      <H2>Quero contratar 2 funcionários. E aí?</H2>
      <P>
        Você precisa <Strong>migrar para ME no Simples Nacional</Strong>. Como
        ME, não há limite de funcionários — mas o INSS patronal pula para
        ~20% sobre folha (não os 3% do MEI). Faça a conta antes de decidir.
      </P>
      <P>
        Para planejar a migração com cabeça fria, veja{' '}
        <Link href="/aprenda/como-sair-do-mei-sem-multa" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          como sair do MEI sem multa
        </Link>
        .
      </P>

      <H2>E pró-labore? Como sócio, posso me pagar?</H2>
      <P>
        Não confunda funcionário com pró-labore. Pró-labore é remuneração do
        sócio, não tem para MEI (você retira lucros direto). Veja{' '}
        <Link href="/aprenda/pro-labore-mei" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          pró-labore no MEI
        </Link>
        .
      </P>

      <H2>Funcionário entra no Fator R se eu virar ME?</H2>
      <P>
        Sim. Em ME no Simples, a folha (incluindo encargos) é fator-chave.
        Funcionários ajudam a atingir Fator R ≥ 28%, levando ao Anexo III mais
        barato. Veja{' '}
        <Link href="/aprenda/fator-r" style={{ color: 'var(--lime)', fontWeight: 700 }}>
          Fator R
        </Link>
        .
      </P>

      <SimulatorCTA
        title="Calcule o impacto de contratar"
        description="O SimulaMEI mostra custo total da folha e simula a transição para ME se você precisar de mais de 1 funcionário."
      />

      <Callout color="blue">
        Conteúdo educacional. Sempre confirme decisões tributárias e
        trabalhistas com contador e advogado especialista. Valores e regras
        podem mudar por legislação ou convenção coletiva.
      </Callout>

      <ArticleJsonLd path={ARTICLE_PATH} headline={ARTICLE_TITLE} description={ARTICLE_DESCRIPTION} />
    </StaticPageLayout>
  )
}
