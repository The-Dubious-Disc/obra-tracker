import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => import('../helpers/nextHeaders'));

const findProject = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: { query: { proyectos: { findFirst: findProject } } },
}));

vi.mock('@/lib/services/projectService', () => ({
  getProjectPendientes: vi.fn(),
  getProjectPendientesConFotos: vi.fn(),
  createPendiente: vi.fn(),
  updatePendiente: vi.fn(),
  deletePendiente: vi.fn(),
  getPendienteById: vi.fn(),
  getProjectMemberDisplayName: vi.fn(),
}));

vi.mock('@/lib/services/authService', () => ({
  checkProjectAccess: vi.fn(),
}));

vi.mock('@/lib/services/r2', () => ({
  getPresignedDownloadUrl: vi.fn(),
  getObjectBytes: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock('@/lib/pendientes/pdf', async () => {
  const actual = await vi.importActual<typeof import('@/lib/pendientes/pdf')>('@/lib/pendientes/pdf');
  return {
    ...actual,
    buildPendientesPdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])),
  };
});

import { checkProjectAccess } from '@/lib/services/authService';
import {
  createPendiente,
  getPendienteById,
  getProjectMemberDisplayName,
  getProjectPendientesConFotos,
  updatePendiente,
} from '@/lib/services/projectService';
import { getObjectBytes } from '@/lib/services/r2';
import { buildPendientesPdf } from '@/lib/pendientes/pdf';
import { resetRequestContext } from '../helpers/nextHeaders';
import { jsonRequest } from '../helpers/http';
import { POST as createPendienteRoute } from '@/app/api/projects/[id]/pendientes/route';
import { PATCH as updatePendienteRoute } from '@/app/api/pendientes/[id]/route';
import { GET as pdfRoute } from '@/app/api/projects/[id]/pendientes/pdf/route';

const ANA = '11111111-1111-4111-8111-111111111111';
const BRUNO = '22222222-2222-4222-8222-222222222222';
const projectParams = { params: Promise.resolve({ id: 'p1' }) };
const pendienteParams = { params: Promise.resolve({ id: 'pen-1' }) };

const checkProjectAccessMock = vi.mocked(checkProjectAccess);
const createPendienteMock = vi.mocked(createPendiente);
const updatePendienteMock = vi.mocked(updatePendiente);
const getPendienteByIdMock = vi.mocked(getPendienteById);
const listMock = vi.mocked(getProjectPendientesConFotos);
const memberNameMock = vi.mocked(getProjectMemberDisplayName);
const buildPdfMock = vi.mocked(buildPendientesPdf);
const getObjectBytesMock = vi.mocked(getObjectBytes);

const abiertos = [
  {
    id: 'a',
    titulo: 'Muro',
    descripcion: 'Este',
    estado: 'pendiente' as const,
    responsableUsuarioId: ANA,
    responsableConstructor: false,
    responsableNombre: 'Ana',
    responsableEmail: 'ana@obra.test',
    fotos: [],
  },
  {
    id: 'c',
    titulo: 'Losa',
    descripcion: null,
    estado: 'pendiente' as const,
    responsableUsuarioId: null,
    responsableConstructor: true,
    responsableNombre: null,
    responsableEmail: null,
    fotos: [],
  },
  {
    id: 'n',
    titulo: 'Pintura',
    descripcion: 'Sin dueño',
    estado: 'pendiente' as const,
    responsableUsuarioId: null,
    responsableConstructor: false,
    responsableNombre: null,
    responsableEmail: null,
    fotos: [],
  },
  {
    id: 'x',
    titulo: 'Cerrado',
    descripcion: 'No',
    estado: 'completado' as const,
    responsableUsuarioId: null,
    responsableConstructor: true,
    responsableNombre: null,
    responsableEmail: null,
    fotos: [{ r2Key: 'obratracker/projects/p1/pendientes/cerrada.jpg', nombre: 'cerrada.jpg' }],
  },
];

