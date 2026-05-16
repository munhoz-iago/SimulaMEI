import type { CSSProperties } from 'react'

export interface TaxSource {
  titulo: string
  url?: string
}

/** Maps a value-group (e.g. "Anexo, alíquota e DAS") to the norm that backs it. */
export interface TaxSourceMapEntry {
  valores: string
  fonte: TaxSource
}

/**
 * Builds the auditability line shown next to result numbers.
 *
 * Trust contract: every result must be able to point at its normative
 * source and the engine version that produced it. The engine version is
 * always shown — even with no sources — so a number can be re-audited later.
 */
export function formatTaxSourceLine(
  fontes: ReadonlyArray<{ titulo: string }>,
  taxRuleVersion: string,
): string {
  const motor = `Motor ${taxRuleVersion.replace('BR-MEI-SN-', 'v')}`
  if (fontes.length === 0) return motor
  return `Fonte: ${fontes.map(f => f.titulo).join(' · ')} · ${motor}`
}

/**
 * Builds a per-value attribution line: each value-group points at the
 * specific norm that backs it (instead of one aggregated source list),
 * always followed by the engine version.
 */
export function formatTaxSourceMap(
  entries: ReadonlyArray<{ valores: string; fonte: { titulo: string } }>,
  taxRuleVersion: string,
): string {
  const motor = `Motor ${taxRuleVersion.replace('BR-MEI-SN-', 'v')}`
  if (entries.length === 0) return motor
  return `${entries.map(e => `${e.valores}: ${e.fonte.titulo}`).join(' · ')} · ${motor}`
}

/**
 * Inline source + engine-version note for result surfaces
 * (PartialResults / FullResults / TabelaDAS / disclaimer).
 *
 * Prefer `mapeamento` (per-value attribution). `fontes` is the legacy
 * aggregated form, kept for callers that don't need value mapping.
 */
export function TaxSourceNote({
  taxRuleVersion,
  fontes = [],
  mapeamento,
  style,
  className,
}: {
  taxRuleVersion: string
  fontes?: ReadonlyArray<TaxSource>
  mapeamento?: ReadonlyArray<TaxSourceMapEntry>
  style?: CSSProperties
  className?: string
}) {
  const line = mapeamento
    ? formatTaxSourceMap(mapeamento, taxRuleVersion)
    : formatTaxSourceLine(fontes, taxRuleVersion)
  const sources = mapeamento ? mapeamento.map(e => e.fonte) : fontes
  const links = sources.filter((f): f is Required<TaxSource> => Boolean(f.url))

  return (
    <div
      className={className}
      style={{
        fontSize: 11,
        color: 'var(--text3)',
        lineHeight: 1.5,
        ...style,
      }}
    >
      <span>{line}</span>
      {links.length > 0 && (
        <span>
          {' — '}
          {links.map((f, i) => (
            <span key={f.url}>
              {i > 0 && ' · '}
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--blue)' }}
              >
                {f.titulo}
              </a>
            </span>
          ))}
        </span>
      )}
    </div>
  )
}
