import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { estadoPendienteLabel, formatCalendarDate, isOverdue } from '@/lib/pendientes/format';

export interface PdfFotoInput {
  nombre: string;
  bytes: Uint8Array;
  contentType?: string | null;
}

export interface PdfPendienteInput {
  titulo: string;
  descripcion: string | null;
  fechaVencimiento: string;
  estado: 'pendiente' | 'completado';
  fotos: PdfFotoInput[];
}

export interface PendientePdfInput {
  proyectoNombre: string;
  generadoEl: string;
  hoy: string;
  items: PdfPendienteInput[];
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const FOOTER_Y = 28;
const HEADER_BOTTOM = 92;

export function pdfFilename(proyectoNombre: string): string {
  const slug = proyectoNombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `pendientes-${slug || 'proyecto'}.pdf`;
}

export function detectImageKind(bytes: Uint8Array): 'jpg' | 'png' | 'other' {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
  ) {
    return 'png';
  }
  return 'other';
}

export async function toPdfImage(bytes: Uint8Array): Promise<{ bytes: Uint8Array; kind: 'jpg' | 'png' } | null> {
  if (!bytes.length) return null;
  const detected = detectImageKind(bytes);
  try {
    const sharpModule = await import('sharp');
    const output = await sharpModule.default(bytes, { failOn: 'error' })
      .rotate()
      .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
    if (!output.length) return detected === 'other' ? null : { bytes, kind: detected };
    return { bytes: new Uint8Array(output), kind: 'jpg' };
  } catch {
    if (detected === 'jpg' || detected === 'png') return { bytes, kind: detected };
    return null;
  }
}

