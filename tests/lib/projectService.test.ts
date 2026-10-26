import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', async () => {
  const mod = await import('../helpers/db')
  return { db: mod.db }
})

import { etapas, pagos, pendientes, presupuestoVersiones, proyectoMiembros, proyectos } from '@/lib/db/schema'
import {
  addEtapa,
  createPayment,
  createPendiente,
  createProject,
  getProjectMemberDisplayName,
  getProjectPendientesConFotos,
  getProjectSummary,
  updateBudget,
  updatePendiente,
} from '@/lib/services/projectService'
import { failNext, findFirst, inserts, queueInsert, queueSelect, resetDb, selectCount, updates } from '../helpers/db'

beforeEach(() => {
  resetDb()
})

describe('getProjectSummary', () => {
  it('returns null when the user is not a member or the query fails', async () => {
    findFirst.proyectoMiembros.mockResolvedValue(undefined)
    await expect(getProjectSummary('p1', 'u1')).resolves.toBeNull()
    expect(selectCount).toBe(0)

    findFirst.proyectos.mockRejectedValue(new Error('down'))
    await expect(getProjectSummary('p1')).resolves.toBeNull()
  })

  it('weights stage progress by jornales and counts each adicional as 5 jornales', async () => {
    findFirst.proyectos.mockResolvedValue({ id: 'p1', nombre: 'Casa' })
    queueSelect([
      {
        id: 'e1',
        orden: 1,
        nombre: 'Cimientos',
        montoEtapa: '800.00',
        duracionEstimadaJornales: 10,
      },
    ])
    queueSelect([{ id: 'a1', monto: '200.00', completado: true }])
    queueSelect([
      { id: 't1', estado: 'completada' },
      { id: 't2', estado: 'pendiente' },
    ])
    queueSelect([{ montoPagado: '100.50' }])
    queueSelect([{ montoPagado: '100.50' }, { montoPagado: '40' }])
    findFirst.presupuestoVersiones.mockResolvedValue({ id: 'b1', esActiva: true, monto: '1000' })

    const summary = await getProjectSummary('p1')

    expect(summary).not.toBeNull()
    expect(summary!.etapas[0]).toMatchObject({
      tareasTotal: 2,
      tareasCompletadas: 1,
      porcentajeCompletado: 50,
      pagosTotales: 100.5,
    })
    expect(summary!.totalPagado).toBe(140.5)
    expect(summary!.totalJornales).toBe(15)
    expect(summary!.porcentajeAvance).toBeCloseTo(1000 / 15)
    expect(summary!.jornalesCompletados).toBeCloseTo(10)
    expect(summary!.presupuestoTotalCalculado).toBe(1000)
    expect(summary!.presupuestoActivo).toMatchObject({ id: 'b1' })
    expect(findFirst.proyectoMiembros).not.toHaveBeenCalled()
  })

  it('ignores a stage whose jornales are null and still counts adicionales', async () => {
    findFirst.proyectos.mockResolvedValue({ id: 'p1' })
    queueSelect([{ id: 'e1', montoEtapa: '10', duracionEstimadaJornales: null }])
    queueSelect([{ id: 'a1', monto: '50', completado: false }])
    queueSelect([{ estado: 'completada' }])
    queueSelect([])
    queueSelect([])
    findFirst.presupuestoVersiones.mockResolvedValue(undefined)

    const summary = await getProjectSummary('p1')

    expect(summary!.etapas[0].porcentajeCompletado).toBe(100)
    expect(summary!.totalJornales).toBe(5)
    expect(summary!.porcentajeAvance).toBe(0)
    expect(summary!.jornalesCompletados).toBe(0)
    expect(summary!.presupuestoActivo).toBeNull()
    expect(summary!.presupuestoTotalCalculado).toBe(60)
  })

  it('reports zero progress when there is no work to weight', async () => {
    findFirst.proyectos.mockResolvedValue({ id: 'p1' })
    queueSelect([])
    queueSelect([])
    queueSelect([])
    findFirst.presupuestoVersiones.mockResolvedValue(undefined)

    const summary = await getProjectSummary('p1')
    expect(summary!.porcentajeAvance).toBe(0)
    expect(summary!.totalJornales).toBe(0)
    expect(summary!.jornalesCompletados).toBe(0)
    expect(summary!.presupuestoTotalCalculado).toBe(0)
  })
})

