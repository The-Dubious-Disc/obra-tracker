import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';
import { addPendienteFotos, getPendienteById, listPendienteFotos } from '@/lib/services/projectService';
import { addPendienteFotosSchema } from '@/lib/schemas';
import { nextFotoOrden, preparePendienteFotos } from '@/lib/pendientes/photos';

export async function POST(
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
    const parsed = addPendienteFotosSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Fotos inválidas' },
        { status: 400 },
      );
    }

    const existentes = await listPendienteFotos(pendienteId);
    if (!existentes) {
      return NextResponse.json({ error: 'Error al leer las fotos' }, { status: 500 });
    }

    const prepared = preparePendienteFotos({
      projectId: pendiente.proyectoId,
      incoming: parsed.data.fotos,
      existingCount: existentes.length,
      existingKeys: existentes.map((foto) => foto.r2Key),
      nextOrden: nextFotoOrden(existentes.map((foto) => foto.orden)),
    });
    if (!prepared.ok) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    const result = await addPendienteFotos(pendienteId, prepared.fotos);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ fotos: result.fotos }, { status: 201 });
  } catch (error) {
    console.error('Error adding pendiente fotos:', error);
    return NextResponse.json({ error: 'Error al guardar las fotos' }, { status: 500 });
  }
}
