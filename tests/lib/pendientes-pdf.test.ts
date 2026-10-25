import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildPendientesPdf, detectImageKind, pdfFilename, toPdfImage } from '@/lib/pendientes/pdf';

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
      hoy: '2026-10-25',
      items: [{
        titulo: 'Revisión de cañerías',
        descripcion: 'Sin fotos todavía',
        fechaVencimiento: '2026-10-20',
        estado: 'pendiente',
        fotos: [],
      }],
    });

    const conFoto = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 de octubre de 2026, 18:30',
      hoy: '2026-10-25',
      items: [
        {
          titulo: 'Revisión de cañerías',
          descripcion: 'Pérdida en el encuentro',
          fechaVencimiento: '2026-10-20',
          estado: 'pendiente',
          fotos: [
            { nombre: 'perdida.png', bytes: PNG_1X1, contentType: 'image/png' },
            { nombre: 'rota.bin', bytes: Uint8Array.from([9, 9, 9]), contentType: 'application/octet-stream' },
          ],
        },
        ...Array.from({ length: 12 }, (_, index) => ({
          titulo: `Pendiente ${index + 2}`,
          descripcion: detalle,
          fechaVencimiento: '2026-12-01',
          estado: index % 2 === 0 ? 'completado' as const : 'pendiente' as const,
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
      hoy: '2026-10-25',
      items: [],
    });
    expect((await PDFDocument.load(vacio)).getPageCount()).toBe(1);
  });
});
