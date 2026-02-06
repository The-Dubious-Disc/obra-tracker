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
    const { estado } = body;

    if (!estado || !['pendiente', 'en_progreso', 'completada'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    await db.update(tareas)
      .set({ estado })
      .where(eq(tareas.id, id));

    return NextResponse.json({ message: 'Tarea actualizada' });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
