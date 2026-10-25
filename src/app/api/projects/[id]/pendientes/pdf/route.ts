import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';
import { getProjectPendientesConFotos } from '@/lib/services/projectService';
import { db } from '@/lib/db';
import { proyectos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getObjectBytes } from '@/lib/services/r2';
import { buildPendientesPdf, formatPdfExportDate, pdfFilename, type PdfFotoInput } from '@/lib/pendientes/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function mapPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }

  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => run()));
  return results;
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

    const project = await db.query.proyectos.findFirst({
      where: eq(proyectos.id, projectId),
      columns: { nombre: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    const pendientes = await getProjectPendientesConFotos(projectId, true);
    const items = await Promise.all(pendientes.map(async (pendiente) => {
      const fotos = await mapPool(pendiente.fotos, 4, async (foto): Promise<PdfFotoInput> => {
        try {
          const object = await getObjectBytes(foto.r2Key);
          return { nombre: foto.nombre, bytes: object.bytes, contentType: object.contentType };
        } catch (error) {
          console.error('No se pudo leer la foto para el PDF', error);
          return { nombre: foto.nombre, bytes: new Uint8Array() };
        }
      });

      return {
        titulo: pendiente.titulo,
        descripcion: pendiente.descripcion,
        estado: pendiente.estado,
        fotos,
      };
    }));

    const pdfBytes = await buildPendientesPdf({
      proyectoNombre: project.nombre,
      generadoEl: formatPdfExportDate(new Date()),
      items,
    });

    const filename = pdfFilename(project.nombre);
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error exporting pendientes PDF:', error);
    return NextResponse.json({ error: 'Error al exportar el PDF' }, { status: 500 });
  }
}
