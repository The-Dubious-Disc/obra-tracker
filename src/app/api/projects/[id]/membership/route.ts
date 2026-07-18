import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getProjectMembership } from '@/lib/services/authService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const membership = await getProjectMembership(userId, projectId);
    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ rol: membership.rol });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}