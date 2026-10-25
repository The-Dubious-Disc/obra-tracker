export const MAX_PENDIENTE_FOTOS = 10;
export const MAX_PENDIENTE_FOTO_BYTES = 10 * 1024 * 1024;

const PENDIENTE_IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function pendientePhotoKeyPrefix(projectId: string): string {
  return `obratracker/projects/${projectId}/pendientes/`;
}

export function isPendientePhotoKey(projectId: string, key: string): boolean {
  if (!UUID_RE.test(projectId)) return false;
  if (!key || key.length > 500) return false;
  if (key.includes('\\') || key.includes('\0') || key.includes('//')) return false;
  const prefix = pendientePhotoKeyPrefix(projectId);
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return Boolean(rest) && !rest.includes('/');
}

export function resolvePendienteImageContentType(filename: string, contentType?: string | null): string | null {
  const normalized = (contentType ?? '').toLowerCase().split(';')[0].trim();
  if (normalized === 'image/jpg') return 'image/jpeg';
  if (PENDIENTE_IMAGE_CONTENT_TYPES.has(normalized)) return normalized;
  const extension = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  if (!extension) return null;
  return EXTENSION_CONTENT_TYPES[extension] ?? null;
}

export function sanitizeFotoNombre(nombre: string): string {
  return nombre.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 255);
}

export interface PreparedPendienteFoto {
  r2Key: string;
  nombre: string;
  orden: number;
}

export function preparePendienteFotos(options: {
  projectId: string;
  incoming: { r2Key?: unknown; nombre?: unknown }[];
  existingCount: number;
  existingKeys?: string[];
  nextOrden: number;
}): { ok: true; fotos: PreparedPendienteFoto[] } | { ok: false; error: string } {
  const incoming = options.incoming ?? [];
  if (incoming.length === 0) return { ok: true, fotos: [] };
  if (options.existingCount + incoming.length > MAX_PENDIENTE_FOTOS) {
    return { ok: false, error: `Máximo ${MAX_PENDIENTE_FOTOS} fotos por pendiente` };
  }

  const seen = new Set(options.existingKeys ?? []);
  const fotos: PreparedPendienteFoto[] = [];

  for (let index = 0; index < incoming.length; index += 1) {
    const raw = incoming[index];
    const r2Key = typeof raw?.r2Key === 'string' ? raw.r2Key.trim() : '';
    const nombre = typeof raw?.nombre === 'string' ? sanitizeFotoNombre(raw.nombre) : '';

    if (!isPendientePhotoKey(options.projectId, r2Key)) {
      return { ok: false, error: 'La foto no pertenece a este proyecto' };
    }
    if (!nombre) {
      return { ok: false, error: 'Cada foto necesita un nombre' };
    }
    if (seen.has(r2Key)) {
      return { ok: false, error: 'Hay fotos duplicadas' };
    }

    seen.add(r2Key);
    fotos.push({
      r2Key,
      nombre,
      orden: options.nextOrden + index,
    });
  }

  return { ok: true, fotos };
}

export function nextFotoOrden(ordenes: number[]): number {
  return ordenes.reduce((max, orden) => Math.max(max, orden), -1) + 1;
}
