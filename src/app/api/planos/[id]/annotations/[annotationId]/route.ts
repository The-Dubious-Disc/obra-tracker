import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { anotacionesPlanos, planos } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const { id: planoId, annotationId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const annotation = await db.query.anotacionesPlanos.findFirst({
      where: and(eq(anotacionesPlanos.id, annotationId), eq(anotacionesPlanos.planoId, planoId)),
    });

    if (!annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    const plano = await db.query.planos.findFirst({
      where: eq(planos.id, annotation.planoId),
      columns: { proyectoId: true },
    });

    if (!plano) {
      return NextResponse.json({ error: 'Plano not found' }, { status: 404 });
    }

    const member = await checkProjectAccess(userId, plano.proyectoId);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { estado } = body;

    if (!estado || !['abierta', 'resuelta'].includes(estado)) {
      return NextResponse.json({ error: 'estado is invalid' }, { status: 400 });
    }

    const [updated] = await db
      .update(anotacionesPlanos)
      .set({ estado })
      .where(eq(anotacionesPlanos.id, annotationId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating annotation status:', error);
    return NextResponse.json({ error: 'Failed to update annotation status' }, { status: 500 });
  }
}
