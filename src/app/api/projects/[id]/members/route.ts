import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { proyectoMiembros, usuarios } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user belongs to project
    const member = await db.query.proyectoMiembros.findFirst({
      where: and(
        eq(proyectoMiembros.proyectoId, projectId),
        eq(proyectoMiembros.usuarioId, userId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const members = await db
      .select({
        id: proyectoMiembros.id,
        rol: proyectoMiembros.rol,
        usuario: {
          id: usuarios.id,
          nombre: usuarios.nombre,
          email: usuarios.email,
        },
      })
      .from(proyectoMiembros)
      .innerJoin(usuarios, eq(proyectoMiembros.usuarioId, usuarios.id))
      .where(eq(proyectoMiembros.proyectoId, projectId));

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { memberId, rol } = await request.json();
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only admin can update roles
    const adminMember = await db.query.proyectoMiembros.findFirst({
      where: and(
        eq(proyectoMiembros.proyectoId, projectId),
        eq(proyectoMiembros.usuarioId, userId),
        eq(proyectoMiembros.rol, 'admin')
      ),
    });

    if (!adminMember) {
      return NextResponse.json({ error: 'Only admins can update roles' }, { status: 403 });
    }

    await db
      .update(proyectoMiembros)
      .set({ rol })
      .where(
        and(
          eq(proyectoMiembros.id, memberId),
          eq(proyectoMiembros.proyectoId, projectId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
