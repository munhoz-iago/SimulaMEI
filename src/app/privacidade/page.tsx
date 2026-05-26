import { StaticPageLayout } from '@/components/layout/StaticPageLayout'

export const metadata = {
  title: 'Política de Privacidade — SimulaMEI',
  description: 'Como o SimulaMEI coleta, usa e protege seus dados.',
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

function Ul({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 6 }}>{item}</li>
      ))}
    </ul>
  )
}

export default function PrivacidadePage() {
  const updated = '30 de abril de 2026'

  return (
    <StaticPageLayout
      title="Política de Privacidade"
      subtitle={`Última atualização: ${updated}. Levamos a sério a proteção dos seus dados.`}
    >
      <Section title="1. Quem somos">
        <P>
          O SimulaMEI é uma ferramenta de simulação tributária para Microempreendedores Individuais (MEI),
          operada por Iago Munhoz. Não somos um escritório de contabilidade nem prestamos consultoria fiscal —
          as simulações têm caráter exclusivamente informativo.
        </P>
        <P>Contato: <a href="mailto:iagomunhoz48@gmail.com" style={{ color: 'var(--lime)' }}>iagomunhoz48@gmail.com</a></P>
      </Section>

      <Section title="2. Dados que coletamos">
        <P>Coletamos apenas o mínimo necessário para operar o serviço:</P>
        <Ul items={[
          'E-mail — quando você solicita seu relatório completo ou entra na lista de contadores.',
          'Dados comerciais de contador — nome do escritório, telefone, faixa de clientes MEI e ferramenta atual, quando você solicita acesso ao plano contador.',
          'Dados de simulação — faturamento informado, CNAE, mês, tipo MEI. Nunca nome ou CPF.',
          'Dados técnicos — endereço IP (armazenado apenas como hash HMAC-SHA256), User-Agent, URL de origem.',
          'Dados de autenticação — gerenciados pelo Supabase Auth com criptografia padrão de mercado.',
          'Eventos de produto — cliques e conclusão de fluxos críticos via PostHog, sem envio de documentos fiscais.',
        ]} />
        <P>Não coletamos CPF, CNPJ, dados bancários ou qualquer informação financeira real.</P>
      </Section>

      <Section title="3. Como usamos seus dados">
        <Ul items={[
          'Para enviar seu relatório de simulação por e-mail.',
          'Para melhorar a precisão do motor tributário com base em padrões de uso agregados.',
          'Para comunicar atualizações relevantes das regras do Simples Nacional (com possibilidade de descadastro).',
          'Para priorizar contato comercial com escritórios contábeis que solicitaram acesso ao plano contador.',
          'Para analytics internos anonimizados com PostHog (volume de simulações por CNAE, funil de captura, uso do relatório e monitor).',
        ]} />
        <P>Não vendemos, alugamos nem compartilhamos sua lista de e-mails com terceiros para fins comerciais.</P>
      </Section>

      <Section title="4. Base legal (LGPD)">
        <P>O tratamento de dados é realizado com base nos seguintes fundamentos da Lei 13.709/2018 (LGPD):</P>
        <Ul items={[
          'Consentimento — ao fornecer seu e-mail para receber o relatório.',
          'Legítimo interesse — para melhoria do produto com dados anonimizados.',
          'Execução de contrato — quando você possui conta cadastrada no SimulaMEI.',
        ]} />
      </Section>

      <Section title="5. Seus direitos">
        <P>Conforme a LGPD, você tem direito a:</P>
        <Ul items={[
          'Confirmar a existência de tratamento dos seus dados.',
          'Acessar os dados que temos sobre você.',
          'Corrigir dados incompletos, inexatos ou desatualizados.',
          'Solicitar a anonimização, bloqueio ou eliminação dos seus dados.',
          'Revogar o consentimento a qualquer momento.',
          'Portabilidade dos dados a outro fornecedor de serviço.',
        ]} />
        <P>
          Para exercer qualquer direito, envie um e-mail para{' '}
          <a href="mailto:iagomunhoz48@gmail.com" style={{ color: 'var(--lime)' }}>
            iagomunhoz48@gmail.com
          </a>
          {' '}com o assunto &quot;LGPD — [tipo de solicitação]&quot;. Respondemos em até 15 dias úteis.
        </P>
      </Section>

      <Section title="6. Retenção de dados">
        <Ul items={[
          'Logs de simulação anônimos — retidos por até 24 meses para análise de tendências.',
          'E-mails de leads — retidos até você solicitar exclusão ou por 36 meses sem interação.',
          'Dados de conta — retidos enquanto a conta estiver ativa + 12 meses após encerramento.',
        ]} />
      </Section>

      <Section title="7. Cookies e rastreamento">
        <P>
          Utilizamos apenas cookies estritamente necessários para autenticação (sessão Supabase).
          Também utilizamos analytics de produto via PostHog para entender eventos críticos do funil.
          Não utilizamos pixels de publicidade nem Google Analytics.
        </P>
      </Section>

      <Section title="8. Segurança">
        <P>
          Dados em trânsito protegidos por TLS 1.3. Senhas armazenadas com bcrypt (gerenciado pelo Supabase Auth).
          Chaves de API armazenadas apenas como hash HMAC-SHA256. Acesso à base de dados restrito por Row Level Security (RLS).
        </P>
      </Section>

      <Section title="9. Alterações nesta política">
        <P>
          Quando fizermos alterações relevantes, notificaremos usuários cadastrados por e-mail com
          pelo menos 15 dias de antecedência. O uso continuado do serviço após a data de vigência
          indica aceitação das alterações.
        </P>
      </Section>
    </StaticPageLayout>
  )
}
