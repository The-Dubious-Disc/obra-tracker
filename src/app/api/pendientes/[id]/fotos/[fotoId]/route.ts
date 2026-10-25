import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';
import {
  deletePendienteFoto,
  getPendienteById,
  listPendienteFotos,
  replacePendienteFoto,
} from '@/lib/services/projectService';
import { deleteObject, getObjectBytes } from '@/lib/services/r2';
import { replacePendienteFotoSchema } from '@/lib/schemas';
import { isPendientePhotoKey, sanitizeFotoNombre } from '@/lib/pendientes/photos';

async function authorize(pendienteId: string) {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  if (!userId) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }

  const pendiente = await getPendienteById(pendienteId);
  if (!pendiente) {
    return { error: NextResponse.json({ error: 'Pendiente no encontrado' }, { status: 404 }) };
  }

  const access = await checkProjectAccess(userId, pendiente.proyectoId);
  if (!access) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }

  return { pendiente };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fotoId: string }> }
) {
  try {
    const { id: pendienteId, fotoId } = await params;
    const auth = await authorize(pendienteId);
    if ('error' in auth) return auth.error;

    const fotos = await listPendienteFotos(pendienteId);
    if (!fotos) {
      return NextResponse.json({ error: 'Error al leer las fotos' }, { status: 500 });
    }
    const foto = fotos.find((item) => item.id === fotoId);
    if (!foto) {
      return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });
    }

    const object = await getObjectBytes(foto.r2Key);
    const contentType = object.contentType?.startsWith('image/')
      ? object.contentType
      : 'application/octet-stream';

    return new NextResponse(Buffer.from(object.bytes), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Error reading pendiente foto:', error);
    return NextResponse.json({ error: 'No se pudo abrir la foto' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fotoId: string }> }
) {
  try {
    const { id: pendienteId, fotoId } = await params;
    const auth = await authorize(pendienteId);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const parsed = replacePendienteFotoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Foto inválida' },
        { status: 400 },
      );
    }

    const nombre = sanitizeFotoNombre(parsed.data.nombre);
    const r2Key = parsed.data.r2Key.trim();
    if (!nombre) {
      return NextResponse.json({ error: 'Cada foto necesita un nombre' }, { status: 400 });
    }
    if (!isPendientePhotoKey(auth.pendiente.proyectoId, r2Key)) {
      return NextResponse.json({ error: 'La foto no pertenece a este proyecto' }, { status: 400 });
    }

    const existentes = await listPendienteFotos(pendienteId);
    if (!existentes) {
      return NextResponse.json({ error: 'Error al leer las fotos' }, { status: 500 });
    }
    if (existentes.some((foto) => foto.id !== fotoId && foto.r2Key === r2Key)) {
      return NextResponse.json({ error: 'Hay fotos duplicadas' }, { status: 400 });
    }

    const result = await replacePendienteFoto(pendienteId, fotoId, { r2Key, nombre });
    if (!result.success) {
      const status = result.error === 'not_found' ? 404 : 500;
      const error = result.error === 'not_found' ? 'Foto no encontrada' : 'Error al guardar la foto';
      return NextResponse.json({ error }, { status });
    }

    if (result.previousKey !== r2Key) {
      try {
        await deleteObject(result.previousKey);
      } catch (error) {
        console.error('No se pudo borrar la foto anterior de R2', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error replacing pendiente foto:', error);
    return NextResponse.json({ error: 'Error al guardar la foto' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fotoId: string }> }
) {
  try {
    const { id: pendienteId, fotoId } = await params;
    const auth = await authorize(pendienteId);
    if ('error' in auth) return auth.error;

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
