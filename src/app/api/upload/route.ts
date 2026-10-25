import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { checkProjectAccess } from '@/lib/services/authService';
import { buildObjectKey, getPresignedUploadUrl, type StorageKind } from '@/lib/services/r2';
import { MAX_PENDIENTE_FOTO_BYTES, resolvePendienteImageContentType } from '@/lib/pendientes/photos';

const STORAGE_KINDS = new Set<StorageKind>(['planos', 'comprobantes', 'adjuntos', 'pendientes']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, filename, contentType, kind, size } = body as {
      projectId?: string;
      filename?: string;
      contentType?: string;
      kind?: string;
      size?: number;
    };

    if (!projectId || !filename || !contentType) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const access = await checkProjectAccess(userId, projectId);
    if (!access) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const requestedKind = kind ?? 'adjuntos';
    if (!STORAGE_KINDS.has(requestedKind as StorageKind)) {
      return NextResponse.json({ error: 'Tipo de archivo inválido' }, { status: 400 });
    }
    const storageKind = requestedKind as StorageKind;
    let signedContentType = contentType;

    if (storageKind === 'pendientes') {
      const resolved = resolvePendienteImageContentType(filename, contentType);
      if (!resolved) {
        return NextResponse.json({ error: 'La foto debe ser JPG, PNG, WebP, GIF o HEIC' }, { status: 400 });
      }
      if (typeof size === 'number' && size > MAX_PENDIENTE_FOTO_BYTES) {
        return NextResponse.json({ error: 'Cada foto puede pesar hasta 10 MB' }, { status: 400 });
      }
      signedContentType = resolved;
    }

    const key = buildObjectKey({
      projectId,
      kind: storageKind,
      filename,
    });

    const uploadUrl = await getPresignedUploadUrl({
      key,
      contentType: signedContentType,
    });

    return NextResponse.json({ key, uploadUrl, contentType: signedContentType });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Error al generar URL de subida' },
      { status: 500 }
    );
  }
}
