import { describe, expect, it, vi } from 'vitest'

const { createAccountantCheckoutMock } = vi.hoisted(() => ({
  createAccountantCheckoutMock: vi.fn(),
}))

vi.mock('@/lib/accountant/checkout', () => ({
  createAccountantCheckout: createAccountantCheckoutMock,
}))

import { POST } from './route'

describe('/api/checkout/accountant-pro POST', () => {
  it('delegates to accountant pro checkout', async () => {
    createAccountantCheckoutMock.mockResolvedValue(new Response('ok'))

    await POST()

    expect(createAccountantCheckoutMock).toHaveBeenCalledWith('pro')
  })
})
