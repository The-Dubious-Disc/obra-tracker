import { describe, expect, it } from 'vitest';
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib';
import sharp from 'sharp';
import {
  buildPendientesPdf,
  detectImageKind,
  formatPdfExportDate,
  pdfFilename,
  pendientesAbiertos,
  toPdfImage,
} from '@/lib/pendientes/pdf';

const PNG_1X1 = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
));

function streamText(stream: unknown): string {
  if (!(stream instanceof PDFRawStream)) return '';
  const decoded = decodePDFRawStream(stream);
  const bytes = decoded.decode();
  return Buffer.from(bytes).toString('latin1');
}

function decodeUtf16be(hex: string): string {
  const bytes = Buffer.from(hex, 'hex');
  let out = '';
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    out += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
  }
  return out;
}

function parseToUnicode(cmap: string): Map<number, string> {
  const map = new Map<number, string>();
  const body = cmap.replace(/\r/g, '');

  for (const block of body.match(/beginbfchar[\s\S]*?endbfchar/g) ?? []) {
    for (const match of block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      map.set(parseInt(match[1], 16), decodeUtf16be(match[2]));
    }
  }

  for (const block of body.match(/beginbfrange[\s\S]*?endbfrange/g) ?? []) {
    for (const match of block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const start = parseInt(match[1], 16);
      const end = parseInt(match[2], 16);
      const first = decodeUtf16be(match[3]);
      const code = first.codePointAt(0) ?? 0;
      for (let index = 0; index <= end - start; index += 1) {
        map.set(start + index, String.fromCodePoint(code + index));
      }
    }
  }

  return map;
}

function decodePdfString(raw: string, unicode: Map<number, string>): string {
  let out = '';
  const hex = raw.match(/^<([0-9A-Fa-f]*)>$/);
  if (hex) {
    const digits = hex[1];
    for (let index = 0; index + 4 <= digits.length; index += 4) {
      const code = parseInt(digits.slice(index, index + 4), 16);
      out += unicode.get(code) ?? '';
    }
    return out;
  }

  if (raw.startsWith('(') && raw.endsWith(')')) {
    let text = '';
    const body = raw.slice(1, -1);
    for (let index = 0; index < body.length; index += 1) {
      const char = body[index];
      if (char !== '\\') {
        text += char;
        continue;
      }
      const next = body[index + 1];
      if (next === 'n') text += '\n';
      else if (next === 'r') text += '\r';
      else if (next === 't') text += '\t';
      else if (next === '(' || next === ')' || next === '\\') text += next;
      else if (next !== undefined && /[0-7]/.test(next)) {
        const octal = body.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0] ?? next;
        text += String.fromCharCode(parseInt(octal, 8));
        index += octal.length - 1;
      } else if (next !== undefined) text += next;
      index += 1;
    }
    return text;
  }

  return '';
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();
  const parts: string[] = [];

  for (const page of pages) {
    const resources = page.node.Resources();
    const fontDict = resources?.lookup(PDFName.of('Font'));
    const fontMaps = new Map<string, Map<number, string>>();
    if (fontDict instanceof PDFDict) {
      for (const [name, ref] of fontDict.entries()) {
        const font = page.node.context.lookup(ref);
        if (!(font instanceof PDFDict)) continue;
        const toUnicode = font.lookup(PDFName.of('ToUnicode'));
        if (!(toUnicode instanceof PDFRawStream)) continue;
        const key = name.toString().replace(/^\//, '');
        fontMaps.set(key, parseToUnicode(streamText(toUnicode)));
      }
    }

    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray
      ? contents.asArray()
      : contents ? [contents] : [];
    for (const entry of streams) {
      const stream = page.node.context.lookup(entry);
      const content = streamText(stream);
      if (!content) continue;
      const shown: string[] = [];
      let unicode = fontMaps.values().next().value ?? new Map<number, string>();
      const pattern = /\/([^\s<>\[\]()]+)[\s\d.]+Tf|(<[0-9A-Fa-f]*>|\((?:\\.|[^\\)])*\))\s*Tj|\[(.*?)\]\s*TJ/gs;
      for (const match of content.matchAll(pattern)) {
        if (match[1]) {
          unicode = fontMaps.get(match[1]) ?? unicode;
          continue;
        }
        if (match[2]) shown.push(decodePdfString(match[2], unicode));
        else if (match[3]) {
          for (const piece of match[3].match(/<[0-9A-Fa-f]*>|\((?:\\.|[^\\)])*\)/g) ?? []) {
            shown.push(decodePdfString(piece, unicode));
          }
        }
      }
      parts.push(shown.join(''));
    }
  }

  return parts.join('\n');
}

