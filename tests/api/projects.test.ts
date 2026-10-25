import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next/headers', () => import('../helpers/nextHeaders'))

vi.mock('@/lib/services/projectService', () => ({
  getAllProjects: vi.fn(),
  createProject: vi.fn(),
  getProjectSummary: vi.fn(),
  updateBudget: vi.fn(),
  getProjectPendientes: vi.fn(),
  createPendiente: vi.fn(),
}))

vi.mock('@/lib/services/authService', () => ({
  checkProjectRole: vi.fn(),
  checkProjectAccess: vi.fn(),
  getProjectMembership: vi.fn(),
}))

import {
  createPendiente,
  createProject,
  getAllProjects,
  getProjectPendientes,
  getProjectSummary,
  updateBudget,
} from '@/lib/services/projectService'
import { checkProjectAccess, checkProjectRole, getProjectMembership } from '@/lib/services/authService'
import { resetRequestContext } from '../helpers/nextHeaders'
import { jsonRequest } from '../helpers/http'
import { GET as listProjects, POST as createProjectRoute } from '@/app/api/projects/route'
import { GET as getProject } from '@/app/api/projects/[id]/route'
import { PUT as updateBudgetRoute } from '@/app/api/projects/[id]/budget/route'
import { GET as getMembership } from '@/app/api/projects/[id]/membership/route'
import { GET as listPendientes, POST as createPendienteRoute } from '@/app/api/projects/[id]/pendientes/route'

const getAllProjectsMock = vi.mocked(getAllProjects)
const createProjectMock = vi.mocked(createProject)
const getProjectSummaryMock = vi.mocked(getProjectSummary)
const updateBudgetMock = vi.mocked(updateBudget)
const getProjectPendientesMock = vi.mocked(getProjectPendientes)
const createPendienteMock = vi.mocked(createPendiente)
const checkProjectRoleMock = vi.mocked(checkProjectRole)
const checkProjectAccessMock = vi.mocked(checkProjectAccess)
const getProjectMembershipMock = vi.mocked(getProjectMembership)

const projectParams = { params: Promise.resolve({ id: 'p1' }) }

beforeEach(() => {
  resetRequestContext({ 'x-user-id': 'u1' })
  getAllProjectsMock.mockReset()
  createProjectMock.mockReset()
  getProjectSummaryMock.mockReset()
  updateBudgetMock.mockReset()
  getProjectPendientesMock.mockReset()
  createPendienteMock.mockReset()
  checkProjectRoleMock.mockReset()
  checkProjectAccessMock.mockReset()
  getProjectMembershipMock.mockReset()
})

function etapa(overrides: Record<string, unknown> = {}) {
  return {
    nombre: 'Cimientos',
    porcentajeTotal: 100,
    duracionEstimadaJornales: 5,
    tareas: [{ descripcion: 'Excavar' }],
    ...overrides,
  }
}

