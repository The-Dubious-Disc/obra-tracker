// Project Service - Refactored for Neon + Drizzle
import { db } from '@/lib/db'
import { proyectos, etapas, tareas, pagos, presupuestoVersiones } from '@/lib/db/schema'
import { eq, inArray, and } from 'drizzle-orm'
import type { 
  Proyecto, 
  PresupuestoVersion,
  EtapaConProgreso,
  ProjectSummary 
} from '@/types/database.types'

/**
 * Get a comprehensive project summary
 */
export async function getProjectSummary(projectId: string): Promise<ProjectSummary | null> {
  try {
    // 1. Fetch project
    const proyectoData = await db.select().from(proyectos).where(eq(proyectos.id, projectId)).limit(1);
    const proyecto = proyectoData[0];

    if (!proyecto) return null;

    // 2. Fetch stages
    const etapasData = await db.select().from(etapas)
      .where(eq(etapas.proyectoId, projectId))
      .orderBy(etapas.orden);

    // 3. Fetch tasks and payments
    const etapaIds = etapasData.map(e => e.id);
    
    let tareasData = [];
    let pagosData = [];

    if (etapaIds.length > 0) {
      tareasData = await db.select().from(tareas).where(inArray(tareas.etapaId, etapaIds));
      pagosData = await db.select().from(pagos).where(
        and(
          inArray(pagos.etapaId, etapaIds),
          eq(pagos.estado, 'confirmado')
        )
      );
    }

    // 4. Fetch active budget
    const presupuestoData = await db.select().from(presupuestoVersiones)
      .where(
        and(
          eq(presupuestoVersiones.proyectoId, projectId),
          eq(presupuestoVersiones.esActiva, true)
        )
      ).limit(1);

    // 5. Calculate progress
    const etapasConProgreso: EtapaConProgreso[] = etapasData.map(etapa => {
      const tareasEtapa = tareasData.filter(t => t.etapaId === etapa.id);
      const tareasCompletadas = tareasEtapa.filter(t => t.estado === 'completada').length;
      const tareasTotal = tareasEtapa.length;
      const pagosEtapa = pagosData.filter(p => p.etapaId === etapa.id);
      const pagosTotales = pagosEtapa.reduce((sum, p) => sum + Number(p.montoPagado), 0);

      return {
        ...etapa,
        tareasTotal,
        tareasCompletadas,
        porcentajeCompletado: tareasTotal > 0 ? Math.round((tareasCompletadas / tareasTotal) * 100) : 0,
        pagosTotales,
      } as unknown as EtapaConProgreso; // Adapt to legacy type if needed
    });

    const totalPagado = pagosData.reduce((sum, p) => sum + Number(p.montoPagado), 0);
    const porcentajeAvance = calculateWeightedProgress(etapasConProgreso);

    return {
      proyecto: proyecto as unknown as Proyecto,
      etapas: etapasConProgreso,
      totalPagado,
      porcentajeAvance,
      presupuestoActivo: (presupuestoData[0] as unknown as PresupuestoVersion) || null,
    };
  } catch (error) {
    console.error('Error in getProjectSummary:', error);
    return null;
  }
}

function calculateWeightedProgress(etapas: EtapaConProgreso[]): number {
  if (etapas.length === 0) return 0;
  const totalWeight = etapas.reduce((sum, e) => sum + Number(e.porcentaje_peso || (e as any).porcentajePeso), 0);
  if (totalWeight === 0) return 0;
  const weightedSum = etapas.reduce((sum, e) => {
    const weight = Number(e.porcentaje_peso || (e as any).porcentajePeso);
    return sum + ((e.porcentajeCompletado / 100) * weight);
  }, 0);
  return Math.round((weightedSum / totalWeight) * 100);
}

export async function getAllProjects(): Promise<Proyecto[]> {
  const data = await db.select().from(proyectos).orderBy(proyectos.createdAt);
  return data as unknown as Proyecto[];
}

export async function getBudgetHistory(projectId: string): Promise<PresupuestoVersion[]> {
  try {
    const data = await db.select().from(presupuestoVersiones)
      .where(eq(presupuestoVersiones.proyectoId, projectId))
      .orderBy(presupuestoVersiones.fechaCreacion);
    return data as unknown as PresupuestoVersion[];
  } catch (error) {
    console.error('Error in getBudgetHistory:', error);
    return [];
  }
}

export async function updateBudget(projectId: string, newAmount: number, note: string) {
  // Logic simplified for migration example, should use db.transaction
  await db.update(presupuestoVersiones).set({ esActiva: false })
    .where(and(eq(presupuestoVersiones.proyectoId, projectId), eq(presupuestoVersiones.esActiva, true)));
  
  await db.insert(presupuestoVersiones).values({
    proyectoId: projectId,
    monto: newAmount.toString(),
    notasCambio: note,
    esActiva: true,
  });

  await db.update(proyectos).set({ montoTotalActivo: newAmount.toString(), updatedAt: new Date() })
    .where(eq(proyectos.id, projectId));

  return { success: true };
}
