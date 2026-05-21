import { describe, expect, it } from 'vitest'
import { getLoginContextCopy } from './contextual-copy'

describe('getLoginContextCopy', () => {
  describe('default (no match)', () => {
    it('returns null for /dashboard', () => {
      expect(getLoginContextCopy('/dashboard')).toBeNull()
    })

    it('returns null for /', () => {
      expect(getLoginContextCopy('/')).toBeNull()
    })

    it('returns null for unrelated route', () => {
      expect(getLoginContextCopy('/anywhere-else')).toBeNull()
    })
  })

  describe('simulator branch', () => {
    it('matches /dashboard/simular', () => {
      const copy = getLoginContextCopy('/dashboard/simular')
      expect(copy).toEqual({
        preview: {
          heading: '',
          body: 'Ao entrar você libera: histórico de simulações, relatório completo dos 4 regimes e alertas mensais. Sem custo, sem cartão.',
        },
      })
    })

    it('matches /dashboard/simular with query string', () => {
      const copy = getLoginContextCopy('/dashboard/simular?foo=bar')
      expect(copy?.preview?.body).toBe(
        'Ao entrar você libera: histórico de simulações, relatório completo dos 4 regimes e alertas mensais. Sem custo, sem cartão.',
      )
      expect(copy?.preview?.heading).toBe('')
    })
  })

  describe('relatório branch', () => {
    it('matches /dashboard/relatorio', () => {
      const copy = getLoginContextCopy('/dashboard/relatorio')
      expect(copy).toEqual({
        preview: {
          heading: 'Seu relatório fica pronto após o login',
          body: 'Comparativo dos 4 regimes tributários · score fiscal · PDF para o contador · histórico salvo. Sem custo, sem cartão.',
        },
      })
    })

    it('matches /dashboard/relatorio/123', () => {
      const copy = getLoginContextCopy('/dashboard/relatorio/123')
      expect(copy?.preview?.heading).toBe('Seu relatório fica pronto após o login')
    })

    it('matches exact /relatorio', () => {
      const copy = getLoginContextCopy('/relatorio')
      expect(copy?.preview?.heading).toBe('Seu relatório fica pronto após o login')
      expect(copy?.preview?.body).toBe(
        'Comparativo dos 4 regimes tributários · score fiscal · PDF para o contador · histórico salvo. Sem custo, sem cartão.',
      )
    })
  })

  describe('pro autocheckout', () => {
    it('matches /upgrade/contador?autocheckout=pro', () => {
      const copy = getLoginContextCopy('/upgrade/contador?autocheckout=pro')
      expect(copy).toEqual({
        title: 'Falta só entrar',
        subtitle: 'Você está a um clique do plano Pro (R$ 247/mês).',
      })
    })

    it('matches /upgrade/contador?autocheckout=pro&plan=pro', () => {
      const copy = getLoginContextCopy('/upgrade/contador?autocheckout=pro&plan=pro')
      expect(copy?.title).toBe('Falta só entrar')
      expect(copy?.subtitle).toBe('Você está a um clique do plano Pro (R$ 247/mês).')
    })
  })

  describe('starter autocheckout', () => {
    it('matches /upgrade/contador?autocheckout=starter&plan=starter', () => {
      const copy = getLoginContextCopy('/upgrade/contador?autocheckout=starter&plan=starter')
      expect(copy).toEqual({
        title: 'Falta só entrar',
        subtitle: 'Você está a um clique do plano Starter (R$ 97/mês).',
      })
    })

    it('matches /upgrade/contador?autocheckout=starter', () => {
      const copy = getLoginContextCopy('/upgrade/contador?autocheckout=starter')
      expect(copy?.title).toBe('Falta só entrar')
      expect(copy?.subtitle).toBe('Você está a um clique do plano Starter (R$ 97/mês).')
    })
  })
})
