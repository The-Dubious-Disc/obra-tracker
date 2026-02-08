import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { anotacionesPlanos, comentariosAnotaciones, planos } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const { id: planoId, annotationId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

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
    const { id: planoId, annotationId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

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
    const { texto } = body;

    if (!texto) {
      return NextResponse.json({ error: 'texto is required' }, { status: 400 });
    }

    const [newComment] = await db
      .insert(comentariosAnotaciones)
      .values({
        anotacionId: annotationId,
        usuarioId: userId,
        texto,
      })
      .returning();

    return NextResponse.json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
