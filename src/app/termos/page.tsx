import { StaticPageLayout } from '@/components/layout/StaticPageLayout'

export const metadata = {
  title: 'Termos de Uso — SimulaMEI',
  description: 'Termos e condições de uso do SimulaMEI.',
  robots: { index: false, follow: true },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: 12 }}>{children}</p>
}

export default function TermosPage() {
  const updated = '29 de abril de 2026'

  return (
    <StaticPageLayout
      title="Termos de Uso"
      subtitle={`Última atualização: ${updated}. Leia com atenção antes de usar o SimulaMEI.`}
    >
      <Section title="1. Aceitação dos termos">
        <P>
          Ao acessar ou usar o SimulaMEI, você concorda com estes Termos de Uso. Se não concordar
          com qualquer parte destes termos, não utilize o serviço.
        </P>
      </Section>

      <Section title="2. O que é o SimulaMEI">
        <P>
          O SimulaMEI é uma ferramenta de simulação tributária com caráter exclusivamente educacional
          e informativo. Os resultados apresentados são estimativas baseadas nas regras vigentes do
          Simples Nacional e não constituem assessoria, consultoria ou parecer contábil/jurídico.
        </P>
        <P>
          <strong style={{ color: 'var(--text1)' }}>
            Sempre confirme as decisões tributárias com um contador credenciado pelo CRC.
          </strong>
        </P>
      </Section>

      <Section title="3. Limitações e isenção de responsabilidade">
        <P>O SimulaMEI não se responsabiliza por:</P>
        <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
          {[
            'Decisões tributárias tomadas com base nas simulações sem validação profissional.',
            'Desatualização temporária das tabelas em caso de alteração legislativa não publicada.',
            'Diferenças entre a simulação e os cálculos efetivos do PGDAS-D (sistema oficial da RFB).',
            'Erros decorrentes de dados incorretos informados pelo usuário.',
            'Indisponibilidade do serviço por manutenção, falha técnica ou força maior.',
          ].map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
        </ul>
      </Section>

      <Section title="4. Uso permitido">
        <P>Você pode usar o SimulaMEI para:</P>
        <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
          {[
            'Simular cenários tributários para fins de planejamento pessoal.',
            'Comparar regimes de tributação (Simples Nacional, Lucro Presumido, Lucro Real).',
            'Entender o impacto do Fator R no Simples Nacional.',
            'Integrar via API pública (conforme limites do seu plano).',
          ].map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
        </ul>
      </Section>

      <Section title="5. Uso proibido">
        <P>É expressamente proibido:</P>
        <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
          {[
            'Usar scraping automatizado sem autorização prévia por escrito.',
            'Tentar contornar limites de rate limiting da API.',
            'Revender ou redistribuir os resultados das simulações como produto próprio.',
            'Usar o serviço para fins ilegais ou fraudulentos.',
            'Tentar acessar dados de outros usuários.',
          ].map((item, i) => <li key={i} style={{ marginBottom: 6 }}>{item}</li>)}
        </ul>
      </Section>

      <Section title="6. Propriedade intelectual">
        <P>
          O código do motor tributário é disponibilizado como open source sob licença MIT (repositório
          público no GitHub). A marca SimulaMEI, o design e os textos do produto são de propriedade
          exclusiva e não podem ser reproduzidos sem autorização.
        </P>
      </Section>

      <Section title="7. API pública">
        <P>
          O uso da API pública está sujeito a termos específicos de cada plano (Free / Pro).
          Violações dos limites de uso podem resultar em suspensão temporária ou permanente do acesso.
          Consulte a <a href="/api-docs" style={{ color: 'var(--lime)' }}>documentação da API</a> para detalhes.
        </P>
      </Section>

      <Section title="8. Conta de usuário">
        <P>
          Você é responsável pela confidencialidade da sua senha e por todas as atividades realizadas
          na sua conta. Notifique imediatamente sobre uso não autorizado em{' '}
          <a href="mailto:seguranca@simulamei.com.br" style={{ color: 'var(--lime)' }}>
            seguranca@simulamei.com.br
          </a>.
        </P>
      </Section>

      <Section title="9. Modificações do serviço">
        <P>
          Reservamo-nos o direito de modificar, suspender ou encerrar o serviço a qualquer momento,
          com aviso prévio de pelo menos 30 dias para usuários com conta ativa, exceto em casos de
          violação destes termos.
        </P>
      </Section>

      <Section title="10. Lei aplicável">
        <P>
          Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa
          será submetida ao foro da Comarca de Campinas — SP.
        </P>
      </Section>

      <Section title="11. Contato">
        <P>
          Dúvidas sobre estes termos:{' '}
          <a href="mailto:legal@simulamei.com.br" style={{ color: 'var(--lime)' }}>
            legal@simulamei.com.br
          </a>
        </P>
      </Section>
    </StaticPageLayout>
  )
}
