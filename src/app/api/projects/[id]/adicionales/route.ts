import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkProjectAccess, checkProjectRole } from '@/lib/services/authService';
import { getAdicionales, createAdicional } from '@/lib/services/projectService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const access = await checkProjectAccess(userId, projectId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const adicionales = await getAdicionales(projectId);

    return NextResponse.json(adicionales);
  } catch (error) {
    console.error('Error fetching adicionales:', error);
    return NextResponse.json({ error: 'Error al obtener adicionales' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Solo admin y editor pueden agregar adicionales al presupuesto
    const hasPermission = await checkProjectRole(userId, projectId, ['admin', 'editor']);
    if (!hasPermission) {
      return NextResponse.json({ error: 'No autorizado para agregar adicionales' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, monto } = body;

    if (!nombre || monto === undefined || isNaN(parseFloat(monto))) {
      return NextResponse.json({ error: 'Faltan campos obligatorios o monto inválido' }, { status: 400 });
    }

    const result = await createAdicional(projectId, {
      nombre: String(nombre).trim(),
      monto: parseFloat(monto),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ adicionalId: result.adicionalId });
  } catch (error) {
    console.error('Error creating adicional:', error);
    return NextResponse.json({ error: 'Error al crear adicional' }, { status: 500 });
  }
}
