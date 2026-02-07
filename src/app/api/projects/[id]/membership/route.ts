import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const access = await checkProjectAccess(userId, projectId);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ rol: access.rol });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
