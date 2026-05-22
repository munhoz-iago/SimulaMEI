import { describe, expect, it } from 'vitest'
import { buildCheckoutAuthRedirectUrl } from './checkout-auth-redirect'

describe('buildCheckoutAuthRedirectUrl', () => {
  it('returns the encoded login URL for the pro plan with autocheckout=pro&plan=pro percent-encoded', () => {
    const url = buildCheckoutAuthRedirectUrl('pro')
    expect(url).toBe('/auth/login?next=%2Fupgrade%2Fcontador%3Fautocheckout%3Dpro%26plan%3Dpro')
  })

  it('returns the encoded login URL for the starter plan', () => {
    const url = buildCheckoutAuthRedirectUrl('starter')
    expect(url).toBe('/auth/login?next=%2Fupgrade%2Fcontador%3Fautocheckout%3Dstarter%26plan%3Dstarter')
  })

  it('percent-encodes the inner ? and & inside the next= value', () => {
    const url = buildCheckoutAuthRedirectUrl('pro')
    // O '?' inicial do path do login fica cru; o segundo '?' (do inner URL) precisa virar %3F
    // e o '&' interno precisa virar %26, para preservar a estrutura ao decodificar.
    const nextParam = new URL(url, 'https://example.test').searchParams.get('next')
    expect(nextParam).toBe('/upgrade/contador?autocheckout=pro&plan=pro')
    // E o encoding bruto da URL contém %3F e %26 (não literais ? e &) dentro do valor de next:
    expect(url).toContain('%3F')
    expect(url).toContain('%26')
    // Apenas um único '?' literal (o separador de query do /auth/login):
    expect(url.split('?').length).toBe(2)
    // E nenhum '&' literal (porque o único '&' do payload foi encodado):
    expect(url).not.toContain('&')
  })
})
