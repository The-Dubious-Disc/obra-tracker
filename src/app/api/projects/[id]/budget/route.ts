import { NextRequest, NextResponse } from 'next/server';
import { updateBudget } from '@/lib/services/projectService';
import { checkProjectAccess } from '@/lib/services/authService';
import { cookies } from 'next/headers';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;

    // Verificar que el usuario tenga acceso al proyecto
    const hasAccess = await checkProjectAccess(userId, projectId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No autorizado para acceder a este proyecto' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { newAmount, note } = body;

    if (!newAmount || typeof newAmount !== 'number' || newAmount < 0) {
      return NextResponse.json(
        { error: 'Valid newAmount is required' },
        { status: 400 }
      );
    }

    const result = await updateBudget(projectId, newAmount, note || 'Updated via API');

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Budget updated successfully'
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}