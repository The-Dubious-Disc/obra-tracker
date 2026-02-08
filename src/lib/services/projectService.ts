import { db } from '@/lib/db';
import { pagos, proyectos, etapas, tareas, planos, presupuestoVersiones, proyectoMiembros, pendientes } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

// Projects & Summary
export async function getProjectSummary(projectId: string, userId?: string) {
  try {
    if (userId) {
      const access = await db.query.proyectoMiembros.findFirst({
        where: and(eq(proyectoMiembros.usuarioId, userId), eq(proyectoMiembros.proyectoId, projectId)),
      });
      if (!access) return null;
    }

    // 1. Get Project
    const project = await db.query.proyectos.findFirst({
      where: eq(proyectos.id, projectId),
    });

    if (!project) return null;

    // 2. Get Etapas
    const stages = await db.select().from(etapas).where(eq(etapas.proyectoId, projectId)).orderBy(etapas.orden);

    // 3. Aggregate data per stage
    const etapasWithProgress = await Promise.all(stages.map(async (etapa) => {
      // Tasks stats
      const stageTasks = await db.select().from(tareas).where(eq(tareas.etapaId, etapa.id));
      const totalTasks = stageTasks.length;
      const completedTasks = stageTasks.filter(t => t.estado === 'completada').length;
      const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Payments stats
      const stagePayments = await db.select().from(pagos).where(eq(pagos.etapaId, etapa.id));
      const totalPaid = stagePayments.reduce((sum, p) => sum + Number(p.montoPagado), 0);

      return {
        ...etapa,
        tareasTotal: totalTasks,
        tareasCompletadas: completedTasks,
        porcentajeCompletado: percentage,
        pagosTotales: totalPaid,
      };
    }));

    // 4. Global stats
    const allPayments = await db.select().from(pagos).where(eq(pagos.proyectoId, projectId));
    const totalPagado = allPayments.reduce((sum, p) => sum + Number(p.montoPagado), 0);
    
    // Weighted progress based on jornales
    const totalJornales = etapasWithProgress.reduce((sum, e) => sum + (e.duracionEstimadaJornales || 0), 0);
    const weightedProgress = totalJornales > 0 
      ? etapasWithProgress.reduce((acc, curr) => {
          return acc + (curr.porcentajeCompletado * (curr.duracionEstimadaJornales || 0) / totalJornales);
        }, 0)
      : 0;

    const activeBudget = await db.query.presupuestoVersiones.findFirst({
      where: and(eq(presupuestoVersiones.proyectoId, projectId), eq(presupuestoVersiones.esActiva, true)),
    });

    return {
      proyecto: project,
      etapas: etapasWithProgress,
      totalPagado,
      porcentajeAvance: weightedProgress,
      presupuestoActivo: activeBudget || null,
    };

  } catch (error) {
    console.error('Error in getProjectSummary:', error);
    return null;
  }
}

export async function getStageTasks(etapaId: string) {
  try {
     return await db.select().from(tareas).where(eq(tareas.etapaId, etapaId)).orderBy(desc(tareas.createdAt));
  } catch (error) {
    console.error('Error in getStageTasks:', error);
    return [];
  }
}

// Payments
export async function createPayment(data: {
  proyectoId: string;
  etapaId: string | null;
  montoPagado: number;
  moneda: string;
  fechaPago: string;
  comentario?: string;
  comprobanteUrl?: string;
}) {
  try {
    const [newPayment] = await db.insert(pagos).values({
      proyectoId: data.proyectoId,
      etapaId: data.etapaId,
      montoPagado: data.montoPagado.toString(),
      moneda: data.moneda,
      fechaPago: data.fechaPago,
      comentario: data.comentario,
      comprobanteUrl: data.comprobanteUrl,
      estado: 'confirmado', 
    }).returning();

    return { success: true, paymentId: newPayment.id };
  } catch (error) {
    console.error('Error in createPayment:', error);
    return { success: false, error: 'Database error' };
  }
}

export async function getProjectPayments(proyectoId: string) {
  try {
    const payments = await db.select({
      id: pagos.id,
      montoPagado: pagos.montoPagado,
      moneda: pagos.moneda,
      fechaPago: pagos.fechaPago,
      comentario: pagos.comentario,
      etapaId: pagos.etapaId,
      etapaNombre: etapas.nombre,
      estado: pagos.estado,
      comprobanteUrl: pagos.comprobanteUrl
    })
    .from(pagos)
    .leftJoin(etapas, eq(pagos.etapaId, etapas.id))
    .where(eq(pagos.proyectoId, proyectoId))
    .orderBy(desc(pagos.fechaPago));

    return payments;
  } catch (error) {
    console.error('Error in getProjectPayments:', error);
    return [];
  }
}

