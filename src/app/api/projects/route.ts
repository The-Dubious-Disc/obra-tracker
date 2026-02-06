import { NextRequest, NextResponse } from 'next/server';
import { getAllProjects, createProject } from '@/lib/services/projectService';

export async function GET() {
  try {
    const projects = await getAllProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, moneda, montoInicial } = body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const result = await createProject(nombre.trim(), moneda, montoInicial);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      projectId: result.projectId,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}