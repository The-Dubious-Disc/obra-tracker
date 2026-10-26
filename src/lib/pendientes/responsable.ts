export const RESPONSABLE_CONSTRUCTOR = 'constructor';
export const RESPONSABLE_SIN_ASIGNAR = 'sin-asignar';
export const RESPONSABLE_TODOS = 'todos';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ResponsableAsignacion =
  | { tipo: 'constructor' }
  | { tipo: 'usuario'; usuarioId: string };

export type PdfResponsableFiltro =
  | { tipo: 'todos' }
  | { tipo: 'constructor' }
  | { tipo: 'sin_asignar' }
  | { tipo: 'usuario'; usuarioId: string };

export interface ResponsableOpcion {
  usuarioId: string;
  label: string;
}

export interface ResponsableEtiquetaInput {
  responsableConstructor?: boolean | null;
  responsableNombre?: string | null;
  responsableEmail?: string | null;
}

export function responsableLabel(input: ResponsableEtiquetaInput): string | null {
  if (input.responsableConstructor) return 'Constructor';
  const nombre = input.responsableNombre?.trim() ?? '';
  if (nombre) return nombre;
  const email = input.responsableEmail?.trim() ?? '';
  return email || null;
}

export function responsableSelectValue(input: {
  responsableConstructor?: boolean | null;
  responsableUsuarioId?: string | null;
} | null | undefined): string {
  if (!input) return '';
  if (input.responsableConstructor) return RESPONSABLE_CONSTRUCTOR;
  return input.responsableUsuarioId ?? '';
}

export function responsablePayload(value: string): ResponsableAsignacion | null {
  if (!value) return null;
  if (value === RESPONSABLE_CONSTRUCTOR) return { tipo: 'constructor' };
  return { tipo: 'usuario', usuarioId: value };
}

interface MiembroResponsable {
  usuario?: {
    id?: string | null;
    nombre?: string | null;
    email?: string | null;
  } | null;
}

export function opcionesResponsable(miembros: MiembroResponsable[]): ResponsableOpcion[] {
  const parsed = miembros.flatMap((miembro) => {
    const usuario = miembro.usuario;
    const usuarioId = usuario?.id?.trim() ?? '';
    if (!usuarioId) return [];
    const nombre = usuario?.nombre?.trim() ?? '';
    const email = usuario?.email?.trim() ?? '';
    const label = nombre || email;
    if (!label) return [];
    return [{ usuarioId, label, email }];
  });

  const counts = new Map<string, number>();
  for (const item of parsed) {
    counts.set(item.label, (counts.get(item.label) ?? 0) + 1);
  }

  const opciones = parsed.map((item) => ({
    usuarioId: item.usuarioId,
    label: (counts.get(item.label) ?? 0) > 1 && item.email && item.label !== item.email
      ? `${item.label} (${item.email})`
      : item.label,
  }));

  opciones.sort((a, b) => a.label.localeCompare(b.label, 'es'));

  const unique = new Map<string, ResponsableOpcion>();
  for (const opcion of opciones) {
    if (!unique.has(opcion.usuarioId)) unique.set(opcion.usuarioId, opcion);
  }
  return [...unique.values()];
}

export function conAsignadoActual(
  opciones: ResponsableOpcion[],
  actual: ResponsableOpcion | null | undefined,
): ResponsableOpcion[] {
  if (!actual?.usuarioId) return opciones;
  if (opciones.some((opcion) => opcion.usuarioId === actual.usuarioId)) return opciones;
  return [...opciones, actual].sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

export function parsePdfResponsableFiltro(
  raw: string | null | undefined,
): { ok: true; value: PdfResponsableFiltro } | { ok: false; error: string } {
  const value = raw?.trim() ?? '';
  if (!value || value === RESPONSABLE_TODOS) return { ok: true, value: { tipo: 'todos' } };
  if (value === RESPONSABLE_CONSTRUCTOR) return { ok: true, value: { tipo: 'constructor' } };
  if (value === RESPONSABLE_SIN_ASIGNAR) return { ok: true, value: { tipo: 'sin_asignar' } };
  if (UUID_RE.test(value)) return { ok: true, value: { tipo: 'usuario', usuarioId: value } };
  return { ok: false, error: 'Responsable inválido' };
}

export interface PendienteResponsableRow {
  estado: string;
  responsableConstructor?: boolean | null;
  responsableUsuarioId?: string | null;
}

export function filtrarPendientesPorResponsable<T extends PendienteResponsableRow>(
  items: T[],
  filtro: PdfResponsableFiltro,
): T[] {
  const abiertos = items.filter((item) => item.estado === 'pendiente');
  if (filtro.tipo === 'todos') return abiertos;
  if (filtro.tipo === 'constructor') {
    return abiertos.filter((item) => item.responsableConstructor === true);
  }
  if (filtro.tipo === 'sin_asignar') {
    return abiertos.filter((item) => !item.responsableConstructor && !item.responsableUsuarioId);
  }
  return abiertos.filter((item) => (
    item.responsableUsuarioId === filtro.usuarioId && item.responsableConstructor !== true
  ));
}
