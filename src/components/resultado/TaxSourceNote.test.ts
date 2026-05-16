import { describe, expect, it } from 'vitest'
import { formatTaxSourceLine, formatTaxSourceMap } from './TaxSourceNote'

describe('formatTaxSourceLine', () => {
  it('lists source titles and the engine version label', () => {
    const line = formatTaxSourceLine(
      [{ titulo: 'Resolução CGSN nº 140/2018' }, { titulo: 'Portal do Simples Nacional' }],
      'BR-MEI-SN-2026-04-28',
    )

    expect(line).toBe(
      'Fonte: Resolução CGSN nº 140/2018 · Portal do Simples Nacional · Motor v2026-04-28',
    )
  })

  it('still shows the engine version when no sources are given (auditability contract)', () => {
    expect(formatTaxSourceLine([], 'BR-MEI-SN-2026-04-28')).toBe('Motor v2026-04-28')
  })

  it('passes a version through unchanged when it has no known prefix', () => {
    expect(formatTaxSourceLine([{ titulo: 'X' }], 'v9')).toBe('Fonte: X · Motor v9')
  })
})

describe('formatTaxSourceMap', () => {
  it('maps each value-group to its specific source plus the engine version', () => {
    const line = formatTaxSourceMap(
      [
        { valores: 'Anexo, alíquota e DAS', fonte: { titulo: 'Resolucao CGSN n. 140/2018' } },
        { valores: 'Teto MEI', fonte: { titulo: 'Portal do Simples Nacional - legislacao' } },
      ],
      'BR-MEI-SN-2026-04-28',
    )

    expect(line).toBe(
      'Anexo, alíquota e DAS: Resolucao CGSN n. 140/2018 · Teto MEI: Portal do Simples Nacional - legislacao · Motor v2026-04-28',
    )
  })

  it('still shows the engine version when no mapping is given', () => {
    expect(formatTaxSourceMap([], 'BR-MEI-SN-2026-04-28')).toBe('Motor v2026-04-28')
  })

  it('handles a single mapped value-group', () => {
    expect(
      formatTaxSourceMap([{ valores: 'Teto', fonte: { titulo: 'X' } }], 'v9'),
    ).toBe('Teto: X · Motor v9')
  })
})
