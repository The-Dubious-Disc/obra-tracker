import { annotatedFotoName, fitImageSize } from './annotate';
import {
  STORED_FOTO_JPEG_QUALITIES,
  STORED_FOTO_KEEP_MAX_BYTES,
  STORED_FOTO_MAX_EDGE,
} from './imageSize';
import { MAX_PENDIENTE_FOTO_BYTES, resolvePendienteImageContentType } from './photos';

export interface StoredFotoSource {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  original?: File;
  encode: (width: number, height: number, quality: number) => Promise<Blob | null>;
}

function keptJpeg(file: File): File {
  return file.type === 'image/jpeg' ? file : new File([file], file.name, { type: 'image/jpeg' });
}

/**
 * Decide the file that will be uploaded. A JPEG that is already small enough
 * is returned as-is. Everything else is scaled to the stored long edge and
 * encoded as JPEG, starting at the highest quality.
 */
export async function buildStoredPendienteFoto(source: StoredFotoSource): Promise<File> {
  const fitsStoredEdge = source.width > 0
    && source.height > 0
    && source.width <= STORED_FOTO_MAX_EDGE
    && source.height <= STORED_FOTO_MAX_EDGE;
  if (
    source.original
    && source.type === 'image/jpeg'
    && fitsStoredEdge
    && source.size > 0
    && source.size <= STORED_FOTO_KEEP_MAX_BYTES
  ) {
    return keptJpeg(source.original);
  }

  const size = fitImageSize(source.width, source.height, STORED_FOTO_MAX_EDGE);
  let last: Blob | null = null;
  for (const quality of STORED_FOTO_JPEG_QUALITIES) {
    const blob = await source.encode(size.width, size.height, quality);
    if (!blob) continue;
    last = blob;
    if (blob.size <= MAX_PENDIENTE_FOTO_BYTES) {
      return new File([blob], annotatedFotoName(source.name), { type: 'image/jpeg' });
    }
  }

  if (!last) throw new Error(`No se pudo procesar ${source.name}`);
  throw new Error(`${source.name} supera el límite de 10 MB`);
}

function encodeBitmapJpeg(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.resolve(null);
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/** Compress a photo in the browser before it is uploaded to R2. */
export async function compressPendienteFotoFile(file: File): Promise<File> {
  const type = resolvePendienteImageContentType(file.name, file.type);
  if (!type) {
    throw new Error(`${file.name} no es una imagen compatible`);
  }
  if (file.size > MAX_PENDIENTE_FOTO_BYTES) {
    throw new Error(`${file.name} supera el límite de 10 MB`);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(`No se pudo procesar ${file.name}`);
  }

  try {
    return await buildStoredPendienteFoto({
      name: file.name,
      type,
      size: file.size,
      width: bitmap.width,
      height: bitmap.height,
      original: file,
      encode: (width, height, quality) => encodeBitmapJpeg(bitmap, width, height, quality),
    });
  } finally {
    bitmap.close();
  }
}
