// Project Service - Business logic for project financials and stages
import { createClient } from '@/lib/supabase/client'
import type { 
  Proyecto, 
  PresupuestoVersion,
  EtapaConProgreso,
  ProjectSummary 
} from '@/types/database.types'

/**
 * Get a comprehensive project summary including:
 * - Project details
 * - Stages with progress
 * - Total paid amount
 * - Weighted progress percentage
 */
export async function getProjectSummary(projectId: string): Promise<ProjectSummary | null> {
  const supabase = createClient()

  // 1. Fetch project
  const { data: proyecto, error: proyectoError } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', projectId)
    .single()

  if (proyectoError || !proyecto) {
    console.error('Error fetching project:', proyectoError)
    return null
  }

  // 2. Fetch stages with their tasks and payments
  const { data: etapas, error: etapasError } = await supabase
    .from('etapas')
    .select('*')
    .eq('proyecto_id', projectId)
    .order('orden', { ascending: true })

  if (etapasError) {
    console.error('Error fetching stages:', etapasError)
    return null
  }

  // 3. Fetch all tasks for this project's stages
  const etapaIds = etapas?.map(e => e.id) || []
  
  const { data: tareas } = etapaIds.length > 0
    ? await supabase
        .from('tareas')
        .select('*')
        .in('etapa_id', etapaIds)
    : { data: [] }

  // 4. Fetch all payments for this project's stages
  const { data: pagos } = etapaIds.length > 0
    ? await supabase
        .from('pagos')
        .select('*')
        .in('etapa_id', etapaIds)
        .eq('estado', 'confirmado')
    : { data: [] }

  // 5. Fetch active budget version
  const { data: presupuestoActivo } = await supabase
    .from('presupuesto_versiones')
    .select('*')
    .eq('proyecto_id', projectId)
    .eq('es_activa', true)
    .single()

  // 6. Calculate stage progress
  const etapasConProgreso: EtapaConProgreso[] = (etapas || []).map(etapa => {
    const tareasEtapa = tareas?.filter(t => t.etapa_id === etapa.id) || []
    const tareasCompletadas = tareasEtapa.filter(t => t.estado === 'completada').length
    const tareasTotal = tareasEtapa.length
    const pagosEtapa = pagos?.filter(p => p.etapa_id === etapa.id) || []
    const pagosTotales = pagosEtapa.reduce((sum, p) => sum + Number(p.monto_pagado), 0)

    return {
      ...etapa,
      tareasTotal,
      tareasCompletadas,
      porcentajeCompletado: tareasTotal > 0 
        ? Math.round((tareasCompletadas / tareasTotal) * 100) 
        : 0,
      pagosTotales,
    }
  })

  // 7. Calculate total paid
  const totalPagado = (pagos || []).reduce((sum, p) => sum + Number(p.monto_pagado), 0)

  // 8. Calculate weighted progress (based on stage weights)
  const porcentajeAvance = calculateWeightedProgress(etapasConProgreso)

  return {
    proyecto,
    etapas: etapasConProgreso,
    totalPagado,
    porcentajeAvance,
    presupuestoActivo: presupuestoActivo || null,
  }
}

/**
 * Calculate weighted progress based on stage completion and their weights
 */
function calculateWeightedProgress(etapas: EtapaConProgreso[]): number {
  if (etapas.length === 0) return 0

  const totalWeight = etapas.reduce((sum, e) => sum + Number(e.porcentaje_peso), 0)
  if (totalWeight === 0) return 0

  const weightedSum = etapas.reduce((sum, e) => {
    const stageContribution = (e.porcentajeCompletado / 100) * Number(e.porcentaje_peso)
    return sum + stageContribution
  }, 0)

  return Math.round((weightedSum / totalWeight) * 100)
}

/**
 * Update project budget with versioning
 * Creates a new budget version and updates the active amount
 */
export async function updateBudget(
  projectId: string,
  newAmount: number,
  note: string
): Promise<{ success: boolean; error?: string; version?: PresupuestoVersion }> {
  const supabase = createClient()

  try {
    // 1. Deactivate all current active versions for this project
    const { error: deactivateError } = await supabase
      .from('presupuesto_versiones')
      .update({ es_activa: false })
      .eq('proyecto_id', projectId)
      .eq('es_activa', true)

    if (deactivateError) {
      throw new Error(`Failed to deactivate old versions: ${deactivateError.message}`)
    }

    // 2. Insert new budget version
    const { data: newVersion, error: insertError } = await supabase
      .from('presupuesto_versiones')
      .insert({
        proyecto_id: projectId,
        monto: newAmount,
        notas_cambio: note,
        es_activa: true,
      })
      .select()
      .single()

    if (insertError || !newVersion) {
      throw new Error(`Failed to create budget version: ${insertError?.message}`)
    }

    // 3. Update project's active amount
    const { error: updateError } = await supabase
      .from('proyectos')
      .update({ 
        monto_total_activo: newAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (updateError) {
      // Rollback: deactivate the version we just created
      await supabase
        .from('presupuesto_versiones')
        .update({ es_activa: false })
        .eq('id', newVersion.id)
      
      throw new Error(`Failed to update project amount: ${updateError.message}`)
    }

    return { success: true, version: newVersion }
  } catch (error) {
    console.error('Budget update failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Get all projects (for listing)
 */
export async function getAllProjects(): Promise<Proyecto[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('proyectos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }

  return data || []
}

/**
 * Get budget history for a project
 */
export async function getBudgetHistory(projectId: string): Promise<PresupuestoVersion[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('presupuesto_versiones')
    .select('*')
    .eq('proyecto_id', projectId)
    .order('fecha_creacion', { ascending: false })

  if (error) {
    console.error('Error fetching budget history:', error)
    return []
  }

  return data || []
}
