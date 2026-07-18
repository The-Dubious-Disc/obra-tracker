import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { etapas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { checkProjectRole } from '@/lib/services/authService';

async function getEtapaProjectId(etapaId: string): Promise<string | null> {
  const etapa = await db.query.etapas.findFirst({ where: eq(etapas.id, etapaId) });
  return etapa?.proyectoId ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const projectId = await getEtapaProjectId(id);
    if (!projectId) {
      return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 404 });
    }

    const hasRole = await checkProjectRole(userId, projectId, ['admin', 'editor']);
    if (!hasRole) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, duracionEstimadaJornales, hitoVerificacion } = body;

    const updateData: {
      nombre?: string;
      duracionEstimadaJornales?: number;
      hitoVerificacion?: string | null;
    } = {};
    if (nombre) updateData.nombre = nombre;
    if (duracionEstimadaJornales !== undefined) updateData.duracionEstimadaJornales = duracionEstimadaJornales;
    if (hitoVerificacion !== undefined) updateData.hitoVerificacion = hitoVerificacion;

    await db.update(etapas)
      .set(updateData)
      .where(eq(etapas.id, id));

    return NextResponse.json({ message: 'Etapa actualizada' });
  } catch (error) {
    console.error('Error updating stage:', error);
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const projectId = await getEtapaProjectId(id);
    if (!projectId) {
      return NextResponse.json({ error: 'Etapa no encontrada' }, { status: 404 });
    }

    const hasRole = await checkProjectRole(userId, projectId, ['admin']);
    if (!hasRole) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await db.delete(etapas).where(eq(etapas.id, id));
    return NextResponse.json({ message: 'Etapa eliminada' });
  } catch (error) {
    console.error('Error deleting stage:', error);
    return NextResponse.json({ error: 'Failed to delete stage' }, { status: 500 });
  }
}
