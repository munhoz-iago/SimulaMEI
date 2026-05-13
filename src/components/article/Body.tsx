/**
 * Componentes compartilhados para corpo de artigos em /aprenda.
 * Mantém estilos consistentes e evita duplicação entre páginas.
 */
import Link from 'next/link'

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 22, fontWeight: 700, color: 'var(--text1)',
      marginTop: 40, marginBottom: 12, lineHeight: 1.2,
    }}>
      {children}
    </h2>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: 16 }}>{children}</p>
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: 'var(--text1)', fontWeight: 700 }}>{children}</strong>
}

interface CalloutProps {
  children: React.ReactNode
  color?: 'lime' | 'orange' | 'blue'
}

const CALLOUT_COLORS: Record<NonNullable<CalloutProps['color']>, { bg: string; border: string }> = {
  lime: { bg: 'rgba(200,241,53,0.06)', border: 'rgba(200,241,53,0.2)' },
  orange: { bg: 'rgba(255,140,0,0.06)', border: 'rgba(255,140,0,0.2)' },
  blue: { bg: 'rgba(96,165,250,0.06)', border: 'rgba(96,165,250,0.2)' },
}

export function Callout({ children, color = 'lime' }: CalloutProps) {
  const c = CALLOUT_COLORS[color]
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 8, padding: '16px 20px', marginBottom: 20, fontSize: 14,
    }}>
      {children}
    </div>
  )
}

interface ArticleMetaProps {
  tag: string
  updatedYear?: number | string
  readingTime: string
}

export function ArticleMeta({ tag, updatedYear = 2026, readingTime }: ArticleMetaProps) {
  return (
    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <span>{tag}</span>
      <span>·</span>
      <span>Atualizado para {updatedYear}</span>
      <span>·</span>
      <span>{readingTime} de leitura</span>
    </div>
  )
}

interface SimulatorCTAProps {
  title: string
  description: string
  buttonLabel?: string
}

export function SimulatorCTA({ title, description, buttonLabel = 'Simular agora →' }: SimulatorCTAProps) {
  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '24px 28px', marginTop: 40,
    }}>
      <p style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>{description}</p>
      <Link
        href="/#simulador"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', background: 'var(--lime)', color: 'var(--ink-on-accent)',
          borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none',
        }}
      >
        {buttonLabel}
      </Link>
    </div>
  )
}
