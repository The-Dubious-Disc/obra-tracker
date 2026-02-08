import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { etapas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    await db.delete(etapas).where(eq(etapas.id, id));
    return NextResponse.json({ message: 'Etapa eliminada' });
  } catch (error) {
    console.error('Error deleting stage:', error);
    return NextResponse.json({ error: 'Failed to delete stage' }, { status: 500 });
  }
}
