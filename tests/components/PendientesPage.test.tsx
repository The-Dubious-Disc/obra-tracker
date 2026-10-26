// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PendienteConFotos } from '@/types/database.types'

const ANA = '11111111-1111-4111-8111-111111111111'
const NICO = '44444444-4444-4444-8444-444444444444'

const hooks = vi.hoisted(() => ({
  createPendiente: vi.fn().mockResolvedValue(true),
  updatePendiente: vi.fn().mockResolvedValue(true),
  deletePendiente: vi.fn().mockResolvedValue(true),
  refetch: vi.fn(),
  pendientes: [] as PendienteConFotos[],
}))

hooks.pendientes = [
  {
    id: 'pen-1',
    proyectoId: 'p1',
    titulo: 'Revoque',
    descripcion: 'Falta el muro',
    estado: 'pendiente',
    responsableUsuarioId: ANA,
    responsableConstructor: false,
    responsableNombre: 'Ana Pérez',
    responsableEmail: 'ana@obra.test',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
    fotos: [],
  },
  {
    id: 'pen-2',
    proyectoId: 'p1',
    titulo: 'Encofrado',
    descripcion: null,
    estado: 'pendiente',
    responsableUsuarioId: null,
    responsableConstructor: true,
    responsableNombre: null,
    responsableEmail: null,
    createdAt: '2026-10-02',
    updatedAt: '2026-10-02',
    fotos: [],
  },
  {
    id: 'pen-3',
    proyectoId: 'p1',
    titulo: 'Tabique',
    descripcion: 'Hueco',
    estado: 'pendiente',
    responsableUsuarioId: NICO,
    responsableConstructor: false,
    responsableNombre: 'Nico',
    responsableEmail: 'nico@obra.test',
    createdAt: '2026-10-03',
    updatedAt: '2026-10-03',
    fotos: [],
  },
]

vi.mock('@/hooks/useProject', () => ({
  usePendientes: () => ({
    pendientes: hooks.pendientes,
    isLoading: false,
    error: null,
    refetch: hooks.refetch,
  }),
  useUpdatePendiente: () => ({
    updatePendiente: hooks.updatePendiente,
    isUpdating: false,
    error: null,
  }),
  useDeletePendiente: () => ({ deletePendiente: hooks.deletePendiente }),
  useCreatePendiente: () => ({
    createPendiente: hooks.createPendiente,
    isCreating: false,
    error: null,
  }),
  useDeletePendienteFoto: () => ({
    deleteFoto: vi.fn(),
    deletingFotoId: null,
    error: null,
  }),
}))

vi.mock('@/contexts/ProjectContext', () => ({
  useProjectSelection: () => ({
    selectedProjectId: 'p1',
    projects: [{ id: 'p1', nombre: 'Casa Norte' }],
  }),
}))

import PendientesPage from '@/app/pendientes/page'

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('pantalla de pendientes', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    hooks.createPendiente.mockClear()
    hooks.updatePendiente.mockClear()
    hooks.refetch.mockClear()
    fetchMock.mockReset()
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/members')) {
        return jsonResponse([
          { usuario: { id: ANA, nombre: 'Ana Pérez', email: 'ana@obra.test' } },
          { usuario: { id: 'u-mail', nombre: '   ', email: 'obra@cheto.club' } },
        ])
      }
      if (url.includes('/pendientes/pdf')) {
        return new Response(new Uint8Array([37, 80, 68, 70]), {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename="pendientes-casa.pdf"' },
        })
      }
      return jsonResponse([])
    })
    vi.stubGlobal('fetch', fetchMock)
    if (typeof URL.createObjectURL !== 'function') {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: () => 'blob:pdf' })
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: () => {} })
    }
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  it('muestra el responsable y exporta todos o uno elegido', async () => {
    const user = userEvent.setup()
    render(<PendientesPage />)

    expect(screen.getByRole('heading', { name: 'Revoque' })).toBeInTheDocument()
    expect(screen.getByText('Responsable: Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Responsable: Constructor')).toBeInTheDocument()
    expect(screen.getByText('Responsable: Nico')).toBeInTheDocument()

    const alcance = screen.getByLabelText('Qué pendientes incluir en el PDF')
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeEnabled()
    await user.selectOptions(alcance, 'responsable')
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeDisabled()

    const filtro = await screen.findByLabelText('Responsable del PDF')
    await screen.findByRole('option', { name: 'obra@cheto.club' })
    await user.selectOptions(filtro, 'constructor')
    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/pendientes/pdf?responsable=constructor')
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeEnabled())

    await user.selectOptions(alcance, 'todos')
    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/projects/p1/pendientes/pdf')
    })
  })

  it('elige responsable al crear y conserva a quien ya no está en el proyecto', async () => {
    const user = userEvent.setup()
    render(<PendientesPage />)

    await user.click(screen.getByRole('button', { name: 'Nuevo pendiente' }))
    const crear = await screen.findByLabelText('Responsable')
    await screen.findByRole('option', { name: 'Ana Pérez' })
    expect(within(crear).getByRole('option', { name: 'Constructor' })).toBeInTheDocument()
    expect(within(crear).getByRole('option', { name: 'Sin responsable' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Título'), 'Revisar losa')
    await user.selectOptions(crear, 'constructor')
    await user.click(screen.getByRole('button', { name: 'Crear pendiente' }))

    await waitFor(() => {
      expect(hooks.createPendiente).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'p1',
        titulo: 'Revisar losa',
        responsable: { tipo: 'constructor' },
      }))
    })

    const tarjeta = screen.getByRole('heading', { name: 'Tabique' }).closest('article')
    expect(tarjeta).not.toBeNull()
    await user.click(within(tarjeta as HTMLElement).getByRole('button', { name: 'Editar' }))
    const editar = await screen.findByLabelText('Responsable')
    expect(editar).toHaveValue(NICO)
    expect(within(editar).getByRole('option', { name: 'Nico' })).toBeInTheDocument()
    await user.selectOptions(editar, '')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(hooks.updatePendiente).toHaveBeenCalledWith('pen-3', expect.objectContaining({
        responsable: null,
      }), expect.objectContaining({ projectId: 'p1' }))
    })
  })
})
