import { describe, expect, it } from 'vitest';
import { createPendienteSchema, updatePendienteSchema } from '@/lib/schemas';
import {
  RESPONSABLE_CONSTRUCTOR,
  RESPONSABLE_SIN_ASIGNAR,
  conAsignadoActual,
  filtrarPendientesPorResponsable,
  opcionesResponsable,
  parsePdfResponsableFiltro,
  responsableLabel,
  responsablePayload,
  responsableSelectValue,
} from '@/lib/pendientes/responsable';

const ANA = '11111111-1111-4111-8111-111111111111';
const BRUNO = '22222222-2222-4222-8222-222222222222';

const items = [
  { id: 'a', estado: 'pendiente', responsableConstructor: false, responsableUsuarioId: ANA, titulo: 'Ana' },
  { id: 'c', estado: 'pendiente', responsableConstructor: true, responsableUsuarioId: null, titulo: 'Obra' },
  { id: 'n', estado: 'pendiente', responsableConstructor: false, responsableUsuarioId: null, titulo: 'Nadie' },
  { id: 'x', estado: 'completado', responsableConstructor: true, responsableUsuarioId: null, titulo: 'Cerrado' },
];

describe('responsable de un pendiente', () => {
  it('acepta vacío, Constructor o un usuario y rechaza un id inválido', () => {
    const vacio = createPendienteSchema.safeParse({ titulo: 'Revoque' });
    expect(vacio.success).toBe(true);
    if (vacio.success) expect(vacio.data.responsable).toBeUndefined();

    const sinAsignar = createPendienteSchema.safeParse({ titulo: 'Revoque', responsable: null });
    expect(sinAsignar.success).toBe(true);
    if (sinAsignar.success) expect(sinAsignar.data.responsable).toBeNull();

    const constructor = updatePendienteSchema.safeParse({ responsable: { tipo: 'constructor' } });
    expect(constructor.success).toBe(true);

    const usuario = updatePendienteSchema.safeParse({
      responsable: { tipo: 'usuario', usuarioId: ANA },
    });
    expect(usuario.success).toBe(true);

    const soloEstado = updatePendienteSchema.safeParse({ estado: 'completado' });
    expect(soloEstado.success).toBe(true);
    if (soloEstado.success) expect(soloEstado.data.responsable).toBeUndefined();

    expect(createPendienteSchema.safeParse({
      titulo: 'Revoque',
      responsable: { tipo: 'usuario', usuarioId: 'no-es-uuid' },
    }).success).toBe(false);
    expect(updatePendienteSchema.safeParse({
      responsable: { tipo: 'equipo' },
    }).success).toBe(false);
  });

  it('muestra el nombre, el mail si no hay nombre, o Constructor', () => {
    expect(responsableLabel({
      responsableConstructor: false,
      responsableNombre: ' Ana ',
      responsableEmail: 'ana@obra.test',
    })).toBe('Ana');
    expect(responsableLabel({
      responsableConstructor: false,
      responsableNombre: '  ',
      responsableEmail: 'ana@obra.test',
    })).toBe('ana@obra.test');
    expect(responsableLabel({ responsableConstructor: true, responsableNombre: 'Ana' })).toBe('Constructor');
    expect(responsableLabel({ responsableConstructor: false, responsableNombre: null, responsableEmail: null })).toBeNull();
    expect(responsableSelectValue({ responsableConstructor: true, responsableUsuarioId: ANA })).toBe(RESPONSABLE_CONSTRUCTOR);
    expect(responsablePayload('')).toBeNull();
    expect(responsablePayload(RESPONSABLE_CONSTRUCTOR)).toEqual({ tipo: 'constructor' });
    expect(responsablePayload(ANA)).toEqual({ tipo: 'usuario', usuarioId: ANA });
  });

  it('arma el desplegable con quien tiene acceso al proyecto', () => {
    const opciones = opcionesResponsable([
      { usuario: { id: ANA, nombre: 'Ana', email: 'ana@obra.test' } },
      { usuario: { id: ANA, nombre: 'Ana', email: 'ana@obra.test' } },
      { usuario: { id: BRUNO, nombre: 'Ana', email: 'bruno@obra.test' } },
      { usuario: { id: '  ', nombre: 'Nadie', email: 'x@obra.test' } },
      { usuario: { id: 'u-mail', nombre: '   ', email: 'obra@cheto.club' } },
      { usuario: null },
    ]);

    expect(opciones).toEqual([
      { usuarioId: ANA, label: 'Ana (ana@obra.test)' },
      { usuarioId: BRUNO, label: 'Ana (bruno@obra.test)' },
      { usuarioId: 'u-mail', label: 'obra@cheto.club' },
    ]);

    expect(conAsignadoActual(opciones, { usuarioId: 'u9', label: 'Nico' })).toEqual([
      ...opciones.slice(0, 2),
      { usuarioId: 'u9', label: 'Nico' },
      opciones[2],
    ]);
    expect(conAsignadoActual(opciones, { usuarioId: ANA, label: 'Otra' })).toBe(opciones);
  });

  it('filtra el PDF por todos, Constructor, una persona o sin responsable', () => {
    expect(parsePdfResponsableFiltro(null)).toEqual({ ok: true, value: { tipo: 'todos' } });
    expect(parsePdfResponsableFiltro('  todos ')).toEqual({ ok: true, value: { tipo: 'todos' } });
    expect(parsePdfResponsableFiltro(RESPONSABLE_CONSTRUCTOR)).toEqual({ ok: true, value: { tipo: 'constructor' } });
    expect(parsePdfResponsableFiltro(RESPONSABLE_SIN_ASIGNAR)).toEqual({ ok: true, value: { tipo: 'sin_asignar' } });
    expect(parsePdfResponsableFiltro(ANA)).toEqual({ ok: true, value: { tipo: 'usuario', usuarioId: ANA } });
    expect(parsePdfResponsableFiltro('equipo')).toEqual({ ok: false, error: 'Responsable inválido' });

    const todos = parsePdfResponsableFiltro('todos');
    const constructor = parsePdfResponsableFiltro('constructor');
    const persona = parsePdfResponsableFiltro(ANA);
    const nadie = parsePdfResponsableFiltro('sin-asignar');
    if (!todos.ok || !constructor.ok || !persona.ok || !nadie.ok) throw new Error('filtro');

    expect(filtrarPendientesPorResponsable(items, todos.value).map((item) => item.id)).toEqual(['a', 'c', 'n']);
    expect(filtrarPendientesPorResponsable(items, constructor.value).map((item) => item.id)).toEqual(['c']);
    expect(filtrarPendientesPorResponsable(items, persona.value).map((item) => item.id)).toEqual(['a']);
    expect(filtrarPendientesPorResponsable(items, nadie.value).map((item) => item.id)).toEqual(['n']);
  });
});
