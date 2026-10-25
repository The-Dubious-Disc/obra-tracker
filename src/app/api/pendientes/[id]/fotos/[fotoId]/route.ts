import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';
import { deletePendienteFoto, getPendienteById } from '@/lib/services/projectService';
import { deleteObject } from '@/lib/services/r2';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fotoId: string }> }
) {
  try {
    const { id: pendienteId, fotoId } = await params;
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

    const result = await deletePendienteFoto(pendienteId, fotoId);
    if (!result.success) {
      const status = result.error === 'not_found' ? 404 : 500;
      const error = result.error === 'not_found' ? 'Foto no encontrada' : 'Error al eliminar la foto';
      return NextResponse.json({ error }, { status });
    }

    try {
      await deleteObject(result.r2Key);
    } catch (error) {
      console.error('No se pudo borrar la foto de R2', error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pendiente foto:', error);
    return NextResponse.json({ error: 'Error al eliminar la foto' }, { status: 500 });
  }
}
