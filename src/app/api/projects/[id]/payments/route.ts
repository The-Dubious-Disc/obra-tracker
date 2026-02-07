import { NextRequest, NextResponse } from 'next/server';
import { getProjectPayments } from '@/lib/services/projectService';
import { getPresignedDownloadUrl, isR2Key } from '@/lib/services/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
