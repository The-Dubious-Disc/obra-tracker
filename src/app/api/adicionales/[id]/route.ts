import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkProjectRole } from '@/lib/services/authService';
import { getAdicionalById, updateAdicionalCompletado, deleteAdicional } from '@/lib/services/projectService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adicionalId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const adicional = await getAdicionalById(adicionalId);
    if (!adicional) {
      return NextResponse.json({ error: 'Adicional no encontrado' }, { status: 404 });
    }

    // Solo admin y editor pueden modificar el estado de un adicional
    const hasPermission = await checkProjectRole(userId, adicional.proyectoId, ['admin', 'editor']);
    if (!hasPermission) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { completado } = body;

    if (completado === undefined) {
      return NextResponse.json({ error: 'Falta el campo completado' }, { status: 400 });
    }

    const result = await updateAdicionalCompletado(adicionalId, Boolean(completado));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating adicional:', error);
    return NextResponse.json({ error: 'Error al actualizar adicional' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adicionalId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const adicional = await getAdicionalById(adicionalId);
    if (!adicional) {
      return NextResponse.json({ error: 'Adicional no encontrado' }, { status: 404 });
    }

    // Solo admin y editor pueden borrar adicionales
    const hasPermission = await checkProjectRole(userId, adicional.proyectoId, ['admin', 'editor']);
    if (!hasPermission) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const result = await deleteAdicional(adicionalId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting adicional:', error);
    return NextResponse.json({ error: 'Error al eliminar adicional' }, { status: 500 });
  }
}
