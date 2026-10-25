import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next/headers', () => import('../helpers/nextHeaders'))

vi.mock('@/lib/services/authService', () => ({
  checkProjectRole: vi.fn(),
  checkProjectAccess: vi.fn(),
}))

vi.mock('@/lib/services/projectService', () => ({
  createPayment: vi.fn(),
  getProjectPayments: vi.fn(),
}))

vi.mock('@/lib/services/r2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/r2')>()
  return {
    ...actual,
    getPresignedDownloadUrl: vi.fn(),
  }
})

import { checkProjectAccess, checkProjectRole } from '@/lib/services/authService'
import { createPayment, getProjectPayments } from '@/lib/services/projectService'
import { getPresignedDownloadUrl } from '@/lib/services/r2'
import { resetRequestContext } from '../helpers/nextHeaders'
import { jsonRequest } from '../helpers/http'
import { POST as createPaymentRoute } from '@/app/api/payments/route'
import { GET as listPayments } from '@/app/api/projects/[id]/payments/route'
import { GET as download } from '@/app/api/download/route'

const checkProjectRoleMock = vi.mocked(checkProjectRole)
const checkProjectAccessMock = vi.mocked(checkProjectAccess)
const createPaymentMock = vi.mocked(createPayment)
const getProjectPaymentsMock = vi.mocked(getProjectPayments)
const getPresignedDownloadUrlMock = vi.mocked(getPresignedDownloadUrl)

beforeEach(() => {
  resetRequestContext({ 'x-user-id': 'u1' })
  checkProjectRoleMock.mockReset()
  checkProjectAccessMock.mockReset()
  createPaymentMock.mockReset()
  getProjectPaymentsMock.mockReset()
  getPresignedDownloadUrlMock.mockReset()
})

describe('POST /api/payments', () => {
  it('lets editors record a payment against either a stage or an adicional', async () => {
    resetRequestContext()
    expect((await createPaymentRoute(jsonRequest('http://localhost/api/payments', {
      proyectoId: 'p1',
      montoPagado: 10,
      moneda: 'USD',
      fechaPago: '2026-03-01',
    }))).status).toBe(401)

    resetRequestContext({ 'x-user-id': 'u1' })
    const missing = await createPaymentRoute(jsonRequest('http://localhost/api/payments', {
      proyectoId: 'p1',
      montoPagado: 0,
      moneda: 'USD',
      fechaPago: '2026-03-01',
    }))
    expect(missing.status).toBe(400)

    const both = await createPaymentRoute(jsonRequest('http://localhost/api/payments', {
      proyectoId: 'p1',
      etapaId: 'e1',
      adicionalId: 'a1',
      montoPagado: 10,
      moneda: 'USD',
      fechaPago: '2026-03-01',
    }))
    expect(both.status).toBe(400)
    expect(createPaymentMock).not.toHaveBeenCalled()

    checkProjectRoleMock.mockResolvedValue(false)
    const forbidden = await createPaymentRoute(jsonRequest('http://localhost/api/payments', {
      proyectoId: 'p1',
      montoPagado: '12.5',
      moneda: 'USD',
      fechaPago: '2026-03-01',
    }))
    expect(forbidden.status).toBe(403)
    expect(checkProjectRoleMock).toHaveBeenCalledWith('u1', 'p1', ['admin', 'editor'])

    checkProjectRoleMock.mockResolvedValue(true)
    createPaymentMock.mockResolvedValue({ success: true, paymentId: 'pay-1' })
    const created = await createPaymentRoute(jsonRequest('http://localhost/api/payments', {
      proyectoId: 'p1',
      etapaId: '',
      montoPagado: '12.5',
      moneda: 'USD',
      fechaPago: '2026-03-01',
      comentario: 'Anticipo',
    }))
    expect(created.status).toBe(200)
    expect(createPaymentMock).toHaveBeenCalledWith({
      proyectoId: 'p1',
      etapaId: null,
      adicionalId: null,
      montoPagado: 12.5,
      moneda: 'USD',
      fechaPago: '2026-03-01',
      comentario: 'Anticipo',
      comprobanteUrl: undefined,
    })
  })
})

describe('GET /api/projects/[id]/payments', () => {
  it('signs stored R2 keys and leaves external urls untouched', async () => {
    checkProjectAccessMock.mockResolvedValue(false)
    const forbidden = await listPayments(new NextRequest('http://localhost/api/projects/p1/payments'), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(forbidden.status).toBe(403)

    checkProjectAccessMock.mockResolvedValue(true)
    getProjectPaymentsMock.mockResolvedValue([
      { id: '1', comprobanteUrl: 'obratracker/projects/p1/comprobantes/a.pdf' },
      { id: '2', comprobanteUrl: 'https://files.example/a.pdf' },
      { id: '3', comprobanteUrl: '/uploads/local.pdf' },
      { id: '4', comprobanteUrl: null },
    ] as never)
    getPresignedDownloadUrlMock.mockResolvedValue('https://signed.example/a')

    const response = await listPayments(new NextRequest('http://localhost/api/projects/p1/payments'), {
      params: Promise.resolve({ id: 'p1' }),
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      { id: '1', comprobanteUrl: 'https://signed.example/a' },
      { id: '2', comprobanteUrl: 'https://files.example/a.pdf' },
      { id: '3', comprobanteUrl: '/uploads/local.pdf' },
      { id: '4', comprobanteUrl: null },
    ])
    expect(getPresignedDownloadUrlMock).toHaveBeenCalledTimes(1)
    expect(getPresignedDownloadUrlMock).toHaveBeenCalledWith({
      key: 'obratracker/projects/p1/comprobantes/a.pdf',
    })
  })
})

describe('GET /api/download', () => {
  it('authorizes the project encoded in the object key before signing', async () => {
    const missing = await download(new NextRequest('http://localhost/api/download'))
    expect(missing.status).toBe(400)

    resetRequestContext()
    const anonymous = await download(new NextRequest('http://localhost/api/download?key=obratracker/projects/p1/planos/a.pdf'))
    expect(anonymous.status).toBe(401)

    resetRequestContext({ 'x-user-id': 'u1' })
    const invalid = await download(new NextRequest('http://localhost/api/download?key=planos/a.pdf'))
    expect(invalid.status).toBe(400)
    expect(checkProjectAccessMock).not.toHaveBeenCalled()

    checkProjectAccessMock.mockResolvedValue(false)
    const forbidden = await download(new NextRequest(
      'http://localhost/api/download?key=obratracker/projects/p1/planos/a.pdf',
    ))
    expect(forbidden.status).toBe(403)
    expect(checkProjectAccessMock).toHaveBeenCalledWith('u1', 'p1')
    expect(getPresignedDownloadUrlMock).not.toHaveBeenCalled()

    checkProjectAccessMock.mockResolvedValue(true)
    getPresignedDownloadUrlMock.mockResolvedValue('https://signed.example/a')
    const response = await download(new NextRequest(
      'http://localhost/api/download?key=obratracker/projects/p1/planos/a.pdf',
    ))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ downloadUrl: 'https://signed.example/a' })
  })
})
