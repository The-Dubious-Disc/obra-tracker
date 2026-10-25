export function estadoPendienteLabel(estado: string | null | undefined): string {
  return estado === 'completado' ? 'Completado' : 'Pendiente';
}