describe('createProject', () => {
  it('makes the owner an admin and prices each stage from its percentage', async () => {
    queueInsert([{ id: 'proj-1' }])
    queueInsert(undefined)
    queueInsert(undefined)
    queueInsert([{ id: 'etapa-1' }])
    queueInsert(undefined)
    queueInsert([{ id: 'etapa-2' }])
    queueInsert(undefined)

    const result = await createProject('Casa', 'USD', 1000, [
      {
        nombre: 'Cimientos',
        porcentajeTotal: 25,
        duracionEstimadaJornales: 4,
        hitoVerificacion: 'Hormigón',
        tareas: [{ descripcion: 'Excavar' }],
      },
      {
        nombre: 'Estructura',
        porcentajeTotal: 75,
        duracionEstimadaJornales: 8,
        tareas: [{ descripcion: 'Columnas' }, { descripcion: 'Losas' }],
      },
    ], 'owner-1')

    expect(result).toEqual({ success: true, projectId: 'proj-1' })
    expect(inserts[0]).toMatchObject({
      table: proyectos,
      values: {
        nombre: 'Casa',
        moneda: 'USD',
        presupuestoTotalUsd: '1000',
        montoTotalActivo: '1000',
      },
    })
    expect(inserts[1]).toMatchObject({
      table: proyectoMiembros,
      values: { proyectoId: 'proj-1', usuarioId: 'owner-1', rol: 'admin' },
    })
    expect(inserts[2]).toMatchObject({
      table: presupuestoVersiones,
      values: { proyectoId: 'proj-1', monto: '1000', notasCambio: 'Presupuesto inicial', esActiva: true },
    })
    expect(inserts[3]).toMatchObject({
      table: etapas,
      values: {
        orden: 1,
        nombre: 'Cimientos',
        porcentajeTotal: '25',
        porcentajePeso: '25',
        montoUsd: '250.00',
        montoEtapa: '250.00',
        duracionEstimadaJornales: 4,
        hitoVerificacion: 'Hormigón',
      },
    })
    expect(inserts[4].values).toEqual([{ etapaId: 'etapa-1', descripcion: 'Excavar' }])
    expect(inserts[5]).toMatchObject({
      values: {
        orden: 2,
        montoUsd: '750.00',
        montoEtapa: '750.00',
        hitoVerificacion: null,
      },
    })
    expect(inserts[6].values).toEqual([
      { etapaId: 'etapa-2', descripcion: 'Columnas' },
      { etapaId: 'etapa-2', descripcion: 'Losas' },
    ])
  })

  it('defaults currency to UYU and skips membership when there is no owner', async () => {
    queueInsert([{ id: 'proj-2' }])

    await expect(createProject('Obra')).resolves.toEqual({ success: true, projectId: 'proj-2' })
    expect(inserts).toHaveLength(2)
    expect(inserts[0].values).toMatchObject({ moneda: 'UYU', presupuestoTotalUsd: '0', montoTotalActivo: '0' })
    expect(inserts.some((entry) => entry.table === proyectoMiembros)).toBe(false)
  })

  it('returns a database error when the insert fails', async () => {
    failNext()
    await expect(createProject('Obra', 'USD', 10)).resolves.toEqual({
      success: false,
      error: 'Database error',
    })
  })
})

