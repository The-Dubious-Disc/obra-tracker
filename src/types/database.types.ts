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
export type UserRole = 'admin' | 'constructor' | 'cliente'

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          email: string
          nombre: string
          rol: UserRole
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          nombre: string
          rol?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          nombre?: string
          rol?: UserRole
          created_at?: string
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          sistema_constructivo: string | null
          presupuesto_total_usd: number
          monto_total_activo: number
          moneda: string
          cliente_id: string | null
          constructor_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          sistema_constructivo?: string | null
          presupuesto_total_usd?: number
          monto_total_activo?: number
          moneda?: string
          cliente_id?: string | null
          constructor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          sistema_constructivo?: string | null
          presupuesto_total_usd?: number
          monto_total_activo?: number
          moneda?: string
          cliente_id?: string | null
          constructor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
           {
            foreignKeyName: "proyectos_cliente_id_fkey"
            columns: ["cliente_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_constructor_id_fkey"
            columns: ["constructor_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
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
          porcentaje_total: number
          monto_usd: number
          duracion_estimada_jornales: number | null
          hito_verificacion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          orden: number
          nombre: string
          porcentaje_total: number
          monto_usd: number
          duracion_estimada_jornales?: number | null
          hito_verificacion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          orden?: number
          nombre?: string
          porcentaje_total?: number
          monto_usd?: number
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
          proyecto_id: string
          etapa_id: string | null
          monto_pagado: number
          moneda: string
          fecha_pago: string
          comentario: string | null
          comprobante_url: string | null
          registrado_por: string | null
          estado: PagoEstado
          created_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          etapa_id?: string | null
          monto_pagado: number
          moneda?: string
          fecha_pago?: string
          comentario?: string | null
          comprobante_url?: string | null
          registrado_por?: string | null
          estado?: PagoEstado
          created_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          etapa_id?: string | null
          monto_pagado?: number
          moneda?: string
          fecha_pago?: string
          comentario?: string | null
          comprobante_url?: string | null
          registrado_por?: string | null
          estado?: PagoEstado
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_etapa_id_fkey"
            columns: ["etapa_id"]
            referencedRelation: "etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_registrado_por_fkey"
            columns: ["registrado_por"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      planos: {
        Row: {
          id: string
          proyecto_id: string
          nombre: string
          descripcion: string | null
          url: string
          tipo: string
          orden: number
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proyecto_id: string
          nombre: string
          descripcion?: string | null
          url: string
          tipo: string
          orden?: number
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proyecto_id?: string
          nombre?: string
          descripcion?: string | null
          url?: string
          tipo?: string
          orden?: number
          uploaded_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      anotaciones_planos: {
        Row: {
          id: string
          plano_id: string
          coord_x: number
          coord_y: number
          comentario: string
          creado_por: string
          created_at: string
        }
        Insert: {
          id?: string
          plano_id: string
          coord_x: number
          coord_y: number
          comentario: string
          creado_por: string
          created_at?: string
        }
        Update: {
          id?: string
          plano_id?: string
          coord_x?: number
          coord_y?: number
          comentario?: string
          creado_por?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anotaciones_planos_plano_id_fkey"
            columns: ["plano_id"]
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
           {
            foreignKeyName: "anotaciones_planos_creado_por_fkey"
            columns: ["creado_por"]
            referencedRelation: "usuarios"
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
      user_role: UserRole
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
export type Pago = Database['public']['Tables']['pagos']['Row']
export type Plano = Database['public']['Tables']['planos']['Row']
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
