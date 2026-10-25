import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', async () => {
  const mod = await import('../helpers/db')
  return { db: mod.db }
})

import { deletes, failNext, findFirst, inserts, resetDb, updates } from '../helpers/db'
import { passwordResetTokens, proyectoMiembros, usuarios } from '@/lib/db/schema'
import { getUserRole, userHasRole } from '@/lib/services/authHelper'
import {
  acceptInvitation,
  checkProjectAccess,
  checkProjectRole,
  createInvitation,
  createPasswordResetToken,
  getInvitationByToken,
  getProjectMembership,
  registerUser,
  resetPasswordWithToken,
  verifyPassword,
} from '@/lib/services/authService'

beforeEach(() => {
  resetDb()
})

describe('registerUser', () => {
  it('stores a bcrypt hash and does not keep the plaintext password', async () => {
    findFirst.usuarios.mockResolvedValue(undefined)

    const result = await registerUser('Ana', 'ana@example.com', 'secret123', 'editor')

    expect(result.success).toBe(true)
    if (!result.success) return
    const values = inserts[0].values as { passwordHash: string; email: string; rol: string }
    expect(values.email).toBe('ana@example.com')
    expect(values.rol).toBe('editor')
    expect(values.passwordHash).not.toBe('secret123')
    expect(values.passwordHash.startsWith('$2')).toBe(true)
    expect(await verifyPassword('secret123', values.passwordHash)).toBe(true)
    expect(await verifyPassword('wrong', values.passwordHash)).toBe(false)
    expect(result.user).toMatchObject({ email: 'ana@example.com', rol: 'editor' })
  })

  it('rejects a duplicate email and an empty insert', async () => {
    findFirst.usuarios.mockResolvedValue({ id: 'u1' })
    await expect(registerUser('Ana', 'ana@example.com', 'secret123')).resolves.toEqual({
      success: false,
      error: 'Usuario ya existe',
    })
    expect(inserts).toHaveLength(0)

    findFirst.usuarios.mockResolvedValue(undefined)
    const { queueInsert } = await import('../helpers/db')
    queueInsert([])
    await expect(registerUser('Ana', 'ana@example.com', 'secret123')).resolves.toEqual({
      success: false,
      error: 'Error al crear usuario',
    })
  })

  it('hides database failures', async () => {
    findFirst.usuarios.mockRejectedValue(new Error('down'))
    await expect(registerUser('Ana', 'ana@example.com', 'secret123')).resolves.toEqual({
      success: false,
      error: 'Error interno del servidor',
    })
  })
})

describe('project membership', () => {
  it('returns the membership row and treats lookup errors as no access', async () => {
    findFirst.proyectoMiembros.mockResolvedValue({ id: 'm1', rol: 'admin' })
    await expect(getProjectMembership('u1', 'p1')).resolves.toMatchObject({ rol: 'admin' })
    await expect(checkProjectAccess('u1', 'p1')).resolves.toBe(true)

    findFirst.proyectoMiembros.mockResolvedValue(undefined)
    await expect(checkProjectAccess('u1', 'p1')).resolves.toBe(false)

    findFirst.proyectoMiembros.mockRejectedValue(new Error('down'))
    await expect(getProjectMembership('u1', 'p1')).resolves.toBeNull()
    await expect(checkProjectAccess('u1', 'p1')).resolves.toBe(false)
  })

  it('allows admin and editor by default and denies viewers', async () => {
    findFirst.proyectoMiembros.mockResolvedValue({ rol: 'viewer' })
    await expect(checkProjectRole('u1', 'p1')).resolves.toBe(false)

    findFirst.proyectoMiembros.mockResolvedValue({ rol: 'editor' })
    await expect(checkProjectRole('u1', 'p1')).resolves.toBe(true)

    findFirst.proyectoMiembros.mockResolvedValue({ rol: 'editor' })
    await expect(checkProjectRole('u1', 'p1', ['admin'])).resolves.toBe(false)

    findFirst.proyectoMiembros.mockResolvedValue(undefined)
    await expect(checkProjectRole('u1', 'p1', ['admin'])).resolves.toBe(false)

    findFirst.proyectoMiembros.mockRejectedValue(new Error('down'))
    await expect(checkProjectRole('u1', 'p1')).resolves.toBe(false)
  })
})

