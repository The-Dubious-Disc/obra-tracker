import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { reportes, reporteImagenes } from '@/lib/db/schema';
import { checkProjectAccess } from '@/lib/services/authService';
import { getPresignedDownloadUrl } from '@/lib/services/r2';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reporteId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Fetch the report
    const reporte = await db.query.reportes.findFirst({
      where: eq(reportes.id, reporteId),
      with: {
        imagenes: {
          orderBy: (img, { asc }) => [asc(img.orden)],
        },
      },
    });

    if (!reporte) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    // Check project access
    const access = await checkProjectAccess(userId, reporte.proyectoId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Generate presigned download URLs for each image
    const imagenesWithUrls = await Promise.all(
      reporte.imagenes.map(async (img) => {
        try {
          const downloadUrl = await getPresignedDownloadUrl({ key: img.r2Key });
          return { ...img, downloadUrl };
        } catch {
          return { ...img, downloadUrl: null };
        }
      })
    );

    return NextResponse.json({
      ...reporte,
      imagenes: imagenesWithUrls,
      imageCount: imagenesWithUrls.length,
    });
  } catch (error) {
    console.error('Error fetching reporte:', error);
    return NextResponse.json({ error: 'Error al obtener reporte' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reporteId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Fetch the report to get project ID
    const reporte = await db.query.reportes.findFirst({
      where: eq(reportes.id, reporteId),
    });

    if (!reporte) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    const access = await checkProjectAccess(userId, reporte.proyectoId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Delete images first (cascade should handle this, but be explicit)
    await db.delete(reporteImagenes).where(eq(reporteImagenes.reporteId, reporteId));
    await db.delete(reportes).where(eq(reportes.id, reporteId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reporte:', error);
    return NextResponse.json({ error: 'Error al eliminar reporte' }, { status: 500 });
  }
}
