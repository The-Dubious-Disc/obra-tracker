import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => import('../helpers/nextHeaders'))

vi.mock('@/lib/services/authService', () => ({
  registerUser: vi.fn(),
  createPasswordResetToken: vi.fn(),
  resetPasswordWithToken: vi.fn(),
}))

vi.mock('@/lib/services/emailService', () => ({
  sendPasswordResetEmail: vi.fn(),
}))

import { registerUser, createPasswordResetToken, resetPasswordWithToken } from '@/lib/services/authService'
import { sendPasswordResetEmail } from '@/lib/services/emailService'
import { jsonRequest } from '../helpers/http'
import { POST as register } from '@/app/api/auth/register/route'
import { POST as recover } from '@/app/api/auth/recover-password/route'
import { POST as reset } from '@/app/api/auth/reset-password/route'

const registerUserMock = vi.mocked(registerUser)
const createPasswordResetTokenMock = vi.mocked(createPasswordResetToken)
const resetPasswordWithTokenMock = vi.mocked(resetPasswordWithToken)
const sendPasswordResetEmailMock = vi.mocked(sendPasswordResetEmail)

beforeEach(() => {
  registerUserMock.mockReset()
  createPasswordResetTokenMock.mockReset()
  resetPasswordWithTokenMock.mockReset()
  sendPasswordResetEmailMock.mockReset()
})

describe('POST /api/auth/register', () => {
  it('always creates a viewer, even if the body asks for another role', async () => {
    registerUserMock.mockResolvedValue({ success: true, user: { id: 'u1' } as never })

    const response = await register(jsonRequest('http://localhost/api/auth/register', {
      email: 'Ada@Example.com',
      nombre: 'Ada',
      password: 'secret123',
      rol: 'admin',
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ message: 'Usuario registrado correctamente' })
    expect(registerUserMock).toHaveBeenCalledWith('Ada', 'Ada@Example.com', 'secret123', 'viewer')
  })

  it('returns validation and duplicate errors', async () => {
    const invalid = await register(jsonRequest('http://localhost/api/auth/register', {
      email: 'ada@example.com',
      nombre: 'A',
      password: 'short',
    }))
    expect(invalid.status).toBe(400)
    expect(registerUserMock).not.toHaveBeenCalled()

    registerUserMock.mockResolvedValue({ success: false, error: 'Usuario ya existe' })
    const duplicate = await register(jsonRequest('http://localhost/api/auth/register', {
      email: 'ada@example.com',
      nombre: 'Ada',
      password: 'secret123',
    }))
    expect(duplicate.status).toBe(400)
    await expect(duplicate.json()).resolves.toEqual({ error: 'Usuario ya existe' })
  })
})

describe('POST /api/auth/recover-password', () => {
  it('requires an email and does not send mail when no token is issued', async () => {
    const missing = await recover(jsonRequest('http://localhost/api/auth/recover-password', {}))
    expect(missing.status).toBe(400)

    createPasswordResetTokenMock.mockResolvedValue({
      success: true,
      message: 'Si el correo existe, se enviará un enlace',
    })
    const hidden = await recover(jsonRequest('http://localhost/api/auth/recover-password', {
      email: 'missing@example.com',
    }))
    expect(hidden.status).toBe(200)
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled()
    await expect(hidden.json()).resolves.toEqual({
      message: 'Si el correo existe, se enviará un enlace',
    })
  })

  it('sends a reset email only when a token exists', async () => {
    createPasswordResetTokenMock.mockResolvedValue({ success: true, token: 'reset-token' })
    const response = await recover(jsonRequest('http://localhost/api/auth/recover-password', {
      email: 'ada@example.com',
    }))
    expect(response.status).toBe(200)
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith('ada@example.com', 'reset-token')
    await expect(response.json()).resolves.toEqual({ message: 'Correo de recuperación enviado' })
  })

  it('returns 500 when token creation fails', async () => {
    createPasswordResetTokenMock.mockResolvedValue({ success: false, error: 'Error interno del servidor' })
    const response = await recover(jsonRequest('http://localhost/api/auth/recover-password', {
      email: 'ada@example.com',
    }))
    expect(response.status).toBe(500)
  })
})

describe('POST /api/auth/reset-password', () => {
  it('requires both fields and surfaces an invalid token', async () => {
    const missing = await reset(jsonRequest('http://localhost/api/auth/reset-password', { token: 'tok' }))
    expect(missing.status).toBe(400)

    resetPasswordWithTokenMock.mockResolvedValue({ success: false, error: 'Token inválido o expirado' })
    const invalid = await reset(jsonRequest('http://localhost/api/auth/reset-password', {
      token: 'tok',
      password: 'secret123',
    }))
    expect(invalid.status).toBe(400)
    await expect(invalid.json()).resolves.toEqual({ error: 'Token inválido o expirado' })
  })

  it('confirms a successful reset', async () => {
    resetPasswordWithTokenMock.mockResolvedValue({ success: true })
    const response = await reset(jsonRequest('http://localhost/api/auth/reset-password', {
      token: 'tok',
      password: 'secret123',
    }))
    expect(response.status).toBe(200)
    expect(resetPasswordWithTokenMock).toHaveBeenCalledWith('tok', 'secret123')
    await expect(response.json()).resolves.toEqual({ message: 'Contraseña actualizada correctamente' })
  })
})
