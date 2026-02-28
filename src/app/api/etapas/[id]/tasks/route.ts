import { NextRequest, NextResponse } from 'next/server';
import { addTask, getStageTasks } from '@/lib/services/projectService';
import { db } from '@/lib/db';
import { etapas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { checkProjectAccess, checkProjectRole } from '@/lib/services/authService';

async function getEtapaProjectId(etapaId: string): Promise<string | null> {
  const etapa = await db.query.etapas.findFirst({ where: eq(etapas.id, etapaId) });
  return etapa?.proyectoId ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const projectId = await getEtapaProjectId(id);
    if (!projectId) {
      return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 404 });
    }

    const hasAccess = await checkProjectAccess(userId, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const tasks = await getStageTasks(id);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: etapaId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const projectId = await getEtapaProjectId(etapaId);
    if (!projectId) {
      return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 404 });
    }

    const hasRole = await checkProjectRole(userId, projectId, ['admin', 'editor']);
    if (!hasRole) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

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
