import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const sendMock = vi.fn().mockResolvedValue({ id: 'mock' })

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

vi.mock('@/constants/site', () => ({
  getSiteUrl: () => 'https://simulamei.test',
}))

const originalApiKey = process.env.RESEND_API_KEY
const originalFromEmail = process.env.RESEND_FROM_EMAIL

beforeAll(() => {
  process.env.RESEND_API_KEY = 'test-key'
  process.env.RESEND_FROM_EMAIL = 'from@simulamei.test'
})

afterAll(() => {
  process.env.RESEND_API_KEY = originalApiKey
  process.env.RESEND_FROM_EMAIL = originalFromEmail
})

beforeEach(() => {
  sendMock.mockClear()
})

describe('email HTML injection prevention', () => {
  it('sendFiscalCalendarEmail escapes nome', async () => {
    const { sendFiscalCalendarEmail } = await import('./resend')
    await sendFiscalCalendarEmail({
      to: 'test@test.com',
      nome: '<script>alert(1)</script>',
      items: [],
    })
    expect(sendMock).toHaveBeenCalledTimes(1)
    const html = sendMock.mock.calls[0][0].html as string
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('sendFiscalCalendarEmail escapes item title/body', async () => {
    const { sendFiscalCalendarEmail } = await import('./resend')
    await sendFiscalCalendarEmail({
      to: 'test@test.com',
      nome: 'João',
      items: [
        {
          title: '<img src=x onerror=bad>',
          body: '<b>fake</b>',
          channel: 'email',
          severity: 'info',
          priority: 'media',
        },
      ],
    })
    const html = sendMock.mock.calls[0][0].html as string
    expect(html).not.toContain('<img src=x onerror=bad>')
    expect(html).not.toContain('<b>fake</b>')
    expect(html).toContain('&lt;img src=x onerror=bad&gt;')
    expect(html).toContain('&lt;b&gt;fake&lt;/b&gt;')
  })

  it('sendAnexoAlertEmail escapes user input', async () => {
    const { sendAnexoAlertEmail } = await import('./resend')
    await sendAnexoAlertEmail({
      to: 'test@test.com',
      nome: '"><script>',
      from: 'III',
      toAnexo: 'V',
      mes: 5,
      ano: 2026,
      fatorR: 0.32,
    })
    const html = sendMock.mock.calls[0][0].html as string
    expect(html).not.toContain('"><script>')
    expect(html).toContain('&quot;&gt;&lt;script&gt;')
  })
})
