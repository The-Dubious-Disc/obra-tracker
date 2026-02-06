import { NextRequest, NextResponse } from 'next/server';
import { updateBudget } from '@/lib/services/projectService';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const { newAmount, note } = body;

    if (!newAmount || typeof newAmount !== 'number' || newAmount < 0) {
      return NextResponse.json(
        { error: 'Valid newAmount is required' },
        { status: 400 }
      );
    }

    const result = await updateBudget(projectId, newAmount, note || 'Updated via API');

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Budget updated successfully'
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}