import { describe, expect, it } from 'vitest'
import {
  createEtapaSchema,
  createInvitationSchema,
  createPaymentSchema,
  createPendienteSchema,
  createPlanoSchema,
  createProjectSchema,
  loginSchema,
  registerSchema,
  updateBudgetSchema,
  updateTareaSchema,
} from '@/lib/schemas'

describe('auth schemas', () => {
  it('accepts a login and rejects a blank password', () => {
    expect(loginSchema.safeParse({ email: 'ada@example.com', password: 'secret' }).success).toBe(true)

    const invalid = loginSchema.safeParse({ email: 'not-an-email', password: '' })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining(['Email inválido', 'Contraseña es requerida']),
      )
    }
  })

  it('defaults registration to viewer and requires 8 character passwords', () => {
    const parsed = registerSchema.safeParse({
      email: 'ada@example.com',
      nombre: 'Ada',
      password: 'secret12',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.rol).toBe('viewer')

    expect(registerSchema.safeParse({
      email: 'ada@example.com',
      nombre: 'A',
      password: 'short',
      rol: 'cliente',
    }).success).toBe(false)

    const editor = registerSchema.safeParse({
      email: 'ada@example.com',
      nombre: 'Ada',
      password: 'secret12',
      rol: 'editor',
    })
    expect(editor.success).toBe(true)
    if (editor.success) expect(editor.data.rol).toBe('editor')
  })
})

describe('project and money schemas', () => {
  it('requires a positive project budget and defaults the currency to USD', () => {
    const parsed = createProjectSchema.safeParse({ nombre: 'Casa', presupuestoTotalUsd: 1000 })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.moneda).toBe('USD')

    expect(createProjectSchema.safeParse({ nombre: '', presupuestoTotalUsd: 0 }).success).toBe(false)
    expect(createProjectSchema.safeParse({ nombre: 'Casa', presupuestoTotalUsd: -5 }).success).toBe(false)
  })

  it('allows a zero budget revision in the schema', () => {
    expect(updateBudgetSchema.safeParse({ newAmount: 0 }).success).toBe(true)
    expect(updateBudgetSchema.safeParse({ newAmount: -1 }).success).toBe(false)
  })

  it('validates payments, stage percentages, and task states', () => {
    const payment = createPaymentSchema.safeParse({
      montoPagado: 10,
      fechaPago: '2026-01-15',
    })
    expect(payment.success).toBe(true)
    if (payment.success) expect(payment.data.moneda).toBe('USD')

    expect(createPaymentSchema.safeParse({
      montoPagado: 0,
      fechaPago: 'not-a-date',
    }).success).toBe(false)

    expect(createEtapaSchema.safeParse({
      nombre: 'Cimientos',
      porcentajeTotal: 100,
      tareas: [{ descripcion: 'Excavar' }],
    }).success).toBe(true)

    expect(createEtapaSchema.safeParse({
      nombre: 'Cimientos',
      porcentajeTotal: 101,
      tareas: [],
    }).success).toBe(false)

    expect(updateTareaSchema.safeParse({ estado: 'completada' }).success).toBe(true)
    expect(updateTareaSchema.safeParse({ estado: 'hecho' }).success).toBe(false)
  })
})

describe('invitation, pendiente, and plano schemas', () => {
  it('only allows project roles on invitations', () => {
    expect(createInvitationSchema.safeParse({ email: 'ada@example.com', rol: 'editor' }).success).toBe(true)
    expect(createInvitationSchema.safeParse({ email: 'ada@example.com', rol: 'cliente' }).success).toBe(false)
  })

  it('defaults a pendiente to pendiente and a plano order to 0', () => {
    const pendiente = createPendienteSchema.safeParse({
      titulo: 'Comprar cemento',
      fechaVencimiento: '2026-02-01',
    })
    expect(pendiente.success).toBe(true)
    if (pendiente.success) expect(pendiente.data.estado).toBe('pendiente')

    expect(createPendienteSchema.safeParse({
      titulo: '',
      fechaVencimiento: 'mañana',
    }).success).toBe(false)

    const plano = createPlanoSchema.safeParse({
      nombre: 'Planta',
      url: 'https://files.example/plano.pdf',
      tipo: 'estructura',
    })
    expect(plano.success).toBe(true)
    if (plano.success) expect(plano.data.orden).toBe(0)
    expect(createPlanoSchema.safeParse({
      nombre: 'Planta',
      url: 'not-a-url',
      tipo: '',
    }).success).toBe(false)
  })
})
