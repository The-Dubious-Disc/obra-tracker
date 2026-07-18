import { NextRequest, NextResponse } from 'next/server';
import { createInvitation, checkProjectRole } from '@/lib/services/authService';
import { getProjectSummary } from '@/lib/services/projectService';
import { sendProjectInvitationEmail } from '@/lib/services/emailService';
import { headers } from 'next/headers';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const { email, rol } = await request.json();
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

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

    // Get project name for email
    const projectSummary = await getProjectSummary(projectId);
    const projectName = projectSummary?.proyecto?.nombre || 'un proyecto';

    // Send real email via Resend
    await sendProjectInvitationEmail(email, projectName, result.invitation.token);

    return NextResponse.json({ message: 'Invitation sent' });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}