describe('updateBudget', () => {
  it('activates a new version and redistributes stage amounts from percentages', async () => {
    queueSelect([
      { id: 'e1', porcentajeTotal: '40' },
      { id: 'e2', porcentajeTotal: '60' },
    ])

    await expect(updateBudget('p1', 1500, 'ajuste', true)).resolves.toEqual({ success: true })

    expect(updates[0]).toMatchObject({ table: presupuestoVersiones, set: { esActiva: false } })
    expect(inserts[0]).toMatchObject({
      table: presupuestoVersiones,
      values: { proyectoId: 'p1', monto: '1500', notasCambio: 'ajuste', esActiva: true },
    })
    expect(updates[1]).toMatchObject({
      table: proyectos,
      set: { montoTotalActivo: '1500' },
    })
    expect((updates[1].set as { updatedAt: Date }).updatedAt).toBeInstanceOf(Date)
    expect(updates[2]).toMatchObject({ table: etapas, set: { montoUsd: '600.00', montoEtapa: '600.00' } })
    expect(updates[3]).toMatchObject({ table: etapas, set: { montoUsd: '900.00', montoEtapa: '900.00' } })
  })

  it('leaves stage amounts alone unless redistribution is requested', async () => {
    await expect(updateBudget('p1', 900, 'nota')).resolves.toEqual({ success: true })
    expect(selectCount).toBe(0)
    expect(updates).toHaveLength(2)
  })
})

describe('addEtapa and createPayment', () => {
  it('appends a stage using the active budget and the current stage count', async () => {
    findFirst.proyectos.mockResolvedValue(undefined)
    await expect(addEtapa('p1', {
      nombre: 'Techo',
      porcentajeTotal: 10,
      duracionEstimadaJornales: 3,
      tareas: [],
    })).resolves.toEqual({ success: false, error: 'Project not found' })

    findFirst.proyectos.mockResolvedValue({ id: 'p1', montoTotalActivo: '2000.00' })
    queueSelect([{ id: 'e1' }, { id: 'e2' }])
    queueInsert([{ id: 'etapa-9' }])

    await expect(addEtapa('p1', {
      nombre: 'Techo',
      porcentajeTotal: 10,
      duracionEstimadaJornales: 3,
      tareas: [{ descripcion: 'Cubierta' }],
    })).resolves.toEqual({ success: true, etapaId: 'etapa-9' })

    expect(inserts[0]).toMatchObject({
      table: etapas,
      values: {
        orden: 3,
        montoUsd: '200.00',
        montoEtapa: '200.00',
        porcentajeTotal: '10',
      },
    })
    expect(inserts[1].values).toEqual([{ etapaId: 'etapa-9', descripcion: 'Cubierta' }])
  })

  it('records a confirmed payment with a string amount', async () => {
    queueInsert([{ id: 'pay-1' }])

    await expect(createPayment({
      proyectoId: 'p1',
      etapaId: null,
      adicionalId: 'a1',
      montoPagado: 10.5,
      moneda: 'USD',
      fechaPago: '2026-03-01',
      comentario: 'Anticipo',
    })).resolves.toEqual({ success: true, paymentId: 'pay-1' })

    expect(inserts[0]).toMatchObject({
      table: pagos,
      values: {
        proyectoId: 'p1',
        etapaId: null,
        adicionalId: 'a1',
        montoPagado: '10.5',
        moneda: 'USD',
        estado: 'confirmado',
      },
    })
  })
})

