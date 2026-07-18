import { NextRequest, NextResponse } from 'next/server';
import { createPlano } from '@/lib/services/projectService';
import { headers } from 'next/headers';
import { checkProjectRole } from '@/lib/services/authService';

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      proyectoId,
      nombre,
      descripcion,
      tipo,
      orden,
      url,
    } = body;

    if (!proyectoId || !nombre || !url || !tipo) {
      return NextResponse.json(
        { error: 'Missing required fields: proyectoId, nombre, url, tipo' },
        { status: 400 }
      );
    }

    const hasRole = await checkProjectRole(userId, proyectoId, ['admin', 'editor']);
    if (!hasRole) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const result = await createPlano({
      proyectoId,
      nombre,
      descripcion,
      tipo,
      orden: orden || 0,
      url,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      planoId: result.planoId,
      message: 'Plano created successfully'
    });
  } catch (error) {
    console.error('Error creating plano:', error);
    return NextResponse.json(
      { error: 'Failed to create plano' },
      { status: 500 }
    );
  }
}