import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkProjectRole } from '@/lib/services/authService';
import { createPayment } from '@/lib/services/projectService';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      proyectoId,
      etapaId,
      montoPagado,
      moneda,
      fechaPago,
      comentario,
      comprobanteUrl,
    } = body;

    if (!proyectoId || !montoPagado || !moneda || !fechaPago) {
      return NextResponse.json(
        { error: 'Missing required fields: proyectoId, montoPagado, moneda, fechaPago' },
        { status: 400 }
      );
    }

    // Verificar que el usuario tenga acceso al proyecto y rol apropiado
    // Solo admin y editor pueden crear pagos
    const hasPermission = await checkProjectRole(userId, proyectoId, ['admin', 'editor']);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'No autorizado para crear pagos en este proyecto' },
        { status: 403 }
      );
    }

    const result = await createPayment({
      proyectoId,
      etapaId,
      montoPagado: parseFloat(montoPagado),
      moneda,
      fechaPago,
      comentario,
      comprobanteUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      paymentId: result.paymentId,
      message: 'Payment registered successfully'
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}