describe('invitations', () => {
  it('refuses to invite someone who is already a member', async () => {
    findFirst.usuarios.mockResolvedValue({ id: 'u1' })
    findFirst.proyectoMiembros.mockResolvedValue({ id: 'm1' })

    await expect(createInvitation('p1', 'ada@example.com', 'editor', 'admin-1')).resolves.toEqual({
      success: false,
      error: 'Este usuario ya es miembro del proyecto',
    })
    expect(inserts).toHaveLength(0)
  })

  it('creates a 7 day token for a new email', async () => {
    findFirst.usuarios.mockResolvedValue(undefined)
    const before = Date.now()

    const result = await createInvitation('p1', 'new@example.com', 'viewer', 'admin-1')

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.invitation.token).toMatch(/^[a-f0-9]{64}$/)
    const expiresAt = result.invitation.expiresAt as Date
    const lifetime = expiresAt.getTime() - before
    expect(lifetime).toBeGreaterThan(7 * 24 * 60 * 60 * 1000 - 5_000)
    expect(lifetime).toBeLessThan(7 * 24 * 60 * 60 * 1000 + 5_000)
    expect(inserts[0]).toMatchObject({
      table: expect.anything(),
      values: {
        proyectoId: 'p1',
        email: 'new@example.com',
        rol: 'viewer',
        invitadoPor: 'admin-1',
      },
    })
  })

  it('returns an open invitation and rejects an expired one', async () => {
    findFirst.invitaciones.mockResolvedValue({
      id: 'inv-1',
      token: 'tok',
      expiresAt: new Date(Date.now() + 60_000),
    })
    await expect(getInvitationByToken('tok')).resolves.toMatchObject({ id: 'inv-1' })

    findFirst.invitaciones.mockResolvedValue({
      id: 'inv-2',
      expiresAt: new Date(Date.now() - 1_000),
    })
    await expect(getInvitationByToken('tok')).resolves.toBeNull()

    findFirst.invitaciones.mockResolvedValue(undefined)
    await expect(getInvitationByToken('missing')).resolves.toBeNull()

    findFirst.invitaciones.mockRejectedValue(new Error('down'))
    await expect(getInvitationByToken('tok')).resolves.toBeNull()
  })

  it('accepts only the invited email and does not duplicate membership', async () => {
    const invitation = {
      id: 'inv-1',
      proyectoId: 'p1',
      email: 'ada@example.com',
      rol: 'editor' as const,
      expiresAt: new Date(Date.now() + 60_000),
    }
    findFirst.invitaciones.mockResolvedValue(invitation)
    findFirst.usuarios.mockResolvedValue(undefined)
    await expect(acceptInvitation('tok', 'u1')).resolves.toEqual({
      success: false,
      error: 'Usuario inválido',
    })

    findFirst.usuarios.mockResolvedValue({ id: 'u1', email: 'other@example.com' })
    await expect(acceptInvitation('tok', 'u1')).resolves.toEqual({
      success: false,
      error: 'Esta invitación corresponde a otro correo',
    })
    expect(inserts).toHaveLength(0)
    expect(updates).toHaveLength(0)

    findFirst.usuarios.mockResolvedValue({ id: 'u1', email: 'Ada@example.com' })
    await expect(acceptInvitation('tok', 'u1')).resolves.toEqual({
      success: false,
      error: 'Esta invitación corresponde a otro correo',
    })

    findFirst.usuarios.mockResolvedValue({ id: 'u1', email: 'ada@example.com' })
    findFirst.proyectoMiembros.mockResolvedValue({ id: 'm1' })
    await expect(acceptInvitation('tok', 'u1')).resolves.toEqual({ success: true, projectId: 'p1' })
    expect(inserts).toHaveLength(0)
    expect(updates[0]).toMatchObject({ set: { aceptada: true } })

    updates.length = 0
    findFirst.proyectoMiembros.mockResolvedValue(undefined)
    await expect(acceptInvitation('tok', 'u1')).resolves.toEqual({ success: true, projectId: 'p1' })
    expect(inserts[0]).toMatchObject({
      table: proyectoMiembros,
      values: { proyectoId: 'p1', usuarioId: 'u1', rol: 'editor' },
    })
    expect(updates[0]).toMatchObject({ set: { aceptada: true } })
  })

  it('rejects a missing invitation and hides accept failures', async () => {
    findFirst.invitaciones.mockResolvedValue(undefined)
    await expect(acceptInvitation('missing', 'u1')).resolves.toEqual({
      success: false,
      error: 'Invitación inválida o expirada',
    })

    findFirst.invitaciones.mockResolvedValue({
      id: 'inv-1',
      proyectoId: 'p1',
      email: 'ada@example.com',
      rol: 'editor',
      expiresAt: new Date(Date.now() + 60_000),
    })
    findFirst.usuarios.mockRejectedValue(new Error('down'))
    await expect(acceptInvitation('tok', 'u1')).resolves.toEqual({
      success: false,
      error: 'Error interno del servidor',
    })
  })
})

