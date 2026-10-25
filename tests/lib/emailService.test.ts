import { afterEach, describe, expect, it, vi } from 'vitest'

const sendMock = vi.hoisted(() => vi.fn())

vi.mock('resend', () => {
  return {
    Resend: class Resend {
      emails = { send: sendMock }
    },
  }
})

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
const originalResendKey = process.env.RESEND_API_KEY

async function loadEmailService() {
  vi.resetModules()
  return import('@/lib/services/emailService')
}

afterEach(() => {
  sendMock.mockReset()
  if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL
  else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  if (originalResendKey === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = originalResendKey
})

describe('email service', () => {
  it('simulates delivery when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY
    const { sendEmail } = await loadEmailService()

    await expect(sendEmail({ to: 'ada@example.com', subject: 'Hola' })).resolves.toEqual({
      success: true,
      mock: true,
    })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('strips a trailing slash from invitation links and keeps the configured sender', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.NEXT_PUBLIC_APP_URL = 'https://obra.example/'
    sendMock.mockResolvedValue({ data: { id: 'email-1' }, error: null })
    const { sendProjectInvitationEmail } = await loadEmailService()

    const result = await sendProjectInvitationEmail('ada@example.com', 'Casa Norte', 'token-1')

    expect(result).toMatchObject({ success: true, data: { id: 'email-1' } })
    expect(sendMock).toHaveBeenCalledOnce()
    const payload = sendMock.mock.calls[0][0]
    expect(payload.from).toBe('Obra Tracker <obratracking@cheto.club>')
    expect(payload.to).toEqual(['ada@example.com'])
    expect(payload.subject).toBe('Invitación a colaborar en Casa Norte')
    expect(payload.html).toContain('https://obra.example/invitations/token-1')
    expect(payload.html).not.toContain('https://obra.example//invitations')
  })

  it('builds password reset links without stripping a trailing slash', async () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.NEXT_PUBLIC_APP_URL = 'https://obra.example/'
    sendMock.mockResolvedValue({ data: { id: 'email-2' }, error: null })
    const { sendPasswordResetEmail } = await loadEmailService()

    await sendPasswordResetEmail('ada@example.com', 'reset-token')

    expect(sendMock.mock.calls[0][0].html).toContain(
      'https://obra.example//reset-password?token=reset-token',
    )
  })

  it('falls back to localhost when the app url is unset', async () => {
    process.env.RESEND_API_KEY = 're_test'
    delete process.env.NEXT_PUBLIC_APP_URL
    sendMock.mockResolvedValue({ data: { id: 'email-3' }, error: null })
    const { sendProjectInvitationEmail, sendPasswordResetEmail } = await loadEmailService()

    await sendProjectInvitationEmail('ada@example.com', 'Casa', 'tok')
    expect(sendMock.mock.calls[0][0].html).toContain('http://localhost:3000/invitations/tok')

    await sendPasswordResetEmail('ada@example.com', 'tok')
    expect(sendMock.mock.calls[1][0].html).toContain('http://localhost:3000/reset-password?token=tok')
  })

  it('reports Resend errors and thrown failures', async () => {
    process.env.RESEND_API_KEY = 're_test'
    const { sendEmail } = await loadEmailService()

    sendMock.mockResolvedValue({ data: null, error: { message: 'rejected' } })
    await expect(sendEmail({ to: ['ada@example.com'], subject: 'Hola' })).resolves.toMatchObject({
      success: false,
    })

    sendMock.mockRejectedValue(new Error('network'))
    await expect(sendEmail({ to: 'ada@example.com', subject: 'Hola', text: 'cuerpo' })).resolves.toMatchObject({
      success: false,
    })
  })
})
