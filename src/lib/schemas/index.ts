import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
  password: z.string().min(1, 'Contraseña es requerida'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(100, 'Nombre demasiado largo'),
  password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres'),
  rol: z.enum(['admin', 'editor', 'viewer']).optional().default('viewer'),
});

// Project schemas
export const createProjectSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre demasiado largo'),
  descripcion: z.string().optional(),
  sistemaConstructivo: z.string().optional(),
  presupuestoTotalUsd: z.number().positive('Presupuesto debe ser positivo'),
  moneda: z.string().default('USD'),
  clienteId: z.string().uuid().optional(),
  constructorId: z.string().uuid().optional(),
});

// Etapa schemas
export const createEtapaSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre demasiado largo'),
  porcentajeTotal: z.number().min(0).max(100, 'Porcentaje debe estar entre 0 y 100'),
  duracionEstimadaJornales: z.number().positive().optional(),
  hitoVerificacion: z.string().optional(),
  tareas: z.array(z.object({
    descripcion: z.string().min(1, 'Descripción es requerida'),
  })).min(1, 'Debe incluir al menos una tarea'),
});

// Tarea schemas
export const updateTareaSchema = z.object({
  estado: z.enum(['pendiente', 'en_progreso', 'completada']),
});

// Budget schemas
export const updateBudgetSchema = z.object({
  newAmount: z.number().min(0, 'Monto debe ser positivo'),
  note: z.string().optional(),
});

// Payment schemas
export const createPaymentSchema = z.object({
  etapaId: z.string().uuid().optional(),
  montoPagado: z.number().positive('Monto debe ser positivo'),
  moneda: z.string().default('USD'),
  fechaPago: z.string().refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida'),
  comentario: z.string().optional(),
  comprobanteUrl: z.string().url().optional(),
});

// Plano schemas
export const createPlanoSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(200, 'Nombre demasiado largo'),
  descripcion: z.string().optional(),
  url: z.string().url('URL inválida'),
  tipo: z.string().min(1, 'Tipo es requerido'),
  orden: z.number().int().min(0).optional().default(0),
});

// Annotation schemas
export const createAnnotationSchema = z.object({
  coordX: z.number(),
  coordY: z.number(),
  comentario: z.string().min(1, 'Comentario es requerido'),
});

export const updateAnnotationSchema = z.object({
  estado: z.enum(['abierta', 'resuelta']),
});

// Invitation schemas
export const createInvitationSchema = z.object({
  email: z.string().email('Email inválido'),
  rol: z.enum(['admin', 'editor', 'viewer']),
});

// Pendiente schemas
export const createPendienteSchema = z.object({
  titulo: z.string().min(1, 'Título es requerido').max(200, 'Título demasiado largo'),
  descripcion: z.string().optional(),
  fechaVencimiento: z.string().refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida'),
  estado: z.enum(['pendiente', 'completado']).optional().default('pendiente'),
});

// Comment schemas
export const createCommentSchema = z.object({
  texto: z.string().min(1, 'Texto es requerido'),
});

// File upload schemas
export const uploadSchema = z.object({
  file: z.any(), // File validation happens elsewhere
  projectId: z.string().uuid('Project ID inválido'),
  type: z.enum(['plano', 'payment']).optional(),
});