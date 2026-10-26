import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';
import { getProjectPendientes, getProjectPendientesConFotos, createPendiente } from '@/lib/services/projectService';
import { getPresignedDownloadUrl } from '@/lib/services/r2';
import { createPendienteSchema } from '@/lib/schemas';
import { nextFotoOrden, preparePendienteFotos } from '@/lib/pendientes/photos';

async function attachDownloadUrls<T extends { r2Key: string }>(fotos: T[]) {
  return Promise.all(fotos.map(async (foto) => {
    try {
      const downloadUrl = await getPresignedDownloadUrl({ key: foto.r2Key, expiresIn: 60 * 60 });
      return { ...foto, downloadUrl };
    } catch (error) {
      console.error('No se pudo firmar la foto del pendiente', error);
      return { ...foto, downloadUrl: null };
    }
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const access = await checkProjectAccess(userId, projectId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const onlyPending = request.nextUrl.searchParams.get('estado') === 'pendiente';
    if (onlyPending) {
      const pendientes = await getProjectPendientes(projectId, true);
      return NextResponse.json(pendientes);
    }

    const pendientes = await getProjectPendientesConFotos(projectId);
    const withUrls = await Promise.all(pendientes.map(async (pendiente) => ({
      ...pendiente,
      fotos: await attachDownloadUrls(pendiente.fotos),
    })));

    return NextResponse.json(withUrls);
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
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const access = await checkProjectAccess(userId, projectId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const titulo = typeof body?.titulo === 'string' ? body.titulo.trim() : '';
    if (!titulo) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const parsed = createPendienteSchema.safeParse({
      titulo,
      descripcion: typeof body?.descripcion === 'string' ? body.descripcion.trim() : body?.descripcion,
      estado: body?.estado,
      fotos: body?.fotos,
      responsable: body?.responsable,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Faltan campos obligatorios' },
        { status: 400 },
      );
    }

    const prepared = preparePendienteFotos({
      projectId,
      incoming: parsed.data.fotos ?? [],
      existingCount: 0,
      existingKeys: [],
      nextOrden: nextFotoOrden([]),
    });
    if (!prepared.ok) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    const result = await createPendiente({
      proyectoId: projectId,
      titulo: parsed.data.titulo,
      descripcion: parsed.data.descripcion ? parsed.data.descripcion : null,
      estado: parsed.data.estado,
      fotos: prepared.fotos,
      ...(parsed.data.responsable !== undefined ? { responsable: parsed.data.responsable } : {}),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
    }

    return NextResponse.json({ pendienteId: result.pendienteId });
  } catch (error) {
    console.error('Error creating pendiente:', error);
    return NextResponse.json({ error: 'Error al crear pendiente' }, { status: 500 });
  }
}
