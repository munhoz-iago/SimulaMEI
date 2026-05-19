import type { ComparativoRegimes } from '@/types/tributario'

export interface RegimePreviewItem {
  label: string
  pct: number
  melhor: boolean
  /** Custo anual R$ do regime (motor). Exibido só no PDF pago — o teaser
   *  web continua borrado/sem revelar o valor. */
  custo: number
}

/**
 * Turns the already-computed motor `comparativo` into ordered bars for the
 * locked gate teaser. Reuses motor data (single source) — does not
 * recompute taxes; only normalizes cost to % of the costliest regime.
 */
export function buildRegimePreview(c: ComparativoRegimes): RegimePreviewItem[] {
  const raw: Array<{ id: ComparativoRegimes['melhorRegime']; label: string; custo: number }> = [
    { id: 'simplesAtual', label: 'Simples', custo: c.simplesAnexoAtual.dasAnual },
    ...(c.simplesAnexoOtimo
      ? [
          {
            id: 'simplesOtimo' as const,
            label: `Simples (Anexo ${c.simplesAnexoOtimo.anexo})`,
            custo: c.simplesAnexoOtimo.dasAnual,
          },
        ]
      : []),
    { id: 'presumido', label: 'Presumido', custo: c.presumido.custoTotal },
    { id: 'real', label: 'Real', custo: c.real.custoTotal },
  ]
  const max = Math.max(...raw.map(r => r.custo)) || 1
  return raw.map(r => ({
    label: r.label,
    pct: Math.round((r.custo / max) * 100),
    melhor: r.id === c.melhorRegime,
    custo: r.custo,
  }))
}

/**
 * Blurred/locked preview of the 4-regime comparison shown inside the
 * email gate — signals concrete value behind the gate without revealing it.
 */
export function RegimePreviewLocked({ comparativo }: { comparativo: ComparativoRegimes }) {
  const bars = buildRegimePreview(comparativo)

  return (
    <div style={{ position: 'relative' }}>
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          height: 120,
          padding: '12px 14px',
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          filter: 'blur(5px)',
          userSelect: 'none',
        }}
      >
        {bars.map(b => (
          <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: '100%',
                height: `${Math.max(b.pct, 8)}%`,
                minHeight: 8,
                borderRadius: 4,
                background: b.melhor ? 'var(--lime)' : 'color-mix(in oklch, var(--blue) 40%, transparent)',
              }}
            />
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{b.label}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 6,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
          Comparativo dos {bars.length} regimes
        </span>
      </div>
    </div>
  )
}
