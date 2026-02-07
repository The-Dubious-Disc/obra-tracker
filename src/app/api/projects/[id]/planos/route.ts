import { NextRequest, NextResponse } from 'next/server';
import { getProjectPlanos } from '@/lib/services/projectService';
import { getPresignedDownloadUrl, isR2Key } from '@/lib/services/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planos = await getProjectPlanos(id);

    const planosWithUrls = await Promise.all(
      planos.map(async (plano) => {
        if (!plano.url || !isR2Key(plano.url)) {
          return plano;
        }

        const signedUrl = await getPresignedDownloadUrl({ key: plano.url });
        return { ...plano, url: signedUrl };
      })
    );

    return NextResponse.json(planosWithUrls);
  } catch (error) {
    console.error('Error fetching planos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planos' },
      { status: 500 }
    );
  }
}
