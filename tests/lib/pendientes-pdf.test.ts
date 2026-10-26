import { describe, expect, it } from 'vitest';
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib';
import sharp from 'sharp';
import { PDF_PHOTO_MAX_EDGE } from '@/lib/pendientes/imageSize';
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

/** Enough body text to spill one item onto a second page, without the old six-item fixture. */
const DETALLE_LARGO = 'Detalle del encuentro de muro y losa. '.repeat(120);

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

async function placedPhotoSizes(bytes: Uint8Array): Promise<Array<{
  pixelWidth: number;
  pixelHeight: number;
  drawWidth: number;
  drawHeight: number;
}>> {
  const pdf = await PDFDocument.load(bytes);
  const pixels: Array<{ pixelWidth: number; pixelHeight: number }> = [];
  const drawn: Array<{ drawWidth: number; drawHeight: number }> = [];

  for (const page of pdf.getPages()) {
    const xobjects = page.node.Resources()?.lookup(PDFName.of('XObject'));
    if (xobjects instanceof PDFDict) {
      for (const [, ref] of xobjects.entries()) {
        const obj = page.node.context.lookup(ref);
        if (!(obj instanceof PDFRawStream)) continue;
        if (String(obj.dict.lookup(PDFName.of('Subtype'))) !== '/Image') continue;
        const width = obj.dict.lookup(PDFName.of('Width'));
        const height = obj.dict.lookup(PDFName.of('Height'));
        if (!(width instanceof PDFNumber) || !(height instanceof PDFNumber)) continue;
        pixels.push({ pixelWidth: width.asNumber(), pixelHeight: height.asNumber() });
      }
    }

    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    for (const entry of streams) {
      const content = streamText(page.node.context.lookup(entry));
      for (const match of content.matchAll(/([0-9.]+) 0 0 ([0-9.]+) 0 0 cm/g)) {
        const drawWidth = Number(match[1]);
        const drawHeight = Number(match[2]);
        if (drawWidth === 1 && drawHeight === 1) continue;
        drawn.push({ drawWidth, drawHeight });
      }
    }
  }

  return pixels.map((pixel, index) => ({ ...pixel, ...drawn[index] }));
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

  it('re-encoda JPEG, PNG y otros formatos en lugar de copiar los bytes', async () => {
    expect(detectImageKind(PNG_1X1)).toBe('png');
    expect(await toPdfImage(new Uint8Array([1, 2, 3, 4]))).toBeNull();

    const png = await toPdfImage(PNG_1X1);
    expect(png?.kind).toBe('jpg');
    expect(png && detectImageKind(png.bytes)).toBe('jpg');
    expect(png?.bytes).not.toEqual(PNG_1X1);

    const jpeg = new Uint8Array(await sharp({
      create: { width: 8, height: 6, channels: 3, background: { r: 180, g: 170, b: 160 } },
    }).jpeg({ quality: 80 }).toBuffer());
    const preparedJpeg = await toPdfImage(jpeg);
    expect(preparedJpeg?.kind).toBe('jpg');
    expect(preparedJpeg?.bytes).not.toEqual(jpeg);
    const jpegMeta = await sharp(Buffer.from(preparedJpeg!.bytes)).metadata();
    expect(jpegMeta.width).toBe(8);
    expect(jpegMeta.height).toBe(6);

    const webp = new Uint8Array(await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 20, g: 40, b: 80 } },
    }).webp().toBuffer());
    const preparedWebp = await toPdfImage(webp);
    expect(preparedWebp?.kind).toBe('jpg');
    expect(preparedWebp && detectImageKind(preparedWebp.bytes)).toBe('jpg');
  });

  it('mantiene verticales las fotos verticales, también con EXIF', async () => {
    const portrait = new Uint8Array(await sharp({
      create: { width: 20, height: 48, channels: 3, background: { r: 30, g: 60, b: 90 } },
    }).jpeg({ quality: 80 }).toBuffer());
    const preparedPortrait = await toPdfImage(portrait);
    expect(preparedPortrait?.kind).toBe('jpg');
    expect(preparedPortrait?.bytes).not.toEqual(portrait);
    const portraitMeta = await sharp(Buffer.from(preparedPortrait!.bytes)).metadata();
    expect(portraitMeta.width).toBe(20);
    expect(portraitMeta.height).toBe(48);

    const landscape = new Uint8Array(await sharp({
      create: { width: 48, height: 20, channels: 3, background: { r: 20, g: 140, b: 60 } },
    }).jpeg({ quality: 80 }).toBuffer());
    const preparedLandscape = await toPdfImage(landscape);
    expect(preparedLandscape?.bytes).not.toEqual(landscape);
    const landscapeMeta = await sharp(Buffer.from(preparedLandscape!.bytes)).metadata();
    expect(landscapeMeta.width).toBe(48);
    expect(landscapeMeta.height).toBe(20);

    const sensorLandscape = await sharp({
      create: { width: 48, height: 20, channels: 3, background: { r: 190, g: 40, b: 40 } },
    }).jpeg({ quality: 80 }).toBuffer();
    const exifPortrait = new Uint8Array(await sharp(sensorLandscape).withMetadata({ orientation: 6 }).toBuffer());
    const raw = await sharp(Buffer.from(exifPortrait)).metadata();
    expect(raw.orientation).toBe(6);
    expect(raw.width).toBeGreaterThan(raw.height ?? 0);

    const preparedExif = await toPdfImage(exifPortrait);
    expect(preparedExif?.kind).toBe('jpg');
    expect(preparedExif?.bytes).not.toBe(exifPortrait);
    const baked = await sharp(Buffer.from(preparedExif!.bytes)).metadata();
    expect(baked.height).toBeGreaterThan(baked.width ?? 0);
    expect(baked.orientation === undefined || baked.orientation === 1).toBe(true);

    const exifRotate270 = new Uint8Array(await sharp(sensorLandscape).withMetadata({ orientation: 8 }).toBuffer());
    const bakedRotate270 = await sharp(Buffer.from((await toPdfImage(exifRotate270))!.bytes)).metadata();
    expect(bakedRotate270.height).toBeGreaterThan(bakedRotate270.width ?? 0);

    const pdf = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 oct 2026',
      items: [{
        titulo: 'Foto vertical',
        descripcion: 'La vertical debe seguir vertical.',
        estado: 'pendiente',
        fotos: [
          { nombre: 'vertical.jpg', bytes: portrait },
          { nombre: 'exif.jpg', bytes: exifPortrait },
          { nombre: 'paisaje.jpg', bytes: landscape },
        ],
      }],
    });
    const placed = await placedPhotoSizes(pdf);
    expect(placed).toHaveLength(3);
    for (const photo of placed.slice(0, 2)) {
      expect(photo.pixelHeight).toBeGreaterThan(photo.pixelWidth);
      expect(photo.drawHeight).toBeGreaterThan(photo.drawWidth);
      expect(photo.drawHeight / photo.drawWidth).toBeCloseTo(photo.pixelHeight / photo.pixelWidth, 1);
    }
    expect(placed[2].pixelWidth).toBeGreaterThan(placed[2].pixelHeight);
    expect(placed[2].drawWidth).toBeGreaterThan(placed[2].drawHeight);
    expect(placed[2].drawHeight / placed[2].drawWidth).toBeCloseTo(placed[2].pixelHeight / placed[2].pixelWidth, 1);
  });

  it('achica las fotos grandes al embeberlas y no copia el original', async () => {
    const big = new Uint8Array(await sharp({
      create: {
        width: 2400,
        height: 1800,
        channels: 3,
        noise: { type: 'gaussian', mean: 128, sigma: 40 },
      },
    }).jpeg({ quality: 92 }).toBuffer());
    const prepared = await toPdfImage(big);
    expect(prepared?.kind).toBe('jpg');
    expect(prepared!.bytes).not.toEqual(big);
    expect(prepared!.bytes.byteLength).toBeLessThan(big.byteLength);
    const meta = await sharp(Buffer.from(prepared!.bytes)).metadata();
    expect(meta.width).toBe(PDF_PHOTO_MAX_EDGE);
    expect(meta.height).toBe(1200);
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(PDF_PHOTO_MAX_EDGE);

    const sensor = await sharp({
      create: { width: 2200, height: 1400, channels: 3, background: { r: 90, g: 110, b: 70 } },
    }).jpeg({ quality: 90 }).toBuffer();
    const exifTall = new Uint8Array(await sharp(sensor).withMetadata({ orientation: 6 }).toBuffer());
    const bakedTall = await sharp(Buffer.from((await toPdfImage(exifTall))!.bytes)).metadata();
    expect(bakedTall.height).toBeGreaterThan(bakedTall.width ?? 0);
    expect(Math.max(bakedTall.width ?? 0, bakedTall.height ?? 0)).toBeLessThanOrEqual(PDF_PHOTO_MAX_EDGE);
    expect(bakedTall.orientation === undefined || bakedTall.orientation === 1).toBe(true);

    const pdf = await buildPendientesPdf({
      proyectoNombre: 'Casa Norte',
      generadoEl: '25 oct 2026',
      items: [{
        titulo: 'Foto pesada',
        descripcion: 'El original no entra entero.',
        estado: 'pendiente',
        fotos: [{ nombre: 'obra.jpg', bytes: big }],
      }],
    });
    const placed = await placedPhotoSizes(pdf);
    expect(placed).toHaveLength(1);
    expect(placed[0].pixelWidth).toBe(PDF_PHOTO_MAX_EDGE);
    expect(placed[0].pixelHeight).toBe(1200);
    expect(pdf.byteLength).toBeLessThan(big.byteLength);
  }, 15_000);

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
        {
          titulo: 'Pendiente 2',
          descripcion: DETALLE_LARGO,
          estado: 'pendiente',
          fotos: [],
        },
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
  }, 15_000);

  it('omite los pendientes completados aunque el detalle sea largo', async () => {
    const abiertos = [{
      titulo: 'Pendiente 1',
      descripcion: DETALLE_LARGO,
      estado: 'pendiente' as const,
      fotos: [] as [],
    }];
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
          descripcion: DETALLE_LARGO,
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
        descripcion: DETALLE_LARGO,
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
  }, 15_000);
});
