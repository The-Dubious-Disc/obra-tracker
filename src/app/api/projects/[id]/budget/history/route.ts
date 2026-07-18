import { NextRequest, NextResponse } from 'next/server';
import { getBudgetHistory } from '@/lib/services/projectService';
import { checkProjectAccess } from '@/lib/services/authService';
import { headers } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

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

    const history = await getBudgetHistory(projectId);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching budget history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget history' },
      { status: 500 }
    );
  }
}