beforeEach(() => {
  resetRequestContext({ 'x-user-id': 'u1' });
  checkProjectAccessMock.mockReset();
  createPendienteMock.mockReset();
  updatePendienteMock.mockReset();
  getPendienteByIdMock.mockReset();
  listMock.mockReset();
  memberNameMock.mockReset();
  buildPdfMock.mockClear();
  getObjectBytesMock.mockReset();
  findProject.mockReset();
  checkProjectAccessMock.mockResolvedValue(true);
  findProject.mockResolvedValue({ nombre: 'Casa Norte' });
  listMock.mockResolvedValue(abiertos as never);
  memberNameMock.mockResolvedValue(null);
});

describe('API de responsable en pendientes', () => {
  it('guarda Constructor o una persona y rechaza quien no tiene acceso', async () => {
    createPendienteMock.mockResolvedValue({ success: true, pendienteId: 'pen-2' });
    const creado = await createPendienteRoute(jsonRequest('http://localhost/api/projects/p1/pendientes', {
      titulo: 'Encofrado',
      responsable: { tipo: 'constructor' },
    }), projectParams);
    expect(creado.status).toBe(200);
    expect(createPendienteMock).toHaveBeenCalledWith(expect.objectContaining({
      proyectoId: 'p1',
      titulo: 'Encofrado',
      responsable: { tipo: 'constructor' },
    }));

    createPendienteMock.mockResolvedValue({
      success: false,
      error: 'El responsable no tiene acceso al proyecto',
      status: 400,
    });
    const ajeno = await createPendienteRoute(jsonRequest('http://localhost/api/projects/p1/pendientes', {
      titulo: 'Encofrado',
      responsable: { tipo: 'usuario', usuarioId: BRUNO },
    }), projectParams);
    expect(ajeno.status).toBe(400);
    await expect(ajeno.json()).resolves.toEqual({ error: 'El responsable no tiene acceso al proyecto' });

    const invalido = await createPendienteRoute(jsonRequest('http://localhost/api/projects/p1/pendientes', {
      titulo: 'Encofrado',
      responsable: { tipo: 'usuario', usuarioId: 'no' },
    }), projectParams);
    expect(invalido.status).toBe(400);
    expect(createPendienteMock).toHaveBeenCalledTimes(2);
  });

  it('edita o limpia el responsable sin exigirlo en un cambio de estado', async () => {
    getPendienteByIdMock.mockResolvedValue({
      id: 'pen-1',
      proyectoId: 'p1',
      responsableUsuarioId: ANA,
    } as never);
    updatePendienteMock.mockResolvedValue({ success: true });

    const estado = await updatePendienteRoute(jsonRequest('http://localhost/api/pendientes/pen-1', {
      estado: 'completado',
    }, { method: 'PATCH' }), pendienteParams);
    expect(estado.status).toBe(200);
    expect(updatePendienteMock).toHaveBeenCalledWith('pen-1', {
      titulo: undefined,
      descripcion: undefined,
      estado: 'completado',
    }, {
      proyectoId: 'p1',
      responsableUsuarioId: ANA,
    });

    const limpia = await updatePendienteRoute(jsonRequest('http://localhost/api/pendientes/pen-1', {
      responsable: null,
    }, { method: 'PATCH' }), pendienteParams);
    expect(limpia.status).toBe(200);
    expect(updatePendienteMock).toHaveBeenLastCalledWith('pen-1', {
      titulo: undefined,
      descripcion: undefined,
      estado: undefined,
      responsable: null,
    }, {
      proyectoId: 'p1',
      responsableUsuarioId: ANA,
    });

    updatePendienteMock.mockResolvedValue({
      success: false,
      error: 'El responsable no tiene acceso al proyecto',
      status: 400,
    });
    const ajeno = await updatePendienteRoute(jsonRequest('http://localhost/api/pendientes/pen-1', {
      responsable: { tipo: 'usuario', usuarioId: BRUNO },
    }, { method: 'PATCH' }), pendienteParams);
    expect(ajeno.status).toBe(400);
  });

  it('exporta todos los abiertos o solo los de un responsable', async () => {
    const todos = await pdfRoute(new NextRequest('http://localhost/api/projects/p1/pendientes/pdf'), projectParams);
    expect(todos.status).toBe(200);
    expect(todos.headers.get('Content-Type')).toBe('application/pdf');
    expect(listMock).toHaveBeenCalledWith('p1', true);
    expect(getObjectBytesMock).not.toHaveBeenCalled();
    expect(buildPdfMock).toHaveBeenCalledWith(expect.objectContaining({
      proyectoNombre: 'Casa Norte',
      items: [
        expect.objectContaining({ titulo: 'Muro', responsable: 'Ana' }),
        expect.objectContaining({ titulo: 'Losa', responsable: 'Constructor' }),
        expect.objectContaining({ titulo: 'Pintura', responsable: null }),
      ],
    }));
    expect(buildPdfMock.mock.calls[0][0]).not.toHaveProperty('filtroResponsable');

    buildPdfMock.mockClear();
    const obra = await pdfRoute(
      new NextRequest('http://localhost/api/projects/p1/pendientes/pdf?responsable=constructor'),
      projectParams,
    );
    expect(obra.status).toBe(200);
    expect(buildPdfMock).toHaveBeenCalledWith(expect.objectContaining({
      filtroResponsable: 'Constructor',
      items: [expect.objectContaining({ titulo: 'Losa', responsable: 'Constructor' })],
    }));

    buildPdfMock.mockClear();
    const persona = await pdfRoute(
      new NextRequest(`http://localhost/api/projects/p1/pendientes/pdf?responsable=${ANA}`),
      projectParams,
    );
    expect(persona.status).toBe(200);
    expect(memberNameMock).not.toHaveBeenCalled();
    expect(buildPdfMock).toHaveBeenCalledWith(expect.objectContaining({
      filtroResponsable: 'Ana',
      items: [expect.objectContaining({ titulo: 'Muro' })],
    }));

    buildPdfMock.mockClear();
    const nadie = await pdfRoute(
      new NextRequest('http://localhost/api/projects/p1/pendientes/pdf?responsable=sin-asignar'),
      projectParams,
    );
    expect(nadie.status).toBe(200);
    expect(buildPdfMock).toHaveBeenCalledWith(expect.objectContaining({
      filtroResponsable: 'Sin responsable',
      items: [expect.objectContaining({ titulo: 'Pintura', responsable: null })],
    }));

    buildPdfMock.mockClear();
    memberNameMock.mockResolvedValue('Bruno');
    const miembro = await pdfRoute(
      new NextRequest(`http://localhost/api/projects/p1/pendientes/pdf?responsable=${BRUNO}`),
      projectParams,
    );
    expect(miembro.status).toBe(200);
    expect(buildPdfMock).toHaveBeenCalledWith(expect.objectContaining({
      filtroResponsable: 'Bruno',
      items: [],
    }));

    const invalido = await pdfRoute(
      new NextRequest('http://localhost/api/projects/p1/pendientes/pdf?responsable=equipo'),
      projectParams,
    );
    expect(invalido.status).toBe(400);
    await expect(invalido.json()).resolves.toEqual({ error: 'Responsable inválido' });

    memberNameMock.mockResolvedValue(null);
    const ajeno = await pdfRoute(
      new NextRequest('http://localhost/api/projects/p1/pendientes/pdf?responsable=33333333-3333-4333-8333-333333333333'),
      projectParams,
    );
    expect(ajeno.status).toBe(400);
    await expect(ajeno.json()).resolves.toEqual({ error: 'El responsable no tiene acceso al proyecto' });
    expect(buildPdfMock).toHaveBeenCalledTimes(1);
  });
});
