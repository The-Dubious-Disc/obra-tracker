import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next/headers', () => import('../helpers/nextHeaders'))

vi.mock('@/lib/services/authService', () => ({
  getInvitationByToken: vi.fn(),
  acceptInvitation: vi.fn(),
  createInvitation: vi.fn(),
  checkProjectRole: vi.fn(),
}))

vi.mock('@/lib/services/projectService', () => ({
  getProjectSummary: vi.fn(),
}))

vi.mock('@/lib/services/emailService', () => ({
  sendProjectInvitationEmail: vi.fn(),
}))

import {
  acceptInvitation,
  checkProjectRole,
  createInvitation,
  getInvitationByToken,
} from '@/lib/services/authService'
import { getProjectSummary } from '@/lib/services/projectService'
import { sendProjectInvitationEmail } from '@/lib/services/emailService'
import { resetRequestContext } from '../helpers/nextHeaders'
import { jsonRequest } from '../helpers/http'
import { GET as getInvitation } from '@/app/api/invitations/[token]/route'
import { POST as accept } from '@/app/api/invitations/[token]/accept/route'
import { POST as invite } from '@/app/api/projects/[id]/invite/route'

const getInvitationByTokenMock = vi.mocked(getInvitationByToken)
const acceptInvitationMock = vi.mocked(acceptInvitation)
const createInvitationMock = vi.mocked(createInvitation)
const checkProjectRoleMock = vi.mocked(checkProjectRole)
const getProjectSummaryMock = vi.mocked(getProjectSummary)
const sendProjectInvitationEmailMock = vi.mocked(sendProjectInvitationEmail)

beforeEach(() => {
  resetRequestContext()
  getInvitationByTokenMock.mockReset()
  acceptInvitationMock.mockReset()
  createInvitationMock.mockReset()
  checkProjectRoleMock.mockReset()
  getProjectSummaryMock.mockReset()
  sendProjectInvitationEmailMock.mockReset()
})

describe('GET /api/invitations/[token]', () => {
  it('returns the invitation or a 404', async () => {
    getInvitationByTokenMock.mockResolvedValue(null)
    const missing = await getInvitation(new NextRequest('http://localhost/api/invitations/tok'), {
      params: Promise.resolve({ token: 'tok' }),
    })
    expect(missing.status).toBe(404)

    getInvitationByTokenMock.mockResolvedValue({ id: 'inv-1', email: 'ada@example.com' } as never)
    const found = await getInvitation(new NextRequest('http://localhost/api/invitations/tok'), {
      params: Promise.resolve({ token: 'tok' }),
    })
    expect(found.status).toBe(200)
    await expect(found.json()).resolves.toMatchObject({ id: 'inv-1' })
    expect(getInvitationByTokenMock).toHaveBeenCalledWith('tok')
  })
})

describe('POST /api/invitations/[token]/accept', () => {
  it('requires the session user and returns the service error', async () => {
    const anonymous = await accept(new NextRequest('http://localhost/api/invitations/tok/accept', { method: 'POST' }), {
      params: Promise.resolve({ token: 'tok' }),
    })
    expect(anonymous.status).toBe(401)
    expect(acceptInvitationMock).not.toHaveBeenCalled()

    resetRequestContext({ 'x-user-id': 'u1' })
    acceptInvitationMock.mockResolvedValue({ success: false, error: 'Esta invitación corresponde a otro correo' })
    const denied = await accept(new NextRequest('http://localhost/api/invitations/tok/accept', { method: 'POST' }), {
      params: Promise.resolve({ token: 'tok' }),
    })
    expect(denied.status).toBe(400)
    expect(acceptInvitationMock).toHaveBeenCalledWith('tok', 'u1')

    acceptInvitationMock.mockResolvedValue({ success: true, projectId: 'p1' })
    const ok = await accept(new NextRequest('http://localhost/api/invitations/tok/accept', { method: 'POST' }), {
      params: Promise.resolve({ token: 'tok' }),
    })
    expect(ok.status).toBe(200)
    await expect(ok.json()).resolves.toEqual({ message: 'Invitation accepted' })
  })
})

describe('POST /api/projects/[id]/invite', () => {
  const params = { params: Promise.resolve({ id: 'p1' }) }

  it('requires an authenticated project admin', async () => {
    const anonymous = await invite(jsonRequest('http://localhost/api/projects/p1/invite', {
      email: 'ada@example.com',
      rol: 'editor',
    }), params)
    expect(anonymous.status).toBe(401)

    resetRequestContext({ 'x-user-id': 'u1' })
    checkProjectRoleMock.mockResolvedValue(false)
    const forbidden = await invite(jsonRequest('http://localhost/api/projects/p1/invite', {
      email: 'ada@example.com',
      rol: 'editor',
    }), params)
    expect(forbidden.status).toBe(403)
    expect(checkProjectRoleMock).toHaveBeenCalledWith('u1', 'p1', ['admin'])
    expect(createInvitationMock).not.toHaveBeenCalled()
  })

  it('sends the invitation email with the project name', async () => {
    resetRequestContext({ 'x-user-id': 'admin-1' })
    checkProjectRoleMock.mockResolvedValue(true)
    createInvitationMock.mockResolvedValue({
      success: true,
      invitation: { token: 'invite-token' },
    } as never)
    getProjectSummaryMock.mockResolvedValue({ proyecto: { nombre: 'Casa Norte' } } as never)
    sendProjectInvitationEmailMock.mockResolvedValue({ success: true, mock: true })

    const response = await invite(jsonRequest('http://localhost/api/projects/p1/invite', {
      email: 'ada@example.com',
      rol: 'viewer',
    }), params)

    expect(response.status).toBe(200)
    expect(createInvitationMock).toHaveBeenCalledWith('p1', 'ada@example.com', 'viewer', 'admin-1')
    expect(sendProjectInvitationEmailMock).toHaveBeenCalledWith('ada@example.com', 'Casa Norte', 'invite-token')
  })

  it('uses a generic project name when the summary is missing and surfaces create errors', async () => {
    resetRequestContext({ 'x-user-id': 'admin-1' })
    checkProjectRoleMock.mockResolvedValue(true)
    createInvitationMock.mockResolvedValue({ success: false, error: 'Este usuario ya es miembro del proyecto' })

    const duplicate = await invite(jsonRequest('http://localhost/api/projects/p1/invite', {
      email: 'ada@example.com',
      rol: 'viewer',
    }), params)
    expect(duplicate.status).toBe(400)
    expect(sendProjectInvitationEmailMock).not.toHaveBeenCalled()

    createInvitationMock.mockResolvedValue({
      success: true,
      invitation: { token: 'invite-token' },
    } as never)
    getProjectSummaryMock.mockResolvedValue(null)
    sendProjectInvitationEmailMock.mockResolvedValue({ success: true, mock: true })

    const response = await invite(jsonRequest('http://localhost/api/projects/p1/invite', {
      email: 'ada@example.com',
      rol: 'viewer',
    }), params)
    expect(response.status).toBe(200)
    expect(sendProjectInvitationEmailMock).toHaveBeenCalledWith('ada@example.com', 'un proyecto', 'invite-token')
  })
})
