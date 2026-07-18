// Database types inferred from schema
// Update when schema changes

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TareaEstado = 'pendiente' | 'en_progreso' | 'completada'
export type PendienteEstado = 'pendiente' | 'completado'
export type PagoEstado = 'pendiente' | 'confirmado'
export type UserRole = 'admin' | 'editor' | 'viewer'
export type AnotacionEstado = 'abierta' | 'resuelta'

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          email: string
          nombre: string
          rol: UserRole
          createdAt: string
        }
        Insert: {
          id?: string
          email: string
          nombre: string
          rol?: UserRole
          createdAt?: string
        }
        Update: {
          id?: string
          email?: string
          nombre?: string
          rol?: UserRole
          createdAt?: string
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          sistemaConstructivo: string | null
          presupuestoTotalUsd: number
          montoTotalActivo: number
          moneda: string
          clienteId: string | null
          constructorId: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          sistemaConstructivo?: string | null
          presupuestoTotalUsd?: number
          montoTotalActivo?: number
          moneda?: string
          clienteId?: string | null
          constructorId?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          sistemaConstructivo?: string | null
          presupuestoTotalUsd?: number
          montoTotalActivo?: number
          moneda?: string
          clienteId?: string | null
          constructorId?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      presupuesto_versiones: {
        Row: {
          id: string
          proyectoId: string
          monto: number
          notasCambio: string
          esActiva: boolean
          fechaCreacion: string
        }
        Insert: {
          id?: string
          proyectoId: string
          monto: number
          notasCambio: string
          esActiva?: boolean
          fechaCreacion?: string
        }
        Update: {
          id?: string
          proyectoId?: string
          monto?: number
          notasCambio?: string
          esActiva?: boolean
          fechaCreacion?: string
        }
        Relationships: []
      }
      etapas: {
        Row: {
          id: string
          proyectoId: string
          orden: number
          nombre: string
          porcentajeTotal: number
          porcentajePeso: number
          montoUsd: number
          montoEtapa: number
          duracionEstimadaJornales: number | null
          hitoVerificacion: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          proyectoId: string
          orden: number
          nombre: string
          porcentajeTotal: number
          porcentajePeso: number
          montoUsd: number
          montoEtapa: number
          duracionEstimadaJornales?: number | null
          hitoVerificacion?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          proyectoId?: string
          orden?: number
          nombre?: string
          porcentajeTotal?: number
          porcentajePeso?: number
          montoUsd?: number
          montoEtapa?: number
          duracionEstimadaJornales?: number | null
          hitoVerificacion?: string | null
          createdAt?: string
        }
        Relationships: []
      }
      tareas: {
        Row: {
          id: string
          etapaId: string
          descripcion: string
          estado: TareaEstado
          fechaFinalizacion: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          etapaId: string
          descripcion: string
          estado?: TareaEstado
          fechaFinalizacion?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          etapaId?: string
          descripcion?: string
          estado?: TareaEstado
          fechaFinalizacion?: string | null
          createdAt?: string
        }
        Relationships: []
      }
      adicionales: {
        Row: {
          id: string
          proyectoId: string
          nombre: string
          monto: number
          completado: boolean
          createdAt: string
        }
        Insert: {
          id?: string
          proyectoId: string
          nombre: string
          monto: number
          completado?: boolean
          createdAt?: string
        }
        Update: {
          id?: string
          proyectoId?: string
          nombre?: string
          monto?: number
          completado?: boolean
          createdAt?: string
        }
        Relationships: []
      }
      pendientes: {
        Row: {
          id: string
          proyectoId: string
          titulo: string
          descripcion: string | null
          fechaVencimiento: string
          estado: PendienteEstado
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          proyectoId: string
          titulo: string
          descripcion?: string | null
          fechaVencimiento: string
          estado?: PendienteEstado
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          proyectoId?: string
          titulo?: string
          descripcion?: string | null
          fechaVencimiento?: string
          estado?: PendienteEstado
          createdAt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      pagos: {
        Row: {
          id: string
          proyectoId: string
          etapaId: string | null
          adicionalId: string | null
          montoPagado: number
          moneda: string
          fechaPago: string
          comentario: string | null
          comprobanteUrl: string | null
          registradoPor: string | null
          estado: PagoEstado
          createdAt: string
        }
        Insert: {
          id?: string
          proyectoId: string
          etapaId?: string | null
          adicionalId?: string | null
          montoPagado: number
          moneda?: string
          fechaPago?: string
          comentario?: string | null
          comprobanteUrl?: string | null
          registradoPor?: string | null
          estado?: PagoEstado
          createdAt?: string
        }
        Update: {
          id?: string
          proyectoId?: string
          etapaId?: string | null
          adicionalId?: string | null
          montoPagado?: number
          moneda?: string
          fechaPago?: string
          comentario?: string | null
          comprobanteUrl?: string | null
          registradoPor?: string | null
          estado?: PagoEstado
          createdAt?: string
        }
        Relationships: []
      }
      planos: {
        Row: {
          id: string
          proyectoId: string
          nombre: string
          descripcion: string | null
          url: string
          tipo: string
          orden: number
          uploadedBy: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          proyectoId: string
          nombre: string
          descripcion?: string | null
          url: string
          tipo: string
          orden?: number
          uploadedBy?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          proyectoId?: string
          nombre?: string
          descripcion?: string | null
          url?: string
          tipo?: string
          orden?: number
          uploadedBy?: string | null
          createdAt?: string
        }
        Relationships: []
      }
      anotaciones_planos: {
        Row: {
          id: string
          planoId: string
          coordX: number
          coordY: number
          comentario: string
          estado: AnotacionEstado | null
          creadoPor: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          planoId: string
          coordX: number
          coordY: number
          comentario: string
          estado?: AnotacionEstado | null
          creadoPor: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          planoId?: string
          coordX?: number
          coordY?: number
          comentario?: string
          estado?: AnotacionEstado | null
          creadoPor?: string | null
          createdAt?: string
        }
        Relationships: []
      }
      comentarios_anotaciones: {
        Row: {
          id: string
          anotacionId: string
          usuarioId: string
          texto: string
          createdAt: string
        }
        Insert: {
          id?: string
          anotacionId: string
          usuarioId: string
          texto: string
          createdAt?: string
        }
        Update: {
          id?: string
          anotacionId?: string
          usuarioId?: string
          texto?: string
          createdAt?: string
        }
        Relationships: []
      }
      invitaciones: {
        Row: {
          id: string
          proyectoId: string
          email: string
          rol: UserRole
          token: string
          invitadoPor: string | null
          aceptada: boolean
          createdAt: string
          expiresAt: string
        }
        Insert: {
          id?: string
          proyectoId: string
          email: string
          rol: UserRole
          token: string
          invitadoPor?: string | null
          aceptada?: boolean
          createdAt?: string
          expiresAt: string
        }
        Update: {
          id?: string
          proyectoId?: string
          email?: string
          rol?: UserRole
          token?: string
          invitadoPor?: string | null
          aceptada?: boolean
          createdAt?: string
          expiresAt?: string
        }
        Relationships: []
      }
      proyecto_miembros: {
        Row: {
          id: string
          proyectoId: string
          usuarioId: string
          rol: UserRole
          createdAt: string
        }
        Insert: {
          id?: string
          proyectoId: string
          usuarioId: string
          rol: UserRole
          createdAt?: string
        }
        Update: {
          id?: string
          proyectoId?: string
          usuarioId?: string
          rol?: UserRole
          createdAt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tarea_estado: TareaEstado
      pago_estado: PagoEstado
      user_role: UserRole
      anotacion_estado: AnotacionEstado
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type Proyecto = Database['public']['Tables']['proyectos']['Row']
export type PresupuestoVersion = Database['public']['Tables']['presupuesto_versiones']['Row']
export type Etapa = Database['public']['Tables']['etapas']['Row']
export type Tarea = Database['public']['Tables']['tareas']['Row']
export type Pendiente = Database['public']['Tables']['pendientes']['Row']
export type Pago = Database['public']['Tables']['pagos']['Row']
export type Plano = Database['public']['Tables']['planos']['Row']
export type AnotacionPlano = Database['public']['Tables']['anotaciones_planos']['Row']
export type ComentarioAnotacion = Database['public']['Tables']['comentarios_anotaciones']['Row']
export type Invitacion = Database['public']['Tables']['invitaciones']['Row']
export type ProyectoMiembro = Database['public']['Tables']['proyecto_miembros']['Row']
export type Adicional = Database['public']['Tables']['adicionales']['Row']

// Report types (not in Database interface yet, using schema inference)
export interface Reporte {
  id: string
  proyectoId: string
  descripcion: string
  fecha: string
  createdAt: string
}

export interface ReporteImagen {
  id: string
  reporteId: string
  r2Key: string
  nombre: string
  orden: number
  createdAt: string
}

export interface ReporteConImagenes extends Reporte {
  imagenes: (ReporteImagen & { downloadUrl?: string })[]
  imageCount: number
}

// Extended types for business logic
export interface EtapaConProgreso extends Etapa {
  tareasTotal: number
  tareasCompletadas: number
  porcentajeCompletado: number
  pagosTotales: number
}

export interface ProjectSummary {
  proyecto: Proyecto
  etapas: EtapaConProgreso[]
  adicionales: Adicional[]
  totalPagado: number
  porcentajeAvance: number
  totalJornales: number
  jornalesCompletados: number
  presupuestoActivo: PresupuestoVersion | null
  presupuestoTotalCalculado: number
}