describe('password reset', () => {
  it('does not reveal whether the email exists', async () => {
    findFirst.usuarios.mockResolvedValue(undefined)
    await expect(createPasswordResetToken('missing@example.com')).resolves.toEqual({
      success: true,
      message: 'Si el correo existe, se enviará un enlace',
    })
    expect(inserts).toHaveLength(0)
  })

  it('creates a one hour token and rotates the password once', async () => {
    findFirst.usuarios.mockResolvedValue({ id: 'u1' })
    const before = Date.now()
    const created = await createPasswordResetToken('ada@example.com')

    expect(created.success).toBe(true)
    if (!created.success || !('token' in created)) return
    expect(created.token).toMatch(/^[a-f0-9]{64}$/)
    const expiresAt = (inserts[0].values as { expiresAt: Date }).expiresAt
    expect(expiresAt.getTime()).toBeGreaterThan(before + 59 * 60 * 1000)
    expect(expiresAt.getTime()).toBeLessThan(before + 61 * 60 * 1000)

    findFirst.passwordResetTokens.mockResolvedValue({ id: 'rt1', usuarioId: 'u1' })
    await expect(resetPasswordWithToken(created.token, 'brand-new-password')).resolves.toEqual({
      success: true,
    })
    expect(updates[0].table).toBe(usuarios)
    const hash = (updates[0].set as { passwordHash: string }).passwordHash
    expect(await verifyPassword('brand-new-password', hash)).toBe(true)
    expect(deletes[0].table).toBe(passwordResetTokens)
  })

  it('rejects an unknown reset token and hides database errors', async () => {
    findFirst.passwordResetTokens.mockResolvedValue(undefined)
    await expect(resetPasswordWithToken('missing', 'brand-new-password')).resolves.toEqual({
      success: false,
      error: 'Token inválido o expirado',
    })

    findFirst.usuarios.mockRejectedValue(new Error('down'))
    await expect(createPasswordResetToken('ada@example.com')).resolves.toEqual({
      success: false,
      error: 'Error interno del servidor',
    })

    findFirst.passwordResetTokens.mockResolvedValue({ id: 'rt1', usuarioId: 'u1' })
    failNext()
    await expect(resetPasswordWithToken('tok', 'brand-new-password')).resolves.toEqual({
      success: false,
      error: 'Error interno del servidor',
    })
  })
})

describe('global user role', () => {
  it('reads the account role', async () => {
    findFirst.usuarios.mockResolvedValue({ rol: 'admin' })
    await expect(userHasRole('u1', 'admin')).resolves.toBe(true)
    await expect(userHasRole('u1', 'viewer')).resolves.toBe(false)
    await expect(getUserRole('u1')).resolves.toBe('admin')

    findFirst.usuarios.mockResolvedValue(undefined)
    await expect(userHasRole('u1', 'admin')).resolves.toBe(false)
    await expect(getUserRole('u1')).resolves.toBeNull()
  })
})
