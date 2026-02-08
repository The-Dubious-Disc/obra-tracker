import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tareas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    await db.delete(tareas).where(eq(tareas.id, id));
    return NextResponse.json({ message: 'Tarea eliminada' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
