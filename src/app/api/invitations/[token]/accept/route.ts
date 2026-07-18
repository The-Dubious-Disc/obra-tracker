import { NextRequest, NextResponse } from 'next/server';
import { acceptInvitation } from '@/lib/services/authService';
import { headers } from 'next/headers';

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const headersList = await headers();
    const usuarioId = headersList.get('x-user-id');

    if (!usuarioId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const result = await acceptInvitation(token, usuarioId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Invitation accepted' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
