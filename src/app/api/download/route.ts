import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';
import { getPresignedDownloadUrl } from '@/lib/services/r2';

function extractProjectIdFromKey(key: string) {
  const parts = key.split('/');
  const projectsIndex = parts.indexOf('projects');
  if (projectsIndex === -1 || projectsIndex + 1 >= parts.length) return null;
  return parts[projectsIndex + 1];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const projectId = extractProjectIdFromKey(key);
    if (!projectId) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    const access = await checkProjectAccess(userId, projectId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const downloadUrl = await getPresignedDownloadUrl({ key });
    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: 'Error al generar URL de descarga' }, { status: 500 });
  }
}
