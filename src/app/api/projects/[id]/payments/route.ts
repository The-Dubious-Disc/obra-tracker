import { NextRequest, NextResponse } from 'next/server';
import { getProjectPayments } from '@/lib/services/projectService';
import { getPresignedDownloadUrl, isR2Key } from '@/lib/services/r2';
import { checkProjectAccess } from '@/lib/services/authService';
import { headers } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const headersList = await headers();
    const userId = headersList.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verificar que el usuario tenga acceso al proyecto
    const hasAccess = await checkProjectAccess(userId, id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No autorizado para acceder a este proyecto' },
        { status: 403 }
      );
    }

    const payments = await getProjectPayments(id);

    const paymentsWithUrls = await Promise.all(
      payments.map(async (payment) => {
        if (!payment.comprobanteUrl || !isR2Key(payment.comprobanteUrl)) {
          return payment;
        }
        const signedUrl = await getPresignedDownloadUrl({ key: payment.comprobanteUrl });
        return { ...payment, comprobanteUrl: signedUrl };
      })
    );

    return NextResponse.json(paymentsWithUrls);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}