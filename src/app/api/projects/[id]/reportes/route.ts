import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { reportes, reporteImagenes } from '@/lib/db/schema';
import { checkProjectAccess } from '@/lib/services/authService';
import { eq, desc, sql } from 'drizzle-orm';

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

    const result = await db
      .select({
        id: reportes.id,
        proyectoId: reportes.proyectoId,
        descripcion: reportes.descripcion,
        fecha: reportes.fecha,
        createdAt: reportes.createdAt,
        imageCount: sql<number>`(SELECT count(*) FROM reporte_imagenes WHERE reporte_id = ${reportes.id})::int`,
      })
      .from(reportes)
      .where(eq(reportes.proyectoId, projectId))
      .orderBy(desc(reportes.fecha));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching reportes:', error);
    return NextResponse.json({ error: 'Error al obtener reportes' }, { status: 500 });
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
    const { descripcion, fecha, imagenes } = body as {
      descripcion: string;
      fecha: string;
      imagenes?: { r2Key: string; nombre: string; orden: number }[];
    };

    if (!descripcion || !fecha) {
      return NextResponse.json({ error: 'Descripción y fecha son obligatorios' }, { status: 400 });
    }

    // Create the report
    const [reporte] = await db
      .insert(reportes)
      .values({
        proyectoId: projectId,
        descripcion,
        fecha,
      })
      .returning();

    // Insert images if any
    if (imagenes && imagenes.length > 0) {
      await db.insert(reporteImagenes).values(
        imagenes.map((img) => ({
          reporteId: reporte.id,
          r2Key: img.r2Key,
          nombre: img.nombre,
          orden: img.orden,
        }))
      );
    }

    return NextResponse.json({ id: reporte.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating reporte:', error);
    return NextResponse.json({ error: 'Error al crear reporte' }, { status: 500 });
  }
}
