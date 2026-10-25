import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildPendientesPdf, detectImageKind, pdfFilename, pendientesAbiertos, toPdfImage } from '@/lib/pendientes/pdf';

const PNG_1X1 = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
));

describe('informe PDF de pendientes', () => {
  it('arma un nombre de archivo seguro', () => {
    expect(pdfFilename('Punta Colorada')).toBe('pendientes-punta-colorada.pdf');
    expect(pdfFilename('Niño / Cañería')).toBe('pendientes-nino-caneria.pdf');
    expect(pdfFilename('***')).toBe('pendientes-proyecto.pdf');
  });

  it('reconoce png y descarta bytes que no son imagen', async () => {
    expect(detectImageKind(PNG_1X1)).toBe('png');
    expect(await toPdfImage(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    const prepared = await toPdfImage(PNG_1X1);
    expect(prepared?.kind).toBe('jpg');
  });

  it('incluye título, varias páginas y la foto embebida', async () => {
    const detalle = 'Detalle del encuentro de muro y losa. '.repeat(40);
    const sinFoto = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 de octubre de 2026, 18:30',
      items: [{
        titulo: 'Revisión de cañerías',
        descripcion: 'Sin fotos todavía',
        estado: 'pendiente',
        fotos: [],
      }],
    });

    const conFoto = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 de octubre de 2026, 18:30',
      items: [
        {
          titulo: 'Revisión de cañerías',
          descripcion: 'Pérdida en el encuentro',
          estado: 'pendiente',
          fotos: [
            { nombre: 'perdida.png', bytes: PNG_1X1, contentType: 'image/png' },
            { nombre: 'rota.bin', bytes: Uint8Array.from([9, 9, 9]), contentType: 'application/octet-stream' },
          ],
        },
        ...Array.from({ length: 6 }, (_, index) => ({
          titulo: `Pendiente ${index + 2}`,
          descripcion: detalle,
          estado: 'pendiente' as const,
          fotos: [],
        })),
      ],
    });

    const loaded = await PDFDocument.load(conFoto);
    expect(Buffer.from(conFoto).subarray(0, 5).toString()).toBe('%PDF-');
    expect(loaded.getTitle()).toContain('Casa Norte');
    expect(loaded.getPageCount()).toBeGreaterThan(1);
    expect(conFoto.length).toBeGreaterThan(sinFoto.length);

    const vacio = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 de octubre de 2026',
      items: [],
    });
    expect((await PDFDocument.load(vacio)).getPageCount()).toBe(1);
  });

  it('omite los pendientes completados aunque el detalle sea largo', async () => {
    const detalle = 'Detalle del encuentro de muro y losa. '.repeat(40);
    const abiertos = Array.from({ length: 6 }, (_, index) => ({
      titulo: `Pendiente ${index + 1}`,
      descripcion: detalle,
      estado: 'pendiente' as const,
      fotos: [] as [],
    }));
    const soloAbiertos = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 de octubre de 2026',
      items: abiertos,
    });
    const conCompletados = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 de octubre de 2026',
      items: [
        ...abiertos,
        {
          titulo: 'Pintura terminada',
          descripcion: detalle.repeat(4),
          estado: 'completado',
          fotos: [{ nombre: 'pintura.png', bytes: PNG_1X1, contentType: 'image/png' }],
        },
      ],
    });
    const soloCompletados = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 de octubre de 2026',
      items: [{
        titulo: 'Pintura terminada',
        descripcion: detalle.repeat(4),
        estado: 'completado',
        fotos: [{ nombre: 'pintura.png', bytes: PNG_1X1, contentType: 'image/png' }],
      }],
    });

    const paginasAbiertas = (await PDFDocument.load(soloAbiertos)).getPageCount();
    expect(paginasAbiertas).toBeGreaterThan(1);
    expect((await PDFDocument.load(conCompletados)).getPageCount()).toBe(paginasAbiertas);
    expect((await PDFDocument.load(soloCompletados)).getPageCount()).toBe(1);
    expect(soloCompletados.length).toBeLessThan(soloAbiertos.length);
    expect(pendientesAbiertos([
      { estado: 'completado', titulo: 'Cerrado' },
      { estado: 'pendiente', titulo: 'Abierto' },
    ])).toEqual([{ estado: 'pendiente', titulo: 'Abierto' }]);
  });
});
