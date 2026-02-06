import { pgTable, uuid, text, decimal, timestamp, integer, boolean, pgEnum, date, doublePrecision } from "drizzle-orm/pg-core";

// 4. Tareas (Diario de obra) Enum
export const tareaEstadoEnum = pgEnum('tarea_estado', ['pendiente', 'en_progreso', 'completada']);

// 5. Pagos Enum
export const pagoEstadoEnum = pgEnum('pago_estado', ['pendiente', 'confirmado']);

// 1. Proyectos
export const proyectos = pgTable('proyectos', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  montoTotalActivo: decimal('monto_total_activo', { precision: 12, scale: 2 }).notNull().default('0'),
  moneda: text('moneda').notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2. Versiones de Presupuesto
export const presupuestoVersiones = pgTable('presupuesto_versiones', {
  id: uuid('id').primaryKey().defaultRandom(),
  proyectoId: uuid('proyecto_id').references(() => proyectos.id, { onDelete: 'cascade' }).notNull(),
  monto: decimal('monto', { precision: 12, scale: 2 }).notNull(),
  notasCambio: text('notas_cambio').notNull(),
  esActiva: boolean('es_activa').default(false),
  fechaCreacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow(),
});

// 3. Etapas (Fases del contrato)
export const etapas = pgTable('etapas', {
  id: uuid('id').primaryKey().defaultRandom(),
  proyectoId: uuid('proyecto_id').references(() => proyectos.id, { onDelete: 'cascade' }).notNull(),
  orden: integer('orden').notNull(),
  nombre: text('nombre').notNull(),
  porcentajePeso: decimal('porcentaje_peso', { precision: 5, scale: 2 }).notNull(),
  montoEtapa: decimal('monto_etapa', { precision: 12, scale: 2 }).notNull(),
  duracionEstimadaJornales: integer('duracion_estimada_jornales'),
  hitoVerificacion: text('hito_verificacion'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 4. Tareas
export const tareas = pgTable('tareas', {
  id: uuid('id').primaryKey().defaultRandom(),
  etapaId: uuid('etapa_id').references(() => etapas.id, { onDelete: 'cascade' }).notNull(),
  descripcion: text('descripcion').notNull(),
  estado: tareaEstadoEnum('estado').default('pendiente'),
  fechaFinalizacion: timestamp('fecha_finalizacion', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 5. Pagos
export const pagos = pgTable('pagos', {
  id: uuid('id').primaryKey().defaultRandom(),
  etapaId: uuid('etapa_id').references(() => etapas.id, { onDelete: 'set null' }),
  montoPagado: decimal('monto_pagado', { precision: 12, scale: 2 }).notNull(),
  fechaPago: date('fecha_pago').notNull().defaultNow(),
  comprobanteUrl: text('comprobante_url'),
  estado: pagoEstadoEnum('estado').default('pendiente'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 6. Anotaciones en Planos
export const anotacionesPlanos = pgTable('anotaciones_planos', {
  id: uuid('id').primaryKey().defaultRandom(),
  proyectoId: uuid('proyecto_id').references(() => proyectos.id, { onDelete: 'cascade' }).notNull(),
  planoUrl: text('plano_url').notNull(),
  coordX: doublePrecision('coord_x').notNull(),
  coordY: doublePrecision('coord_y').notNull(),
  comentario: text('comentario').notNull(),
  creadoPor: uuid('creado_por').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Types for Select and Insert
export type ProyectoSelect = typeof proyectos.$inferSelect;
export type ProyectoInsert = typeof proyectos.$inferInsert;
export type EtapaSelect = typeof etapas.$inferSelect;
export type TareaSelect = typeof tareas.$inferSelect;
export type PagoSelect = typeof pagos.$inferSelect;
export type PresupuestoVersionSelect = typeof presupuestoVersiones.$inferSelect;
