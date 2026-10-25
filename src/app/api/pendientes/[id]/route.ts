import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';
import { updatePendiente, deletePendiente, getPendienteById } from '@/lib/services/projectService';
import { deleteObject } from '@/lib/services/r2';
import { updatePendienteSchema } from '@/lib/schemas';

async function removeStoredObjects(keys: string[]) {
  await Promise.all(keys.map(async (key) => {
    try {
      await deleteObject(key);
    } catch (error) {
      console.error('No se pudo borrar el archivo de R2', error);
    }
  }));
}

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
    const parsed = updatePendienteSchema.safeParse({
      titulo: typeof body?.titulo === 'string' ? body.titulo.trim() : body?.titulo,
      descripcion: body?.descripcion === null
        ? null
        : typeof body?.descripcion === 'string' ? body.descripcion.trim() : body?.descripcion,
      fechaVencimiento: body?.fechaVencimiento,
      estado: body?.estado,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 },
      );
    }

    const result = await updatePendiente(pendienteId, {
      titulo: parsed.data.titulo,
      descripcion: parsed.data.descripcion === undefined
        ? undefined
        : (parsed.data.descripcion ? parsed.data.descripcion : null),
      fechaVencimiento: parsed.data.fechaVencimiento,
      estado: parsed.data.estado,
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

    await removeStoredObjects(result.r2Keys);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pendiente:', error);
    return NextResponse.json({ error: 'Error al eliminar pendiente' }, { status: 500 });
  }
}
