import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';
import { buildObjectKey, getPresignedUploadUrl } from '@/lib/services/r2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, filename, contentType, kind } = body as {
      projectId?: string;
      filename?: string;
      contentType?: string;
      kind?: 'planos' | 'comprobantes' | 'adjuntos';
    };

    if (!projectId || !filename || !contentType) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const access = await checkProjectAccess(userId, projectId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const key = buildObjectKey({
      projectId,
      kind: kind || 'adjuntos',
      filename,
    });

    const uploadUrl = await getPresignedUploadUrl({
      key,
      contentType,
    });

    return NextResponse.json({ key, uploadUrl });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Error al generar URL de subida' },
      { status: 500 }
    );
  }
}
