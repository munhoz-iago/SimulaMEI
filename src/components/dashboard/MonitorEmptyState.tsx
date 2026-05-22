import Link from 'next/link'
import type { MonitorEmptyReason } from './monitor-empty-state'

const COPY: Record<MonitorEmptyReason, { title: string; body: string; cta: { label: string; href: string } }> = {
  'cnae-missing': {
    title: 'Defina seu CNAE pra ativar o monitor',
    body: 'O monitor mensal precisa do CNAE principal pra calcular Anexo provável, alíquota efetiva e Fator R esperado.',
    cta: { label: 'Definir CNAE no onboarding →', href: '/onboarding?focus=cnae' },
  },
  'tipo-missing': {
    title: 'Diga se você é MEI geral ou caminhoneiro',
    body: 'O teto e a base de cálculo mudam: R$ 81.000/ano (geral) vs R$ 251.600/ano (caminhoneiro).',
    cta: { label: 'Selecionar tipo no onboarding →', href: '/onboarding?focus=tipo' },
  },
  'no-rows': {
    title: 'Registre seu primeiro mês pra ativar o monitor',
    body: 'Com a primeira simulação salva, você passa a ver projeção de teto, evolução do Fator R e alerta de transição de Anexo.',
    cta: { label: 'Fazer primeira simulação →', href: '/dashboard?aba=fator-r' },
  },
}

export function MonitorEmptyState({ reason }: { reason: MonitorEmptyReason }) {
  const copy = COPY[reason]
  return (
    <div
      role="region"
      aria-label="Monitor mensal — orientação"
      style={{
        background: 'var(--tint-blue)',
        border: '1px solid var(--tint-blue-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 22px',
        display: 'grid',
        gap: 10,
      }}
    >
      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)', margin: 0 }}>
        {copy.title}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
        {copy.body}
      </p>
      <Link
        href={copy.cta.href}
        style={{
          justifySelf: 'start',
          padding: '8px 14px',
          background: 'var(--blue)',
          color: 'var(--ink-on-accent)',
          borderRadius: 'var(--radius)',
          fontSize: 13,
          fontWeight: 800,
          textDecoration: 'none',
          marginTop: 4,
        }}
      >
        {copy.cta.label}
      </Link>
    </div>
  )
}
