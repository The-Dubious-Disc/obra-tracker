import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { anotacionesPlanos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const { annotationId } = await params;
    const body = await request.json();
    const { estado } = body;

    if (!estado) {
      return NextResponse.json({ error: 'estado is required' }, { status: 400 });
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
