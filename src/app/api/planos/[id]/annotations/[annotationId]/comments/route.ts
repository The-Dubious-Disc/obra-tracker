import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comentariosAnotaciones } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const { annotationId } = await params;
    const data = await db
      .select()
      .from(comentariosAnotaciones)
      .where(eq(comentariosAnotaciones.anotacionId, annotationId))
      .orderBy(comentariosAnotaciones.createdAt);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const { annotationId } = await params;
    const body = await request.json();
    const { texto, usuario_id } = body;

    if (!texto || !usuario_id) {
      return NextResponse.json({ error: 'texto and usuario_id are required' }, { status: 400 });
    }

    const [newComment] = await db.insert(comentariosAnotaciones).values({
      anotacionId: annotationId,
      usuarioId: usuario_id,
      texto,
    }).returning();

    return NextResponse.json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
