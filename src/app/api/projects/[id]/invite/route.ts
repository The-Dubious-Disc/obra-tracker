import { NextRequest, NextResponse } from 'next/server';
import { createInvitation, checkProjectAccess } from '@/lib/services/authService';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const { email, rol } = await request.json();
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user has admin access
    const access = await checkProjectAccess(userId, projectId);
    if (!access || access.rol !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await createInvitation(projectId, email, rol, userId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Send email logic here (mocked)
    console.log(`Invitation sent to ${email} with token ${result.token}`);

    return NextResponse.json({ message: 'Invitation sent' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