function sanitizeForFont(text: string, font: PDFFont): string {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\u2026/g, '...');

  let out = '';
  for (const char of normalized) {
    if (char === '\n') {
      out += '\n';
      continue;
    }
    try {
      font.encodeText(char);
      out += char;
    } catch {
      out += '?';
    }
  }
  return out;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  const breakLongWord = (word: string) => {
    const parts: string[] = [];
    let current = '';
    for (const char of word) {
      const next = current + char;
      if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
        parts.push(current);
        current = char;
      } else {
        current = next;
      }
    }
    if (current) parts.push(current);
    return parts.length ? parts : [''];
  };

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean).flatMap(breakLongWord);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      const next = `${current} ${word}`;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) current = next;
      else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }

  return lines.length ? lines : [''];
}

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}...`;
}

export async function buildPendientesPdf(input: PendientePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Pendientes — ${input.proyectoNombre}`);
  pdf.setAuthor('ObraTracker');
  pdf.setCreator('ObraTracker');
  pdf.setSubject('Informe de pendientes');
  pdf.setCreationDate(new Date());

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const sanitize = (value: string) => sanitizeForFont(value, font);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT;

  const drawHeader = () => {
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 78,
      width: PAGE_WIDTH,
      height: 78,
      color: rgb(0.11, 0.14, 0.18),
    });
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 82,
      width: PAGE_WIDTH,
      height: 4,
      color: rgb(0.95, 0.45, 0.09),
    });

    const title = 'INFORME DE PENDIENTES';
    page.drawText(title, {
      x: MARGIN,
      y: PAGE_HEIGHT - 34,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    const dateLabel = truncateToWidth(sanitize(input.generadoEl), font, 9, 220);
    const dateWidth = font.widthOfTextAtSize(dateLabel, 9);
    page.drawText(dateLabel, {
      x: PAGE_WIDTH - MARGIN - dateWidth,
      y: PAGE_HEIGHT - 32,
      size: 9,
      font,
      color: rgb(0.86, 0.89, 0.93),
    });

    const projectLabel = truncateToWidth(sanitize(input.proyectoNombre || 'Proyecto'), font, 11, contentWidth);
    page.drawText(projectLabel, {
      x: MARGIN,
      y: PAGE_HEIGHT - 58,
      size: 11,
      font,
      color: rgb(0.93, 0.95, 0.97),
    });

    cursorY = PAGE_HEIGHT - HEADER_BOTTOM;
  };

  const ensure = (heightNeeded: number) => {
    if (cursorY - heightNeeded >= MARGIN + FOOTER_Y) return;
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeader();
  };

  const drawLines = (lines: string[], size: number, textFont: PDFFont, color: ReturnType<typeof rgb>, gap = 3) => {
    for (const line of lines) {
      ensure(size + gap);
      if (line) {
        page.drawText(line, {
          x: MARGIN,
          y: cursorY - size,
          size,
          font: textFont,
          color,
        });
      }
      cursorY -= size + gap;
    }
  };

  const drawPlaceholder = (target: PDFPage, x: number, y: number, width: number, height: number, label: string) => {
    target.drawRectangle({
      x,
      y,
      width,
      height,
      color: rgb(0.94, 0.95, 0.96),
      borderColor: rgb(0.78, 0.8, 0.84),
      borderWidth: 1,
    });
    const caption = truncateToWidth(sanitize(label || 'Foto no disponible'), font, 8, width - 16);
    target.drawText(caption, {
      x: x + 8,
      y: y + height / 2 - 4,
      size: 8,
      font,
      color: rgb(0.35, 0.38, 0.42),
    });
  };

  const embedFoto = async (foto: PdfFotoInput): Promise<PDFImage | null> => {
    const prepared = await toPdfImage(foto.bytes);
    if (!prepared) return null;
    try {
      return prepared.kind === 'jpg'
        ? await pdf.embedJpg(prepared.bytes)
        : await pdf.embedPng(prepared.bytes);
    } catch {
      return null;
    }
  };

  drawHeader();

  const completados = input.items.filter((item) => item.estado === 'completado').length;
  const summary = sanitize(
    `${input.items.length} pendientes · ${input.items.length - completados} activos · ${completados} completados`,
  );
  drawLines([summary], 10, font, rgb(0.33, 0.36, 0.42), 6);
  cursorY -= 6;

  if (input.items.length === 0) {
    drawLines(
      ['No hay pendientes para este proyecto.'],
      12,
      font,
      rgb(0.33, 0.36, 0.42),
    );
  }

  for (let index = 0; index < input.items.length; index += 1) {
    const item = input.items[index];
    ensure(72);
    page.drawRectangle({
      x: MARGIN,
      y: cursorY - 1,
      width: contentWidth,
      height: 1,
      color: rgb(0.86, 0.88, 0.9),
    });
    cursorY -= 12;

    const numero = String(index + 1).padStart(2, '0');
    const titulo = sanitize(item.titulo || 'Sin título');
    const titleLines = wrapText(`${numero}  ${titulo}`, fontBold, 13, contentWidth);
    drawLines(titleLines, 13, fontBold, rgb(0.1, 0.12, 0.16), 3);

    const vencido = isOverdue(item.fechaVencimiento, item.estado, input.hoy);
    const meta = sanitize(
      [
        `Estado: ${estadoPendienteLabel(item.estado)}`,
        `Vence: ${formatCalendarDate(item.fechaVencimiento)}`,
        vencido ? 'Vencido' : null,
      ].filter(Boolean).join('  ·  '),
    );
    drawLines([meta], 9, font, vencido ? rgb(0.75, 0.18, 0.16) : rgb(0.38, 0.42, 0.48), 4);
    cursorY -= 2;

    const detalle = item.descripcion?.trim()
      ? item.descripcion.trim()
      : 'Sin detalle';
    const detailLines = wrapText(sanitize(detalle), font, 10, contentWidth);
    drawLines(detailLines, 10, font, rgb(0.16, 0.18, 0.22), 3);
    cursorY -= 6;

    if (item.fotos.length === 0) continue;

    const slots = await Promise.all(item.fotos.map(async (foto) => ({
      nombre: foto.nombre,
      image: await embedFoto(foto),
    })));

    for (let offset = 0; offset < slots.length; offset += 2) {
      const row = slots.slice(offset, offset + 2);
      const single = row.length === 1;
      const gap = 10;
      const boxW = single ? contentWidth : (contentWidth - gap) / 2;
      const boxH = single ? 210 : 145;
      ensure(boxH + 8);
      const bottom = cursorY - boxH;

      row.forEach((slot, column) => {
        const x = MARGIN + column * (boxW + gap);
        if (!slot.image) {
          drawPlaceholder(page, x, bottom, boxW, boxH, slot.nombre);
          return;
        }
        page.drawRectangle({
          x,
          y: bottom,
          width: boxW,
          height: boxH,
          color: rgb(0.96, 0.97, 0.98),
          borderColor: rgb(0.86, 0.88, 0.9),
          borderWidth: 0.6,
        });
        const dims = slot.image.scale(1);
        const scale = Math.min((boxW - 8) / dims.width, (boxH - 8) / dims.height);
        const width = dims.width * scale;
        const height = dims.height * scale;
        page.drawImage(slot.image, {
          x: x + (boxW - width) / 2,
          y: bottom + (boxH - height) / 2,
          width,
          height,
        });
      });

      cursorY = bottom - 10;
    }
  }

  const pages = pdf.getPages();
  pages.forEach((pdfPage, pageIndex) => {
    const label = sanitize(`Página ${pageIndex + 1} de ${pages.length}`);
    const width = font.widthOfTextAtSize(label, 9);
    pdfPage.drawText(label, {
      x: (PAGE_WIDTH - width) / 2,
      y: 18,
      size: 9,
      font,
      color: rgb(0.42, 0.45, 0.5),
    });
  });

  return pdf.save();
}
