import { NextRequest, NextResponse } from 'next/server';
import { getProjectPlanos } from '@/lib/services/projectService';
import { getPresignedDownloadUrl, isR2Key } from '@/lib/services/r2';
import { checkProjectAccess } from '@/lib/services/authService';
import { cookies } from 'next/headers';

export async function GET(
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

    const { id } = await params;

    // Verificar que el usuario tenga acceso al proyecto
    const hasAccess = await checkProjectAccess(userId, id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No autorizado para acceder a este proyecto' },
        { status: 403 }
      );
    }

    const planos = await getProjectPlanos(id);

    const planosWithUrls = await Promise.all(
      planos.map(async (plano) => {
        if (!plano.url || !isR2Key(plano.url)) {
          return plano;
        }

        const signedUrl = await getPresignedDownloadUrl({ key: plano.url });
        return { ...plano, url: signedUrl };
      })
    );

    return NextResponse.json(planosWithUrls);
  } catch (error) {
    console.error('Error fetching planos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planos' },
      { status: 500 }
    );
  }
}