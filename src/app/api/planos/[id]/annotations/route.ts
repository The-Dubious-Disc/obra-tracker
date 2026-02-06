import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { anotacionesPlanos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planoId } = await params;
    const data = await db.select().from(anotacionesPlanos).where(eq(anotacionesPlanos.planoId, planoId));
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
    const body = await request.json();
    const { coord_x, coord_y, comentario, creado_por } = body;

    if (coord_x === undefined || coord_y === undefined || !comentario) {
      return NextResponse.json({ error: 'coord_x, coord_y, comentario are required' }, { status: 400 });
    }

    const [newPin] = await db.insert(anotacionesPlanos).values({
      planoId,
      coordX: coord_x,
      coordY: coord_y,
      comentario,
      creadoPor: creado_por || null,
    }).returning();

    return NextResponse.json(newPin);
  } catch (error) {
    console.error('Error creating annotation:', error);
    return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 });
  }
}
