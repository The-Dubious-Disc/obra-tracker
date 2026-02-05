// Database types inferred from schema.sql
// Run `npx supabase gen types typescript` for auto-generation if needed

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TareaEstado = 'pendiente' | 'en_progreso' | 'completada'
export type PagoEstado = 'pendiente' | 'confirmado'

export interface Database {
  public: {
    Tables: {
      proyectos: {
        Row: {
          id: string
          nombre: string
          monto_total_activo: number
          moneda: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          monto_total_activo?: number
          moneda?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          monto_total_activo?: number
          moneda?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      presupuesto_versiones: {
        Row: {
          id: string
          proyecto_id: string
          monto: number
          notas_cambio: string
          es_activa: boolean
          fecha_creacion: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          monto: number
          notas_cambio: string
          es_activa?: boolean
          fecha_creacion?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          monto?: number
          notas_cambio?: string
          es_activa?: boolean
          fecha_creacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_versiones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          }
        ]
      }
      etapas: {
        Row: {
          id: string
          proyecto_id: string
          orden: number
          nombre: string
          porcentaje_peso: number
          monto_etapa: number
          duracion_estimada_jornales: number | null
          hito_verificacion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          orden: number
          nombre: string
          porcentaje_peso: number
          monto_etapa: number
          duracion_estimada_jornales?: number | null
          hito_verificacion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          orden?: number
          nombre?: string
          porcentaje_peso?: number
          monto_etapa?: number
          duracion_estimada_jornales?: number | null
          hito_verificacion?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          }
        ]
      }
      tareas: {
        Row: {
          id: string
          etapa_id: string
          descripcion: string
          estado: TareaEstado
          fecha_finalizacion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          etapa_id: string
          descripcion: string
          estado?: TareaEstado
          fecha_finalizacion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          etapa_id?: string
          descripcion?: string
          estado?: TareaEstado
          fecha_finalizacion?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_etapa_id_fkey"
            columns: ["etapa_id"]
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          }
        ]
      }
      pagos: {
        Row: {
          id: string
          etapa_id: string | null
          monto_pagado: number
          fecha_pago: string
          comprobante_url: string | null
          estado: PagoEstado
          created_at: string
        }
        Insert: {
          id?: string
          etapa_id?: string | null
          monto_pagado: number
          fecha_pago?: string
          comprobante_url?: string | null
          estado?: PagoEstado
          created_at?: string
        }
        Update: {
          id?: string
          etapa_id?: string | null
          monto_pagado?: number
          fecha_pago?: string
          comprobante_url?: string | null
          estado?: PagoEstado
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_etapa_id_fkey"
            columns: ["etapa_id"]
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          }
        ]
      }
      anotaciones_planos: {
        Row: {
          id: string
          proyecto_id: string
          plano_url: string
          coord_x: number
          coord_y: number
          comentario: string
          creado_por: string
          created_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          plano_url: string
          coord_x: number
          coord_y: number
          comentario: string
          creado_por: string
          created_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          plano_url?: string
          coord_x?: number
          coord_y?: number
          comentario?: string
          creado_por?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotaciones_planos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          }
        ]
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
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Proyecto = Database['public']['Tables']['proyectos']['Row']
export type PresupuestoVersion = Database['public']['Tables']['presupuesto_versiones']['Row']
export type Etapa = Database['public']['Tables']['etapas']['Row']
export type Tarea = Database['public']['Tables']['tareas']['Row']
export type Pago = Database['public']['Tables']['pagos']['Row']
export type AnotacionPlano = Database['public']['Tables']['anotaciones_planos']['Row']

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
  totalPagado: number
  porcentajeAvance: number
  presupuestoActivo: PresupuestoVersion | null
}
