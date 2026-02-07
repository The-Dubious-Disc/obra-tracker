import { NextRequest, NextResponse } from 'next/server';
import { addTask } from '@/lib/services/projectService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: etapaId } = await params;
    const body = await request.json();
    const { descripcion } = body;

    if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
      return NextResponse.json({ error: 'Descripción de tarea es obligatoria' }, { status: 400 });
    }

    const result = await addTask(etapaId, descripcion.trim());

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, taskId: result.taskId });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
