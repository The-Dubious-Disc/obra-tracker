import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';
import { updatePendiente, deletePendiente, getPendienteById } from '@/lib/services/projectService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pendienteId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const pendiente = await getPendienteById(pendienteId);
    if (!pendiente) {
      return NextResponse.json({ error: 'Pendiente no encontrado' }, { status: 404 });
    }

    const access = await checkProjectAccess(userId, pendiente.proyectoId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { titulo, descripcion, fechaVencimiento, estado } = body;

    const result = await updatePendiente(pendienteId, {
      titulo: titulo ? String(titulo).trim() : undefined,
      descripcion: descripcion !== undefined ? (descripcion ? String(descripcion).trim() : null) : undefined,
      fechaVencimiento: fechaVencimiento ? String(fechaVencimiento) : undefined,
      estado,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating pendiente:', error);
    return NextResponse.json({ error: 'Error al actualizar pendiente' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pendienteId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const pendiente = await getPendienteById(pendienteId);
    if (!pendiente) {
      return NextResponse.json({ error: 'Pendiente no encontrado' }, { status: 404 });
    }

    const access = await checkProjectAccess(userId, pendiente.proyectoId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const result = await deletePendiente(pendienteId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pendiente:', error);
    return NextResponse.json({ error: 'Error al eliminar pendiente' }, { status: 500 });
  }
}
