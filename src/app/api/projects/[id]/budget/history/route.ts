import { NextRequest, NextResponse } from 'next/server';
import { getBudgetHistory } from '@/lib/services/projectService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const history = await getBudgetHistory(projectId);

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching budget history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget history' },
      { status: 500 }
    );
  }
}