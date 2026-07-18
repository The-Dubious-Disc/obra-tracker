import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tareas, etapas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { checkProjectRole } from '@/lib/services/authService';

async function getTaskProjectId(taskId: string): Promise<string | null> {
  const task = await db.query.tareas.findFirst({ where: eq(tareas.id, taskId) });
  if (!task) return null;
  const etapa = await db.query.etapas.findFirst({ where: eq(etapas.id, task.etapaId) });
  return etapa?.proyectoId ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const projectId = await getTaskProjectId(id);
    if (!projectId) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    const hasRole = await checkProjectRole(userId, projectId, ['admin', 'editor']);
    if (!hasRole) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { estado, descripcion } = body;

    const updateData: {
      estado?: 'pendiente' | 'en_progreso' | 'completada';
      descripcion?: string;
    } = {};
    if (estado) {
      if (!['pendiente', 'en_progreso', 'completada'].includes(estado)) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }
      updateData.estado = estado;
    }
    if (descripcion) {
      updateData.descripcion = descripcion;
    }

    await db.update(tareas)
      .set(updateData)
      .where(eq(tareas.id, id));

    return NextResponse.json({ message: 'Tarea actualizada' });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const projectId = await getTaskProjectId(id);
    if (!projectId) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    const hasRole = await checkProjectRole(userId, projectId, ['admin', 'editor']);
    if (!hasRole) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await db.delete(tareas).where(eq(tareas.id, id));
    return NextResponse.json({ message: 'Tarea eliminada' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
