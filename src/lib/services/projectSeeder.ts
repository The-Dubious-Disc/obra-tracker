import { db } from "@/lib/db";
import { proyectos, etapas, tareas } from "@/lib/db/schema";

export interface ProjectData {
  proyecto: {
    nombre: string;
    descripcion?: string;
    sistema_constructivo?: string;
    presupuesto_total_usd: number;
    moneda: string;
  };
  etapas: Array<{
    orden: number;
    nombre: string;
    porcentaje_total: number;
    monto_usd: number;
    duracion_estimada_jornales: number;
    hito_verificacion: string;
    tareas: string[];
  }>;
}

/**
 * Seeds a project from the provided JSON structure.
 * @param data - The project and stages data.
 * @param clienteId - Optional ID of the client user.
 * @param constructorId - Optional ID of the constructor user.
 */
export async function seedProject(data: ProjectData, clienteId?: string, constructorId?: string) {
  // Transaction removed due to neon-http driver limitations
  // 1. Create Project
  const [project] = await db.insert(proyectos).values({
    nombre: data.proyecto.nombre,
    descripcion: data.proyecto.descripcion,
    sistemaConstructivo: data.proyecto.sistema_constructivo,
    presupuestoTotalUsd: data.proyecto.presupuesto_total_usd.toString(),
    moneda: data.proyecto.moneda,
    clienteId: clienteId,
    constructorId: constructorId,
  }).returning();

  console.log(`Created project: ${project.nombre} (${project.id})`);

  // 2. Create Etapas and Tareas
  for (const etapaData of data.etapas) {
    const [etapa] = await db.insert(etapas).values({
      proyectoId: project.id,
      orden: etapaData.orden,
      nombre: etapaData.nombre,
      porcentajeTotal: etapaData.porcentaje_total.toString(),
      porcentajePeso: etapaData.porcentaje_total.toString(),
      montoUsd: etapaData.monto_usd.toString(),
      montoEtapa: etapaData.monto_usd.toString(),
      duracionEstimadaJornales: etapaData.duracion_estimada_jornales,
      hitoVerificacion: etapaData.hito_verificacion,
    }).returning();

    console.log(`  Created etapa: ${etapa.nombre} (${etapa.id})`);

    if (etapaData.tareas && etapaData.tareas.length > 0) {
      await db.insert(tareas).values(
        etapaData.tareas.map((t) => ({
          etapaId: etapa.id,
          descripcion: t,
          estado: 'pendiente' as const,
        }))
      );
      console.log(`    Inserted ${etapaData.tareas.length} tareas`);
    }
  }

  return project;
}