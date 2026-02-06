import { NextRequest, NextResponse } from 'next/server';
import { getProjectPlanos } from '@/lib/services/projectService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planos = await getProjectPlanos(id);
    return NextResponse.json(planos);
  } catch (error) {
    console.error('Error fetching planos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planos' },
      { status: 500 }
    );
  }
}
