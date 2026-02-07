import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';
import { getProjectPendientes, createPendiente } from '@/lib/services/projectService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const access = await checkProjectAccess(userId, projectId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const onlyPending = request.nextUrl.searchParams.get('estado') === 'pendiente';
    const pendientes = await getProjectPendientes(projectId, onlyPending);

    return NextResponse.json(pendientes);
  } catch (error) {
    console.error('Error fetching pendientes:', error);
    return NextResponse.json({ error: 'Error al obtener pendientes' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const access = await checkProjectAccess(userId, projectId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { titulo, descripcion, fechaVencimiento } = body;

    if (!titulo || !fechaVencimiento) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const result = await createPendiente({
      proyectoId: projectId,
      titulo: String(titulo).trim(),
      descripcion: descripcion ? String(descripcion).trim() : null,
      fechaVencimiento: String(fechaVencimiento),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ pendienteId: result.pendienteId });
  } catch (error) {
    console.error('Error creating pendiente:', error);
    return NextResponse.json({ error: 'Error al crear pendiente' }, { status: 500 });
  }
}
