import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { anotacionesPlanos, planos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planoId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const plano = await db.query.planos.findFirst({
      where: eq(planos.id, planoId),
      columns: { proyectoId: true },
    });

    if (!plano) {
      return NextResponse.json({ error: 'Plano not found' }, { status: 404 });
    }

    const member = await checkProjectAccess(userId, plano.proyectoId);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await db
      .select()
      .from(anotacionesPlanos)
      .where(eq(anotacionesPlanos.planoId, planoId));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching annotations:', error);
    return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planoId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const plano = await db.query.planos.findFirst({
      where: eq(planos.id, planoId),
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
    const { coord_x, coord_y, comentario } = body;

    if (coord_x === undefined || coord_y === undefined || !comentario) {
      return NextResponse.json({ error: 'coord_x, coord_y, comentario are required' }, { status: 400 });
    }

    const [newPin] = await db
      .insert(anotacionesPlanos)
      .values({
        planoId,
        coordX: coord_x,
        coordY: coord_y,
        comentario,
        creadoPor: userId,
      })
      .returning();

    return NextResponse.json(newPin);
  } catch (error) {
    console.error('Error creating annotation:', error);
    return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 });
  }
}
