import { pgTable, uuid, text, decimal, timestamp, integer, boolean, pgEnum, date, doublePrecision } from "drizzle-orm/pg-core";

// Enums
export const tareaEstadoEnum = pgEnum('tarea_estado', ['pendiente', 'en_progreso', 'completada']);
export const pagoEstadoEnum = pgEnum('pago_estado', ['pendiente', 'confirmado']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'constructor', 'cliente']);

// 1. Usuarios (Nuevo)
export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  nombre: text('nombre').notNull(),
  rol: userRoleEnum('rol').default('cliente'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2. Proyectos (Mejorado)
export const proyectos = pgTable('proyectos', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  sistemaConstructivo: text('sistema_constructivo'),
  presupuestoTotalUsd: decimal('presupuesto_total_usd', { precision: 12, scale: 2 }).notNull().default('0'),
  montoTotalActivo: decimal('monto_total_activo', { precision: 12, scale: 2 }).notNull().default('0'),
  moneda: text('moneda').notNull().default('USD'),
  clienteId: uuid('cliente_id').references(() => usuarios.id),
  constructorId: uuid('constructor_id').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 3. Versiones de Presupuesto
export const presupuestoVersiones = pgTable('presupuesto_versiones', {
  id: uuid('id').primaryKey().defaultRandom(),
  proyectoId: uuid('proyecto_id').references(() => proyectos.id, { onDelete: 'cascade' }).notNull(),
  monto: decimal('monto', { precision: 12, scale: 2 }).notNull(),
  notasCambio: text('notas_cambio').notNull(),
  esActiva: boolean('es_activa').default(false),
  fechaCreacion: timestamp('fecha_creacion', { withTimezone: true }).defaultNow(),
});

// 4. Etapas (Fases del contrato)
export const etapas = pgTable('etapas', {
  id: uuid('id').primaryKey().defaultRandom(),
  proyectoId: uuid('proyecto_id').references(() => proyectos.id, { onDelete: 'cascade' }).notNull(),
  orden: integer('orden').notNull(),
  nombre: text('nombre').notNull(),
  porcentajeTotal: decimal('porcentaje_total', { precision: 5, scale: 2 }).notNull(),
  montoUsd: decimal('monto_usd', { precision: 12, scale: 2 }).notNull(),
  duracionEstimadaJornales: integer('duracion_estimada_jornales'),
  hitoVerificacion: text('hito_verificacion'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 5. Tareas
export const tareas = pgTable('tareas', {
  id: uuid('id').primaryKey().defaultRandom(),
  etapaId: uuid('etapa_id').references(() => etapas.id, { onDelete: 'cascade' }).notNull(),
  descripcion: text('descripcion').notNull(),
  estado: tareaEstadoEnum('estado').default('pendiente'),
  fechaFinalizacion: timestamp('fecha_finalizacion', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 6. Pagos (Mejorado)
export const pagos = pgTable('pagos', {
  id: uuid('id').primaryKey().defaultRandom(),
  proyectoId: uuid('proyecto_id').references(() => proyectos.id, { onDelete: 'cascade' }).notNull(),
  etapaId: uuid('etapa_id').references(() => etapas.id, { onDelete: 'set null' }),
  montoPagado: decimal('monto_pagado', { precision: 12, scale: 2 }).notNull(),
  moneda: text('moneda').notNull().default('USD'),
  fechaPago: date('fecha_pago').notNull().defaultNow(),
  comentario: text('comentario'),
  comprobanteUrl: text('comprobante_url'),
  registradoPor: uuid('registrado_por').references(() => usuarios.id),
  estado: pagoEstadoEnum('estado').default('pendiente'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 7. Planos
export const planos = pgTable('planos', {
  id: uuid('id').primaryKey().defaultRandom(),
  proyectoId: uuid('proyecto_id').references(() => proyectos.id, { onDelete: 'cascade' }).notNull(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  url: text('url').notNull(),
  tipo: text('tipo').notNull(), // 'estructura', 'instalaciones', 'terminaciones', etc.
  orden: integer('orden').default(0),
  uploadedBy: uuid('uploaded_by').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 8. Anotaciones en Planos
export const anotacionesPlanos = pgTable('anotaciones_planos', {
  id: uuid('id').primaryKey().defaultRandom(),
  planoId: uuid('plano_id').references(() => planos.id, { onDelete: 'cascade' }).notNull(),
  coordX: doublePrecision('coord_x').notNull(),
  coordY: doublePrecision('coord_y').notNull(),
  comentario: text('comentario').notNull(),
  creadoPor: uuid('creado_por').references(() => usuarios.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Types for Select and Insert
export type UsuarioSelect = typeof usuarios.$inferSelect;
export type ProyectoSelect = typeof proyectos.$inferSelect;
export type EtapaSelect = typeof etapas.$inferSelect;
export type TareaSelect = typeof tareas.$inferSelect;
export type PagoSelect = typeof pagos.$inferSelect;
export type PlanoSelect = typeof planos.$inferSelect;
export type PresupuestoVersionSelect = typeof presupuestoVersiones.$inferSelect;