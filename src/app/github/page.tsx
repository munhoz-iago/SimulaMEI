import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { TAX_RULE_VERSION } from '@/lib/tributario'

export const metadata = {
  title: 'GitHub — SimulaMEI',
  description: 'Transparência técnica, roadmap open source e estado do repositório SimulaMEI.',
}

export default function GithubPage() {
  return (
    <StaticPageLayout
      title="GitHub"
      subtitle="Transparência técnica do motor fiscal e roadmap de abertura do código."
    >
      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', marginBottom: 12 }}>
          Estado atual
        </h2>
        <p style={{ marginBottom: 12 }}>
          O SimulaMEI ainda está em fase de validação técnica. O motor tributário está versionado como{' '}
          <code style={{ color: 'var(--lime)', fontFamily: 'var(--mono)' }}>{TAX_RULE_VERSION}</code>,
          com catálogo oficial de CNAEs sincronizado a partir da CONCLA/IBGE.
        </p>
        <p>
          O repositório público definitivo deve ser publicado quando a licença, a política de contribuição
          e os limites entre código aberto e produto comercial estiverem fechados.
        </p>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', marginBottom: 12 }}>
          O que será aberto
        </h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>Motor de cálculo tributário versionado.</li>
          <li>Scripts de sincronização de CNAEs oficiais.</li>
          <li>Testes de regressão das regras fiscais.</li>
          <li>Documentação de fontes, limites e premissas.</li>
        </ul>
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', marginBottom: 12 }}>
          Contato técnico
        </h2>
        <p>
          Para auditoria, parceria ou acesso antecipado ao repositório, escreva para{' '}
          <a href="mailto:dev@simulamei.com.br" style={{ color: 'var(--lime)' }}>
            dev@simulamei.com.br
          </a>.
        </p>
      </section>
    </StaticPageLayout>
  )
}
