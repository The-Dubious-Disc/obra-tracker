import { NextRequest, NextResponse } from 'next/server';
import { addEtapa } from '@/lib/services/projectService';
import { checkProjectRole } from '@/lib/services/authService';
import { headers } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;

    // Solo admin/editor pueden crear etapas
    const hasRole = await checkProjectRole(userId, projectId, ['admin', 'editor']);
    if (!hasRole) {
      return NextResponse.json(
        { error: 'No autorizado para crear etapas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nombre, porcentajeTotal, duracionEstimadaJornales, hitoVerificacion, tareas } = body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return NextResponse.json({ error: 'Nombre de etapa es requerido' }, { status: 400 });
    }

    if (typeof porcentajeTotal !== 'number' || porcentajeTotal <= 0) {
      return NextResponse.json({ error: 'Porcentaje de presupuesto debe ser mayor a 0' }, { status: 400 });
    }

    if (typeof duracionEstimadaJornales !== 'number' || duracionEstimadaJornales <= 0) {
      return NextResponse.json({ error: 'Jornales debe ser mayor a 0' }, { status: 400 });
    }

    if (!Array.isArray(tareas) || tareas.length === 0 || tareas.some((t: { descripcion: string }) => !t.descripcion || !t.descripcion.trim())) {
      return NextResponse.json({ error: 'Debe incluir al menos una tarea con descripción' }, { status: 400 });
    }

    const result = await addEtapa(projectId, {
      nombre: nombre.trim(),
      porcentajeTotal,
      duracionEstimadaJornales,
      hitoVerificacion,
      tareas
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, etapaId: result.etapaId });
  } catch (error) {
    console.error('Error creating stage:', error);
    return NextResponse.json({ error: 'Failed to create stage' }, { status: 500 });
  }
}