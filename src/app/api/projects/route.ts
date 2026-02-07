import { NextRequest, NextResponse } from 'next/server';
import { getAllProjects, createProject } from '@/lib/services/projectService';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    const projects = await getAllProjects(userId);
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
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, moneda, presupuestoTotal, etapas } = body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    if (!presupuestoTotal || typeof presupuestoTotal !== 'number' || presupuestoTotal <= 0) {
      return NextResponse.json(
        { error: 'Presupuesto total es obligatorio' },
        { status: 400 }
      );
    }

    if (!Array.isArray(etapas) || etapas.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos una etapa' },
        { status: 400 }
      );
    }

    const porcentajeTotal = etapas.reduce((sum, etapa) => sum + (etapa.porcentajeTotal || 0), 0);
    if (porcentajeTotal !== 100) {
      return NextResponse.json(
        { error: 'La suma de porcentajes debe ser 100%' },
        { status: 400 }
      );
    }

    for (const etapa of etapas) {
      if (!etapa.nombre || !etapa.porcentajeTotal || !etapa.duracionEstimadaJornales) {
        return NextResponse.json(
          { error: 'Cada etapa debe tener nombre, porcentaje y duración estimada' },
          { status: 400 }
        );
      }
      if (!Array.isArray(etapa.tareas) || etapa.tareas.length === 0 || etapa.tareas.some((t: { descripcion: string }) => !t.descripcion || !t.descripcion.trim())) {
        return NextResponse.json(
          { error: 'Cada etapa debe tener al menos una tarea con descripción' },
          { status: 400 }
        );
      }
    }

    const result = await createProject(nombre.trim(), moneda, presupuestoTotal, etapas, userId);

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