// Pendientes
export async function getProjectPendientes(proyectoId: string, onlyPending = false) {
  try {
    const whereClause = onlyPending
      ? and(eq(pendientes.proyectoId, proyectoId), eq(pendientes.estado, 'pendiente'))
      : eq(pendientes.proyectoId, proyectoId);

    return await db.select()
      .from(pendientes)
      .where(whereClause)
      .orderBy(pendientes.fechaVencimiento);
  } catch (error) {
    console.error('Error in getProjectPendientes:', error);
    return [];
  }
}

export async function createPendiente(data: {
  proyectoId: string;
  titulo: string;
  descripcion?: string | null;
  fechaVencimiento: string;
}) {
  try {
    const [newPendiente] = await db.insert(pendientes).values({
      proyectoId: data.proyectoId,
      titulo: data.titulo,
      descripcion: data.descripcion || null,
      fechaVencimiento: data.fechaVencimiento,
    }).returning();

    return { success: true, pendienteId: newPendiente.id };
  } catch (error) {
    console.error('Error in createPendiente:', error);
    return { success: false, error: 'Database error' };
  }
}

export async function updatePendiente(pendienteId: string, data: {
  titulo?: string;
  descripcion?: string | null;
  fechaVencimiento?: string;
  estado?: 'pendiente' | 'completado';
}) {
  try {
    await db.update(pendientes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(pendientes.id, pendienteId));

    return { success: true };
  } catch (error) {
    console.error('Error in updatePendiente:', error);
    return { success: false, error: 'Database error' };
  }
}

export async function deletePendiente(pendienteId: string) {
  try {
    await db.delete(pendientes)
      .where(eq(pendientes.id, pendienteId));

    return { success: true };
  } catch (error) {
    console.error('Error in deletePendiente:', error);
    return { success: false, error: 'Database error' };
  }
}

export async function getPendienteById(pendienteId: string) {
  try {
    return await db.query.pendientes.findFirst({
      where: eq(pendientes.id, pendienteId),
    });
  } catch (error) {
    console.error('Error in getPendienteById:', error);
    return null;
  }
}

// Planos
export async function createPlano(data: {
  proyectoId: string;
  nombre: string;
  descripcion?: string;
  url: string;
  tipo: string;
  orden?: number;
}) {
  try {
    const [newPlano] = await db.insert(planos).values({
      proyectoId: data.proyectoId,
      nombre: data.nombre,
      descripcion: data.descripcion,
      url: data.url,
      tipo: data.tipo,
      orden: data.orden || 0,
    }).returning();

    return { success: true, planoId: newPlano.id };
  } catch (error) {
    console.error('Error in createPlano:', error);
    return { success: false, error: 'Database error' };
  }
}

export async function getProjectPlanos(proyectoId: string) {
  try {
    const result = await db.select()
      .from(planos)
      .where(eq(planos.proyectoId, proyectoId))
      .orderBy(planos.orden, desc(planos.createdAt));

    return result;
  } catch (error) {
    console.error('Error in getProjectPlanos:', error);
    return [];
  }
}

// Missing functions restoration

export async function getAllProjects(userId?: string) {
  try {
    if (userId) {
      const userProjects = await db.select({
        id: proyectos.id,
        nombre: proyectos.nombre,
        descripcion: proyectos.descripcion,
        createdAt: proyectos.createdAt,
        updatedAt: proyectos.updatedAt,
      })
      .from(proyectos)
      .innerJoin(proyectoMiembros, eq(proyectos.id, proyectoMiembros.proyectoId))
      .where(eq(proyectoMiembros.usuarioId, userId))
      .orderBy(desc(proyectos.createdAt));
      
      return userProjects;
    }
    return await db.select().from(proyectos).orderBy(desc(proyectos.createdAt));
  } catch (error) {
    console.error('Error in getAllProjects:', error);
    return [];
  }
}