describe('informe PDF de pendientes', () => {
  it('arma un nombre de archivo seguro', () => {
    expect(pdfFilename('Punta Colorada')).toBe('pendientes-punta-colorada.pdf');
    expect(pdfFilename('Niño / Cañería')).toBe('pendientes-nino-caneria.pdf');
    expect(pdfFilename('***')).toBe('pendientes-proyecto.pdf');
  });

  it('formatea la fecha del encabezado como en el reporte', () => {
    expect(formatPdfExportDate(new Date('2026-10-25T15:00:00Z'))).toBe('25 oct 2026');
    expect(formatPdfExportDate(new Date('2026-10-25T02:30:00Z'))).toBe('24 oct 2026');
    expect(formatPdfExportDate(new Date('2026-01-05T15:00:00Z'))).toBe('5 ene 2026');
  });

  it('conserva JPEG y PNG tal como están y convierte otros formatos', async () => {
    expect(detectImageKind(PNG_1X1)).toBe('png');
    expect(await toPdfImage(new Uint8Array([1, 2, 3, 4]))).toBeNull();

    const png = await toPdfImage(PNG_1X1);
    expect(png?.kind).toBe('png');
    expect(png?.bytes).toBe(PNG_1X1);

    const jpeg = new Uint8Array(await sharp({
      create: { width: 8, height: 6, channels: 3, background: { r: 180, g: 170, b: 160 } },
    }).jpeg({ quality: 80 }).toBuffer());
    const preparedJpeg = await toPdfImage(jpeg);
    expect(preparedJpeg?.kind).toBe('jpg');
    expect(preparedJpeg?.bytes).toBe(jpeg);

    const webp = new Uint8Array(await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 20, g: 40, b: 80 } },
    }).webp().toBuffer());
    const preparedWebp = await toPdfImage(webp);
    expect(preparedWebp?.kind).toBe('jpg');
    expect(preparedWebp && detectImageKind(preparedWebp.bytes)).toBe('jpg');
  });

  it('arma el reporte con título, número, detalle y epígrafe de foto, sin estado', async () => {
    const detalle = 'Se observa falta de revoque en el muro este, especialmente en la zona media.';
    const pdf = await buildPendientesPdf({
      proyectoNombre: 'Punta Colorada',
      generadoEl: '25 oct 2026',
      items: [
        {
          titulo: 'Falta revoque en muro este',
          descripcion: detalle,
          estado: 'pendiente',
          fotos: [
            { nombre: 'muro-anotado.jpg', bytes: PNG_1X1, contentType: 'image/png' },
            { nombre: 'rota.bin', bytes: Uint8Array.from([9, 9, 9]), contentType: 'application/octet-stream' },
          ],
        },
        {
          titulo: 'Pintura terminada',
          descripcion: 'Este pendiente ya se cerró y no debe salir.',
          estado: 'completado',
          fotos: [{ nombre: 'pintura.png', bytes: PNG_1X1, contentType: 'image/png' }],
        },
      ],
    });

    const loaded = await PDFDocument.load(pdf);
    const text = await extractPdfText(pdf);
    expect(Buffer.from(pdf).subarray(0, 5).toString()).toBe('%PDF-');
    expect(loaded.getTitle()).toContain('Punta Colorada');
    expect(loaded.getSubject()).toBe('Reporte de pendientes');
    expect(loaded.getPageCount()).toBe(1);
    expect(text).toContain('Reporte de pendientes');
    expect(text).toContain('Punta Colorada');
    expect(text).toContain('25 oct 2026');
    expect(text).toContain('01');
    expect(text).toContain('Falta revoque en muro este');
    expect(text).toContain('Se observa falta de revoque');
    expect(text).toContain('FOTO 1');
    expect(text).toContain('FOTO 2');
    expect(text).not.toContain('Estado');
    expect(text).not.toContain('Pendiente');
    expect(text).not.toContain('Pintura terminada');
    expect(text).not.toContain('muro-anotado');
  });

  it('incluye título, varias páginas y la foto embebida', async () => {
    const detalle = 'Detalle del encuentro de muro y losa. '.repeat(40);
    const sinFoto = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 oct 2026',
      items: [{
        titulo: 'Revisión de cañerías',
        descripcion: 'Sin fotos todavía',
        estado: 'pendiente',
        fotos: [],
      }],
    });

    const conFoto = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 oct 2026',
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
      generadoEl: '25 oct 2026',
      items: [],
    });
    const vacioText = await extractPdfText(vacio);
    expect((await PDFDocument.load(vacio)).getPageCount()).toBe(1);
    expect(vacioText).toContain('No hay pendientes abiertos');
    expect(vacioText).not.toMatch(/Estado/i);
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
      generadoEl: '25 oct 2026',
      items: abiertos,
    });
    const conCompletados = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 oct 2026',
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
      generadoEl: '25 oct 2026',
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

    const text = await extractPdfText(conCompletados);
    expect(text).toContain('Pendiente 1');
    expect(text).not.toContain('Pintura terminada');
    expect(text).not.toContain('Estado');
  });
});
