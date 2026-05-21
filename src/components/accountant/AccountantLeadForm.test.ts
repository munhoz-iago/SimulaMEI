import { describe, expect, it } from 'vitest'
import { getAccountantLeadIntentConfig } from './AccountantLeadForm'

describe('getAccountantLeadIntentConfig', () => {
  it('intent="waitlist" (padrão): texto de lista, faixa default 21-50', () => {
    expect(getAccountantLeadIntentConfig('waitlist')).toEqual({
      submitLabel: 'Entrar na lista de acesso antecipado',
      submittingLabel: 'Registrando...',
      defaultCarteiraRange: '21-50',
      sentTitle: 'Cadastro recebido!',
      sentMessage: 'Recebemos seu cadastro. Contato em até 48h conforme a faixa de carteira.',
    })
  })

  it('intent="enterprise": texto comercial, faixa pré-selecionada 150+', () => {
    expect(getAccountantLeadIntentConfig('enterprise')).toEqual({
      submitLabel: 'Falar com nosso comercial',
      submittingLabel: 'Enviando...',
      defaultCarteiraRange: '150+',
      sentTitle: 'Contato recebido!',
      sentMessage: 'Recebemos seu contato. Nosso comercial responde em até 1 dia útil (carteiras 150+ entram em fila prioritária).',
    })
  })
})
