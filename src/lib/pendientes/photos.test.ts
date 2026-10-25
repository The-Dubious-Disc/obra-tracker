import { describe, expect, it } from 'vitest';
import {
  isPendientePhotoKey,
  nextFotoOrden,
  preparePendienteFotos,
  resolvePendienteImageContentType,
} from '@/lib/pendientes/photos';
import { formatCalendarDate, isOverdue } from '@/lib/pendientes/format';
import { addPendienteFotosSchema, createPendienteSchema, updatePendienteSchema } from '@/lib/schemas';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_PROJECT_ID = '22222222-2222-4222-8222-222222222222';

function keyFor(projectId: string, filename = '1710000000000-foto.jpg') {
  return `obratracker/projects/${projectId}/pendientes/${filename}`;
}

describe('claves de fotos de pendientes', () => {
  it('acepta una clave del proyecto y rechaza otras ubicaciones', () => {
    expect(isPendientePhotoKey(PROJECT_ID, keyFor(PROJECT_ID))).toBe(true);
    expect(isPendientePhotoKey(PROJECT_ID, keyFor(PROJECT_ID, 'a..b.jpg'))).toBe(true);
    expect(isPendientePhotoKey(PROJECT_ID, keyFor(OTHER_PROJECT_ID))).toBe(false);
    expect(isPendientePhotoKey(PROJECT_ID, `obratracker/projects/${PROJECT_ID}/planos/foto.jpg`)).toBe(false);
    expect(isPendientePhotoKey(PROJECT_ID, `obratracker/projects/${PROJECT_ID}/pendientes/../../secretos`)).toBe(false);
    expect(isPendientePhotoKey('no-es-uuid', keyFor(PROJECT_ID))).toBe(false);
    expect(isPendientePhotoKey(PROJECT_ID, `obratracker/projects/${PROJECT_ID}/pendientes/`)).toBe(false);
  });

  it('normaliza el lote, el orden y los duplicados', () => {
    const prepared = preparePendienteFotos({
      projectId: PROJECT_ID,
      incoming: [
        { r2Key: keyFor(PROJECT_ID, 'a.jpg'), nombre: ' Frente.jpg ' },
        { r2Key: keyFor(PROJECT_ID, 'b.jpg'), nombre: 'Detalle.png' },
      ],
      existingCount: 1,
      existingKeys: [keyFor(PROJECT_ID, 'existente.jpg')],
      nextOrden: nextFotoOrden([0, 4]),
    });

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.fotos.map((foto) => foto.orden)).toEqual([5, 6]);
    expect(prepared.fotos[0].nombre).toBe('Frente.jpg');

    const tooMany = preparePendienteFotos({
      projectId: PROJECT_ID,
      incoming: Array.from({ length: 10 }, (_, index) => ({
        r2Key: keyFor(PROJECT_ID, `${index}.jpg`),
        nombre: `${index}.jpg`,
      })),
      existingCount: 1,
      nextOrden: 1,
    });
    expect(tooMany).toEqual({ ok: false, error: 'Máximo 10 fotos por pendiente' });

    const foreign = preparePendienteFotos({
      projectId: PROJECT_ID,
      incoming: [{ r2Key: keyFor(OTHER_PROJECT_ID), nombre: 'ajena.jpg' }],
      existingCount: 0,
      nextOrden: 0,
    });
    expect(foreign.ok).toBe(false);

    const duplicate = preparePendienteFotos({
      projectId: PROJECT_ID,
      incoming: [{ r2Key: keyFor(PROJECT_ID, 'a.jpg'), nombre: 'otra.jpg' }],
      existingCount: 1,
      existingKeys: [keyFor(PROJECT_ID, 'a.jpg')],
      nextOrden: 1,
    });
    expect(duplicate).toEqual({ ok: false, error: 'Hay fotos duplicadas' });
  });

  it('resuelve tipos de imagen permitidos', () => {
    expect(resolvePendienteImageContentType('foto.jpg', 'image/jpeg')).toBe('image/jpeg');
    expect(resolvePendienteImageContentType('foto.HEIC', '')).toBe('image/heic');
    expect(resolvePendienteImageContentType('plano.pdf', 'application/pdf')).toBeNull();
    expect(resolvePendienteImageContentType('foto.jpg', 'image/jpg')).toBe('image/jpeg');
  });
});

describe('fechas y esquema de pendientes', () => {
  it('formatea la fecha de calendario y marca vencidos', () => {
    expect(formatCalendarDate('2026-10-25')).toBe('25/10/2026');
    expect(formatCalendarDate('2026-10-25T00:00:00.000Z')).toBe('25/10/2026');
    expect(isOverdue('2026-10-24', 'pendiente', '2026-10-25')).toBe(true);
    expect(isOverdue('2026-10-24', 'completado', '2026-10-25')).toBe(false);
    expect(isOverdue('2026-10-25', 'pendiente', '2026-10-25')).toBe(false);
  });

  it('exige título y fecha, y acepta fotos opcionales', () => {
    const valid = createPendienteSchema.safeParse({
      titulo: 'Revisar revoque',
      descripcion: 'Falta el detalle del encuentro',
      fechaVencimiento: '2026-11-02',
      fotos: [{ r2Key: keyFor(PROJECT_ID), nombre: 'encuentro.jpg' }],
    });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.estado).toBe('pendiente');

    expect(createPendienteSchema.safeParse({
      titulo: '',
      fechaVencimiento: '2026-11-02',
    }).success).toBe(false);

    expect(addPendienteFotosSchema.safeParse({ fotos: [] }).success).toBe(false);
    const invalidEstado = updatePendienteSchema.safeParse({ estado: 'abierto' });
    expect(invalidEstado.success).toBe(false);
    if (!invalidEstado.success) {
      expect(invalidEstado.error.issues[0]?.message).toBe('Estado inválido');
    }
  });
});
