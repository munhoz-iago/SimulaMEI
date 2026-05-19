import { describe, expect, it } from 'vitest'
import { reportWatermark, resolveHeadingFont } from './reportTemplate'

describe('reportWatermark', () => {
  it('marca AMOSTRA só no preview', () => {
    expect(reportWatermark('preview')).toBe('AMOSTRA')
    expect(reportWatermark('full')).toBeNull()
  })
})

describe('resolveHeadingFont', () => {
  it('usa a fonte de marca quando o registro deu certo, senão Helvetica', () => {
    expect(resolveHeadingFont(true)).toBe('SpaceGrotesk')
    expect(resolveHeadingFont(false)).toBe('Helvetica')
  })
})