describe('project list and creation', () => {
  it('requires a session to list projects', async () => {
    resetRequestContext()
    const response = await listProjects()
    expect(response.status).toBe(401)
    expect(getAllProjectsMock).not.toHaveBeenCalled()

    resetRequestContext({ 'x-user-id': 'u1' })
    getAllProjectsMock.mockResolvedValue([{ id: 'p1' }] as never)
    const ok = await listProjects()
    expect(ok.status).toBe(200)
    expect(getAllProjectsMock).toHaveBeenCalledWith('u1')
  })

  it('rejects a project whose stages do not sum to 100 or have no tasks', async () => {
    const body = {
      nombre: '  Casa  ',
      moneda: 'USD',
      presupuestoTotal: 1000,
      etapas: [etapa({ porcentajeTotal: 40 }), etapa({ nombre: 'Techo', porcentajeTotal: 50 })],
    }
    const badSum = await createProjectRoute(jsonRequest('http://localhost/api/projects', body))
    expect(badSum.status).toBe(400)
    await expect(badSum.json()).resolves.toEqual({ error: 'La suma de porcentajes debe ser 100%' })

    const noTasks = await createProjectRoute(jsonRequest('http://localhost/api/projects', {
      ...body,
      etapas: [etapa({ tareas: [{ descripcion: '   ' }] })],
    }))
    expect(noTasks.status).toBe(400)
    expect(createProjectMock).not.toHaveBeenCalled()
  })

  it('trims the name and assigns the session user as owner', async () => {
    createProjectMock.mockResolvedValue({ success: true, projectId: 'p1' })
    const etapas = [etapa()]
    const response = await createProjectRoute(jsonRequest('http://localhost/api/projects', {
      nombre: '  Casa  ',
      moneda: 'USD',
      presupuestoTotal: 1000,
      etapas,
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      projectId: 'p1',
      message: 'Project created successfully',
    })
    expect(createProjectMock).toHaveBeenCalledWith('Casa', 'USD', 1000, etapas, 'u1')
  })

  it('returns 404 when the caller cannot see the project', async () => {
    getProjectSummaryMock.mockResolvedValue(null)
    const response = await getProject(new NextRequest('http://localhost/api/projects/p1'), projectParams)
    expect(response.status).toBe(404)
    expect(getProjectSummaryMock).toHaveBeenCalledWith('p1', 'u1')
  })
})

describe('PUT /api/projects/[id]/budget', () => {
  it('allows only a project admin to set a positive amount', async () => {
    resetRequestContext()
    const anonymous = await updateBudgetRoute(jsonRequest('http://localhost/api/projects/p1/budget', {
      newAmount: 100,
    }, { method: 'PUT' }), projectParams)
    expect(anonymous.status).toBe(401)

    resetRequestContext({ 'x-user-id': 'u1' })
    checkProjectRoleMock.mockResolvedValue(false)
    const forbidden = await updateBudgetRoute(jsonRequest('http://localhost/api/projects/p1/budget', {
      newAmount: 100,
    }, { method: 'PUT' }), projectParams)
    expect(forbidden.status).toBe(403)
    expect(checkProjectRoleMock).toHaveBeenCalledWith('u1', 'p1', ['admin'])

    checkProjectRoleMock.mockResolvedValue(true)
    for (const newAmount of [0, -5, '100']) {
      const invalid = await updateBudgetRoute(jsonRequest('http://localhost/api/projects/p1/budget', {
        newAmount,
      }, { method: 'PUT' }), projectParams)
      expect(invalid.status).toBe(400)
    }
    expect(updateBudgetMock).not.toHaveBeenCalled()
  })

  it('passes the note and treats any non-empty distribute flag as true', async () => {
    checkProjectRoleMock.mockResolvedValue(true)
    updateBudgetMock.mockResolvedValue({ success: true })

    const response = await updateBudgetRoute(jsonRequest('http://localhost/api/projects/p1/budget', {
      newAmount: 1500,
      distributeProportionally: 'false',
    }, { method: 'PUT' }), projectParams)

    expect(response.status).toBe(200)
    expect(updateBudgetMock).toHaveBeenCalledWith('p1', 1500, 'Updated via API', true)
  })
})

describe('membership and pendientes', () => {
  it('returns the project role or 403', async () => {
    resetRequestContext()
    expect((await getMembership(new Request('http://localhost'), projectParams)).status).toBe(401)

    resetRequestContext({ 'x-user-id': 'u1' })
    getProjectMembershipMock.mockResolvedValue(null)
    expect((await getMembership(new Request('http://localhost'), projectParams)).status).toBe(403)

    getProjectMembershipMock.mockResolvedValue({ rol: 'editor' } as never)
    const response = await getMembership(new Request('http://localhost'), projectParams)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ rol: 'editor' })
  })

  it('filters pendientes only when estado=pendiente and trims new titles', async () => {
    checkProjectAccessMock.mockResolvedValue(false)
    const forbidden = await listPendientes(new NextRequest('http://localhost/api/projects/p1/pendientes'), projectParams)
    expect(forbidden.status).toBe(403)

    checkProjectAccessMock.mockResolvedValue(true)
    getProjectPendientesMock.mockResolvedValue([{ id: 'pen-1' }] as never)
    const pending = await listPendientes(
      new NextRequest('http://localhost/api/projects/p1/pendientes?estado=pendiente'),
      projectParams,
    )
    expect(pending.status).toBe(200)
    expect(getProjectPendientesMock).toHaveBeenCalledWith('p1', true)

    const all = await listPendientes(new NextRequest('http://localhost/api/projects/p1/pendientes?estado=todos'), projectParams)
    expect(all.status).toBe(200)
    expect(getProjectPendientesMock).toHaveBeenLastCalledWith('p1', false)

    const missingFields = await createPendienteRoute(jsonRequest('http://localhost/api/projects/p1/pendientes', {
      titulo: 'Cemento',
    }), projectParams)
    expect(missingFields.status).toBe(400)

    createPendienteMock.mockResolvedValue({ success: true, pendienteId: 'pen-2' })
    const created = await createPendienteRoute(jsonRequest('http://localhost/api/projects/p1/pendientes', {
      titulo: '  Cemento  ',
      descripcion: '  10 bolsas  ',
      fechaVencimiento: '2026-04-01',
    }), projectParams)
    expect(created.status).toBe(200)
    expect(createPendienteMock).toHaveBeenCalledWith({
      proyectoId: 'p1',
      titulo: 'Cemento',
      descripcion: '10 bolsas',
      fechaVencimiento: '2026-04-01',
    })
  })
})