describe('responsable de pendientes', () => {
  const usuario = '11111111-1111-4111-8111-111111111111'

  it('deja el responsable vacío, asigna Constructor o un miembro del proyecto', async () => {
    await expect(createPendiente({
      proyectoId: 'p1',
      titulo: 'Revoque',
    })).resolves.toMatchObject({ success: true })
    expect(inserts[0]).toMatchObject({
      table: pendientes,
      values: { proyectoId: 'p1', titulo: 'Revoque', descripcion: null },
    })
    expect(inserts[0].values).not.toHaveProperty('responsableUsuarioId')
    expect(inserts[0].values).not.toHaveProperty('responsableConstructor')
    expect(findFirst.proyectoMiembros).not.toHaveBeenCalled()

    inserts.length = 0
    await expect(createPendiente({
      proyectoId: 'p1',
      titulo: 'Encofrado',
      responsable: null,
    })).resolves.toMatchObject({ success: true })
    expect(inserts[0].values).toMatchObject({
      responsableUsuarioId: null,
      responsableConstructor: false,
    })

    inserts.length = 0
    await expect(createPendiente({
      proyectoId: 'p1',
      titulo: 'Hormigón',
      responsable: { tipo: 'constructor' },
    })).resolves.toMatchObject({ success: true })
    expect(inserts[0].values).toMatchObject({
      responsableUsuarioId: null,
      responsableConstructor: true,
    })

    inserts.length = 0
    findFirst.proyectoMiembros.mockResolvedValue({ id: 'm1' })
    await expect(createPendiente({
      proyectoId: 'p1',
      titulo: 'Instalación',
      responsable: { tipo: 'usuario', usuarioId: usuario },
    })).resolves.toMatchObject({ success: true })
    expect(inserts[0].values).toMatchObject({
      responsableUsuarioId: usuario,
      responsableConstructor: false,
    })
  })

  it('rechaza un usuario sin acceso y conserva al asignado actual', async () => {
    findFirst.proyectoMiembros.mockResolvedValue(undefined)
    await expect(createPendiente({
      proyectoId: 'p1',
      titulo: 'Revoque',
      responsable: { tipo: 'usuario', usuarioId: usuario },
    })).resolves.toEqual({
      success: false,
      error: 'El responsable no tiene acceso al proyecto',
      status: 400,
    })
    expect(inserts).toHaveLength(0)

    await expect(updatePendiente('pen-1', {
      responsable: { tipo: 'usuario', usuarioId: usuario },
    }, {
      proyectoId: 'p1',
      responsableUsuarioId: usuario,
    })).resolves.toEqual({ success: true })
    expect(updates[0].set).toMatchObject({
      responsableUsuarioId: usuario,
      responsableConstructor: false,
    })

    updates.length = 0
    await expect(updatePendiente('pen-1', {
      responsable: { tipo: 'usuario', usuarioId: '22222222-2222-4222-8222-222222222222' },
    }, {
      proyectoId: 'p1',
      responsableUsuarioId: usuario,
    })).resolves.toMatchObject({ success: false, status: 400 })
    expect(updates).toHaveLength(0)
  })

  it('actualiza el estado sin tocar el responsable y arma la etiqueta del miembro', async () => {
    await expect(updatePendiente('pen-1', { estado: 'completado' }, { proyectoId: 'p1' }))
      .resolves.toEqual({ success: true })
    expect(updates[0].set).toMatchObject({ estado: 'completado' })
    expect(updates[0].set).not.toHaveProperty('responsableConstructor')
    expect(findFirst.proyectoMiembros).not.toHaveBeenCalled()

    await expect(updatePendiente('pen-1', { responsable: null }, { proyectoId: 'p1', responsableUsuarioId: usuario }))
      .resolves.toEqual({ success: true })
    expect(updates[1].set).toMatchObject({
      responsableUsuarioId: null,
      responsableConstructor: false,
    })

    queueSelect([{ nombre: '   ', email: 'ana@obra.test' }])
    await expect(getProjectMemberDisplayName('p1', usuario)).resolves.toBe('ana@obra.test')
    queueSelect([])
    await expect(getProjectMemberDisplayName('p1', usuario)).resolves.toBeNull()
  })

  it('adjunta el nombre del responsable al listar pendientes con fotos', async () => {
    queueSelect([{
      id: 'pen-1',
      proyectoId: 'p1',
      titulo: 'Revoque',
      descripcion: null,
      estado: 'pendiente',
      responsableUsuarioId: usuario,
      responsableConstructor: false,
      createdAt: null,
      updatedAt: null,
      responsableNombre: '',
      responsableEmail: 'ana@obra.test',
    }])
    queueSelect([{ id: 'foto-1', pendienteId: 'pen-1', r2Key: 'k', nombre: 'muro.jpg', orden: 0 }])

    const rows = await getProjectPendientesConFotos('p1')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      titulo: 'Revoque',
      responsableEmail: 'ana@obra.test',
      estado: 'pendiente',
      fotos: [{ id: 'foto-1' }],
    })
  })
})
