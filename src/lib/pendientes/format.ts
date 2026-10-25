export function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function todayIsoDate(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function isOverdue(
  fecha: string | null | undefined,
  estado: string | null | undefined,
  hoy = todayIsoDate(),
): boolean {
  if (estado === 'completado' || !fecha) return false;
  const iso = fecha.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return iso < hoy;
}

export function estadoPendienteLabel(estado: string | null | undefined): string {
  return estado === 'completado' ? 'Completado' : 'Pendiente';
}