export async function createProject(
  nombre: string, 
  moneda: string = 'UYU',
  presupuestoTotal: number = 0,
  etapasPayload: Array<{ 
    nombre: string;
    porcentajeTotal: number;
    duracionEstimadaJornales: number;
    hitoVerificacion?: string | null;
    tareas: Array<{ descripcion: string }>;
  }> = [],
  ownerId?: string
) {
  try {
    const [newProject] = await db.insert(proyectos).values({
      nombre,
      moneda,
      presupuestoTotalUsd: presupuestoTotal.toString(),
      montoTotalActivo: presupuestoTotal.toString(),
    }).returning();

    if (ownerId) {
      await db.insert(proyectoMiembros).values({
        proyectoId: newProject.id,
        usuarioId: ownerId,
        rol: 'admin',
      });
    }

    await db.insert(presupuestoVersiones).values({
      proyectoId: newProject.id,
      monto: presupuestoTotal.toString(),
      notasCambio: 'Presupuesto inicial',
      esActiva: true,
    });

    for (let index = 0; index < etapasPayload.length; index++) {
      const etapa = etapasPayload[index];
      const montoEtapa = (presupuestoTotal * (etapa.porcentajeTotal / 100)).toFixed(2);

      const [newStage] = await db.insert(etapas).values({
        proyectoId: newProject.id,
        orden: index + 1,
        nombre: etapa.nombre,
        porcentajeTotal: etapa.porcentajeTotal.toString(),
        porcentajePeso: etapa.porcentajeTotal.toString(),
        montoUsd: montoEtapa,
        montoEtapa: montoEtapa,
        duracionEstimadaJornales: etapa.duracionEstimadaJornales,
        hitoVerificacion: etapa.hitoVerificacion || null,
      }).returning();

      const tareasValues = etapa.tareas.map((t) => ({
        etapaId: newStage.id,
        descripcion: t.descripcion,
      }));

      if (tareasValues.length > 0) {
        await db.insert(tareas).values(tareasValues);
      }
    }

    return { success: true, projectId: newProject.id };
  } catch (error) {
    console.error('Error in createProject:', error);
    return { success: false, error: 'Database error' };
  }
}

export async function getBudgetHistory(projectId: string) {
  try {
    return await db.select()
      .from(presupuestoVersiones)
      .where(eq(presupuestoVersiones.proyectoId, projectId))
      .orderBy(desc(presupuestoVersiones.fechaCreacion));
  } catch (error) {
    console.error('Error in getBudgetHistory:', error);
    return [];
  }
}

export async function updateBudget(
  projectId: string, 
  newAmount: number, 
  note: string
) {
  try {
    // Deactivate current active budget
    await db.update(presupuestoVersiones)
      .set({ esActiva: false })
      .where(and(eq(presupuestoVersiones.proyectoId, projectId), eq(presupuestoVersiones.esActiva, true)));
    
    // Create new version
    await db.insert(presupuestoVersiones).values({
      proyectoId: projectId,
      monto: newAmount.toString(),
      notasCambio: note,
      esActiva: true,
    });

    // Update project total
    await db.update(proyectos)
      .set({ montoTotalActivo: newAmount.toString(), updatedAt: new Date() })
      .where(eq(proyectos.id, projectId));

    return { success: true };
  } catch (error) {
    console.error('Error in updateBudget:', error);
    return { success: false, error: 'Database error' };
  }
}

export async function addEtapa(
  projectId: string,
  etapaPayload: {
    nombre: string;
    porcentajeTotal: number;
    duracionEstimadaJornales: number;
    hitoVerificacion?: string | null;
    tareas: Array<{ descripcion: string }>;
  }
) {
  try {
    const project = await db.query.proyectos.findFirst({
      where: eq(proyectos.id, projectId),
    });

    if (!project) return { success: false, error: 'Project not found' };

    const existingStages = await db.select().from(etapas).where(eq(etapas.proyectoId, projectId));
    const nextOrder = existingStages.length + 1;

    const montoTotal = Number(project.montoTotalActivo);
    const montoEtapa = (montoTotal * (etapaPayload.porcentajeTotal / 100)).toFixed(2);

    const [newStage] = await db.insert(etapas).values({
      proyectoId: projectId,
      orden: nextOrder,
      nombre: etapaPayload.nombre,
      porcentajeTotal: etapaPayload.porcentajeTotal.toString(),
      porcentajePeso: etapaPayload.porcentajeTotal.toString(),
      montoUsd: montoEtapa,
      montoEtapa: montoEtapa,
      duracionEstimadaJornales: etapaPayload.duracionEstimadaJornales,
      hitoVerificacion: etapaPayload.hitoVerificacion || null,
    }).returning();

    const tareasValues = etapaPayload.tareas.map((t) => ({
      etapaId: newStage.id,
      descripcion: t.descripcion,
    }));

    if (tareasValues.length > 0) {
      await db.insert(tareas).values(tareasValues);
    }

    return { success: true, etapaId: newStage.id };
  } catch (error) {
    console.error('Error in addEtapa:', error);
    return { success: false, error: 'Database error' };
  }
}

export async function addTask(etapaId: string, descripcion: string) {
  try {
    const [newTask] = await db.insert(tareas).values({
      etapaId,
      descripcion,
    }).returning();

    return { success: true, taskId: newTask.id };
  } catch (error) {
    console.error('Error in addTask:', error);
    return { success: false, error: 'Database error' };
  }
}
