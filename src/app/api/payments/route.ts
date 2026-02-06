import { NextRequest, NextResponse } from 'next/server';
import { createPayment } from '@/lib/services/projectService';

export async function POST(request: NextRequest) {
  try {
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