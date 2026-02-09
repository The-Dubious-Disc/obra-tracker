import { NextRequest, NextResponse } from 'next/server';
import { createInvitation, checkProjectRole } from '@/lib/services/authService';
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
    const hasAdminRole = await checkProjectRole(userId, projectId, ['admin']);
    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await createInvitation(projectId, email, rol, userId);
    if (!result.success || !result.invitation) {
      return NextResponse.json({ error: result.error || 'Failed to create invitation' }, { status: 400 });
    }

    // Send email logic here (mocked)
    console.log(`Invitation sent to ${email} with token ${result.invitation.token}`);

    return NextResponse.json({ message: 'Invitation sent' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}