import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => import('../helpers/nextHeaders'));

vi.mock('@/lib/services/projectService', () => ({
  getPendienteById: vi.fn(),
  listPendienteFotos: vi.fn(),
  replacePendienteFoto: vi.fn(),
  deletePendienteFoto: vi.fn(),
}));

vi.mock('@/lib/services/authService', () => ({
  checkProjectAccess: vi.fn(),
}));

vi.mock('@/lib/services/r2', () => ({
  deleteObject: vi.fn(),
  getObjectBytes: vi.fn(),
}));

import { checkProjectAccess } from '@/lib/services/authService';
import {
  deletePendienteFoto,
  getPendienteById,
  listPendienteFotos,
  replacePendienteFoto,
} from '@/lib/services/projectService';
import { deleteObject, getObjectBytes } from '@/lib/services/r2';
import { resetRequestContext } from '../helpers/nextHeaders';
import { jsonRequest } from '../helpers/http';
import {
  DELETE as deleteFoto,
  GET as readFoto,
  PATCH as replaceFoto,
} from '@/app/api/pendientes/[id]/fotos/[fotoId]/route';

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const OLD_KEY = `obratracker/projects/${PROJECT_ID}/pendientes/170-vieja.jpg`;
const NEW_KEY = `obratracker/projects/${PROJECT_ID}/pendientes/171-marcada.jpg`;

const getPendienteByIdMock = vi.mocked(getPendienteById);
const listPendienteFotosMock = vi.mocked(listPendienteFotos);
const replacePendienteFotoMock = vi.mocked(replacePendienteFoto);
const deletePendienteFotoMock = vi.mocked(deletePendienteFoto);
const checkProjectAccessMock = vi.mocked(checkProjectAccess);
const deleteObjectMock = vi.mocked(deleteObject);
const getObjectBytesMock = vi.mocked(getObjectBytes);

const params = { params: Promise.resolve({ id: 'pen-1', fotoId: 'foto-1' }) };

beforeEach(() => {
  resetRequestContext({ 'x-user-id': 'u1' });
  getPendienteByIdMock.mockReset();
  listPendienteFotosMock.mockReset();
  replacePendienteFotoMock.mockReset();
  deletePendienteFotoMock.mockReset();
  checkProjectAccessMock.mockReset();
  deleteObjectMock.mockReset();
  getObjectBytesMock.mockReset();
  getPendienteByIdMock.mockResolvedValue({ id: 'pen-1', proyectoId: PROJECT_ID } as never);
  checkProjectAccessMock.mockResolvedValue(true);
});

describe('foto marcada de un pendiente', () => {
  it('exige sesión y membresía', async () => {
    resetRequestContext();
    expect((await replaceFoto(jsonRequest('http://localhost/foto', { r2Key: NEW_KEY, nombre: 'a.jpg' }, { method: 'PATCH' }), params)).status).toBe(401);

    resetRequestContext({ 'x-user-id': 'u1' });
    checkProjectAccessMock.mockResolvedValue(false);
    expect((await readFoto(new NextRequest('http://localhost/foto'), params)).status).toBe(403);
  });

  it('rechaza una clave de otro proyecto y reemplaza la foto guardada', async () => {
    const foreign = await replaceFoto(jsonRequest('http://localhost/foto', {
      r2Key: `obratracker/projects/${OTHER_PROJECT_ID}/pendientes/ajena.jpg`,
      nombre: 'ajena.jpg',
    }, { method: 'PATCH' }), params);
    expect(foreign.status).toBe(400);
    expect(replacePendienteFotoMock).not.toHaveBeenCalled();

    listPendienteFotosMock.mockResolvedValue([
      { id: 'foto-1', r2Key: OLD_KEY },
      { id: 'foto-2', r2Key: NEW_KEY },
    ] as never);
    const duplicate = await replaceFoto(jsonRequest('http://localhost/foto', {
      r2Key: NEW_KEY,
      nombre: 'otra.jpg',
    }, { method: 'PATCH' }), params);
    expect(duplicate.status).toBe(400);
    expect(replacePendienteFotoMock).not.toHaveBeenCalled();

    listPendienteFotosMock.mockResolvedValue([{ id: 'foto-1', r2Key: OLD_KEY }] as never);
    replacePendienteFotoMock.mockResolvedValue({ success: true, previousKey: OLD_KEY });
    deleteObjectMock.mockRejectedValue(new Error('r2'));

    const replaced = await replaceFoto(jsonRequest('http://localhost/foto', {
      r2Key: NEW_KEY,
      nombre: '  frente marcada.jpg  ',
    }, { method: 'PATCH' }), params);
    expect(replaced.status).toBe(200);
    expect(replacePendienteFotoMock).toHaveBeenCalledWith('pen-1', 'foto-1', {
      r2Key: NEW_KEY,
      nombre: 'frente marcada.jpg',
    });
    expect(deleteObjectMock).toHaveBeenCalledWith(OLD_KEY);
  });

  it('devuelve los bytes de la foto para marcarla sin salir del origen', async () => {
    listPendienteFotosMock.mockResolvedValue([{ id: 'foto-1', r2Key: OLD_KEY, nombre: 'vieja.jpg' }] as never);
    getObjectBytesMock.mockResolvedValue({ bytes: Uint8Array.from([1, 2, 3, 4]), contentType: 'image/jpeg' });

    const response = await readFoto(new NextRequest('http://localhost/foto'), params);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/jpeg');
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([1, 2, 3, 4]);

    listPendienteFotosMock.mockResolvedValue([]);
    expect((await readFoto(new NextRequest('http://localhost/foto'), params)).status).toBe(404);
  });

  it('sigue borrando la foto y su objeto', async () => {
    deletePendienteFotoMock.mockResolvedValue({ success: true, r2Key: OLD_KEY });
    const response = await deleteFoto(new NextRequest('http://localhost/foto', { method: 'DELETE' }), params);
    expect(response.status).toBe(200);
    expect(deleteObjectMock).toHaveBeenCalledWith(OLD_KEY);
  });
});
