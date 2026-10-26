import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument,
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  fill,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFillingColor,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib';
import { PDF_JPEG_QUALITY, PDF_PHOTO_MAX_EDGE } from './imageSize';

export interface PdfFotoInput {
  nombre: string;
  bytes: Uint8Array;
  contentType?: string | null;
}

export interface PdfPendienteInput {
  titulo: string;
  descripcion: string | null;
  estado: 'pendiente' | 'completado';
  fotos: PdfFotoInput[];
}

export interface PendientePdfInput {
  proyectoNombre: string;
  generadoEl: string;
  items: PdfPendienteInput[];
}

export function pendientesAbiertos<T extends { estado: string }>(items: T[]): T[] {
  return items.filter((item) => item.estado === 'pendiente');
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/** Short export date used in the report header, e.g. "25 oct 2026". */
export function formatPdfExportDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Montevideo',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const monthIndex = Number(parts.find((part) => part.type === 'month')?.value) - 1;
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  return `${day} ${MONTHS_ES[monthIndex] ?? ''} ${year}`;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 50;
const MARGIN_BOTTOM = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const INK = rgb(0.067, 0.094, 0.153);
const SLATE = rgb(0.122, 0.161, 0.216);
const BODY = rgb(0.392, 0.435, 0.486);
const MUTED = rgb(0.580, 0.620, 0.675);
const RULE = rgb(0.886, 0.910, 0.929);
const PLACEHOLDER = rgb(0.945, 0.953, 0.965);
const WHITE = rgb(1, 1, 1);

const TITLE_SIZE = 26;
const PROJECT_SIZE = 12;
const DATE_SIZE = 10;
const ITEM_TITLE_SIZE = 16;
const ITEM_TITLE_LEADING = 21;
const BODY_SIZE = 11;
const BODY_LEADING = 16.5;
const CIRCLE_DIAMETER = 32;
const PHOTO_GAP = 16;
const PHOTO_RADIUS = 10;
const MAX_PHOTO_HEIGHT_RATIO = 1.45;
const CAPTION_SIZE = 8;
const CAPTION_TRACKING = 0.85;

let cachedRegular: Uint8Array | null = null;
let cachedBold: Uint8Array | null = null;

function fontBytes(filename: string): Uint8Array {
  return new Uint8Array(readFileSync(join(process.cwd(), 'src/lib/pendientes/fonts', filename)));
}

function regularFontBytes(): Uint8Array {
  if (!cachedRegular) cachedRegular = fontBytes('Inter-Regular.ttf');
  return cachedRegular;
}

function boldFontBytes(): Uint8Array {
  if (!cachedBold) cachedBold = fontBytes('Inter-Bold.ttf');
  return cachedBold;
}

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

/**
 * Every photo is rotated for EXIF and re-encoded as JPEG before it is embedded.
 * pdf-lib ignores the orientation tag, and passing an upright original through
 * would copy a full phone file into the PDF. The long edge stays at print
 * resolution for a half-width A4 frame. If sharp cannot read the file, a JPEG
 * or PNG is embedded as stored so the photo is not dropped.
 */
export async function toPdfImage(bytes: Uint8Array): Promise<{ bytes: Uint8Array; kind: 'jpg' | 'png' } | null> {
  if (!bytes.length) return null;
  const detected = detectImageKind(bytes);

  try {
    const sharpModule = await import('sharp');
    const output = await sharpModule.default(bytes, { failOn: 'error' })
      .rotate()
      .resize({
        width: PDF_PHOTO_MAX_EDGE,
        height: PDF_PHOTO_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: PDF_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    if (!output.length) {
      if (detected === 'jpg' || detected === 'png') return { bytes, kind: detected };
      return null;
    }
    return { bytes: new Uint8Array(output), kind: 'jpg' };
  } catch {
    if (detected === 'jpg' || detected === 'png') return { bytes, kind: detected };
    return null;
  }
}

function sanitizeForFont(text: string, font: PDFFont): string {
  let out = '';
  for (const char of text.replace(/\r\n/g, '\n').replace(/\t/g, ' ')) {
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
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function roundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const c = r * 0.5522847498;
  return [
    moveTo(x + r, y),
    lineTo(x + width - r, y),
    appendBezierCurve(x + width - r + c, y, x + width, y + r - c, x + width, y + r),
    lineTo(x + width, y + height - r),
    appendBezierCurve(x + width, y + height - r + c, x + width - r + c, y + height, x + width - r, y + height),
    lineTo(x + r, y + height),
    appendBezierCurve(x + r - c, y + height, x, y + height - r + c, x, y + height - r),
    lineTo(x, y + r),
    appendBezierCurve(x, y + r - c, x + r - c, y, x + r, y),
    closePath(),
  ];
}

function fillRoundedRect(page: PDFPage, x: number, y: number, width: number, height: number, radius: number, color: ReturnType<typeof rgb>) {
  page.pushOperators(
    pushGraphicsState(),
    setFillingColor(color),
    ...roundedRectPath(x, y, width, height, radius),
    fill(),
    popGraphicsState(),
  );
}

function drawTrackedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  tracking: number,
) {
  let cursor = x;
  for (const char of text) {
    page.drawText(char, { x: cursor, y, size, font, color });
    cursor += font.widthOfTextAtSize(char, size) + tracking;
  }
}

export async function buildPendientesPdf(input: PendientePdfInput): Promise<Uint8Array> {
  const items = pendientesAbiertos(input.items);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit as unknown as Parameters<PDFDocument['registerFontkit']>[0]);
  pdf.setTitle(`Reporte de pendientes — ${input.proyectoNombre}`);
  pdf.setAuthor('ObraTracker');
  pdf.setCreator('ObraTracker');
  pdf.setSubject('Reporte de pendientes');
  pdf.setCreationDate(new Date());

  const font = await pdf.embedFont(regularFontBytes(), { subset: true });
  const fontBold = await pdf.embedFont(boldFontBytes(), { subset: true });
  const sanitize = (value: string) => sanitizeForFont(value, font);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT;
  let headerBottomY = PAGE_HEIGHT;

  const drawHeader = () => {
    const titleWidth = fontBold.widthOfTextAtSize('Reporte de pendientes', TITLE_SIZE);
    const rightLimit = PAGE_WIDTH - MARGIN_X;
    const rightMax = Math.max(90, rightLimit - (MARGIN_X + titleWidth + 18));
    const projectLabel = truncateToWidth(sanitize(input.proyectoNombre || 'Proyecto'), font, PROJECT_SIZE, rightMax);
    const dateLabel = truncateToWidth(sanitize(input.generadoEl), font, DATE_SIZE, rightMax);

    const top = PAGE_HEIGHT - 48;
    const projectBaseline = top - PROJECT_SIZE;
    const dateBaseline = projectBaseline - 16;
    const titleBaseline = projectBaseline + (PROJECT_SIZE - TITLE_SIZE) * 0.68;
    const ruleY = Math.min(titleBaseline, dateBaseline) - 18;

    page.drawText('Reporte de pendientes', {
      x: MARGIN_X,
      y: titleBaseline,
      size: TITLE_SIZE,
      font: fontBold,
      color: INK,
    });

    const projectWidth = font.widthOfTextAtSize(projectLabel, PROJECT_SIZE);
    page.drawText(projectLabel, {
      x: rightLimit - projectWidth,
      y: projectBaseline,
      size: PROJECT_SIZE,
      font,
      color: INK,
    });

    const dateWidth = font.widthOfTextAtSize(dateLabel, DATE_SIZE);
    page.drawText(dateLabel, {
      x: rightLimit - dateWidth,
      y: dateBaseline,
      size: DATE_SIZE,
      font,
      color: MUTED,
    });

    page.drawLine({
      start: { x: MARGIN_X, y: ruleY },
      end: { x: rightLimit, y: ruleY },
      thickness: 0.8,
      color: RULE,
    });

    headerBottomY = ruleY - 32;
    cursorY = headerBottomY;
  };

  const ensure = (heightNeeded: number) => {
    if (cursorY - heightNeeded >= MARGIN_BOTTOM) return;
    if (Math.abs(cursorY - headerBottomY) < 1) return;
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeader();
  };

  const drawLines = (
    lines: string[],
    size: number,
    textFont: PDFFont,
    color: ReturnType<typeof rgb>,
    leading: number,
  ) => {
    for (const line of lines) {
      ensure(leading);
      if (line) {
        page.drawText(line, {
          x: MARGIN_X,
          y: cursorY - size,
          size,
          font: textFont,
          color,
        });
      }
      cursorY -= leading;
    }
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

  const columnWidth = (CONTENT_WIDTH - PHOTO_GAP) / 2;
  const maxPhotoHeight = columnWidth * MAX_PHOTO_HEIGHT_RATIO;

  const frameFor = (image: PDFImage | null) => {
    if (!image) return { width: columnWidth, height: columnWidth * 0.75 };
    const { width: pixelWidth, height: pixelHeight } = image.scale(1);
    const aspect = pixelHeight / Math.max(pixelWidth, 1);
    let width = columnWidth;
    let height = width * aspect;
    if (height > maxPhotoHeight) {
      height = maxPhotoHeight;
      width = height / aspect;
    }
    return { width, height };
  };

  const drawFramedImage = (image: PDFImage, x: number, y: number, width: number, height: number) => {
    page.pushOperators(
      pushGraphicsState(),
      ...roundedRectPath(x, y, width, height, PHOTO_RADIUS),
      clip(),
      endPath(),
    );
    page.drawImage(image, { x, y, width, height });
    page.pushOperators(popGraphicsState());
  };

  drawHeader();

  if (items.length === 0) {
    drawLines(
      ['No hay pendientes abiertos para este proyecto.'],
      12,
      font,
      BODY,
      18,
    );
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const numero = String(index + 1).padStart(2, '0');
    const titulo = sanitize(item.titulo.trim() || 'Sin título');
    const titleX = MARGIN_X + CIRCLE_DIAMETER + 12;
    const titleMaxWidth = PAGE_WIDTH - MARGIN_X - titleX;
    const titleLines = wrapText(titulo, fontBold, ITEM_TITLE_SIZE, titleMaxWidth);
    const titleBlockHeight = Math.max(CIRCLE_DIAMETER, titleLines.length * ITEM_TITLE_LEADING);
    if (item.fotos.length > 0) {
      const photoRow = 10 + maxPhotoHeight + 8 + CAPTION_SIZE + 18;
      const bodyLines = item.descripcion?.trim()
        ? wrapText(sanitize(item.descripcion.trim()), font, BODY_SIZE, CONTENT_WIDTH).length
        : 0;
      const bodyBlock = bodyLines ? Math.min(bodyLines, 4) * BODY_LEADING + 16 : 0;
      const together = titleBlockHeight + 20 + bodyBlock + photoRow;
      const pageRoom = headerBottomY - MARGIN_BOTTOM;
      if (together <= pageRoom && cursorY - together < MARGIN_BOTTOM) ensure(together);
    }
    ensure(titleBlockHeight + 6);

    const rowTop = cursorY;
    const circleCy = rowTop - CIRCLE_DIAMETER / 2;
    page.drawCircle({
      x: MARGIN_X + CIRCLE_DIAMETER / 2,
      y: circleCy,
      size: CIRCLE_DIAMETER / 2,
      color: SLATE,
    });

    let numberSize = 11;
    while (numberSize > 7 && fontBold.widthOfTextAtSize(numero, numberSize) > CIRCLE_DIAMETER - 12) {
      numberSize -= 0.5;
    }
    const numberWidth = fontBold.widthOfTextAtSize(numero, numberSize);
    page.drawText(numero, {
      x: MARGIN_X + CIRCLE_DIAMETER / 2 - numberWidth / 2,
      y: circleCy - numberSize * 0.35,
      size: numberSize,
      font: fontBold,
      color: WHITE,
    });

    const firstBaseline = circleCy - ITEM_TITLE_SIZE * 0.34;
    titleLines.forEach((line, lineIndex) => {
      if (!line) return;
      page.drawText(line, {
        x: titleX,
        y: firstBaseline - lineIndex * ITEM_TITLE_LEADING,
        size: ITEM_TITLE_SIZE,
        font: fontBold,
        color: INK,
      });
    });

    const titleBottom = firstBaseline - (titleLines.length - 1) * ITEM_TITLE_LEADING - ITEM_TITLE_SIZE * 0.22;
    const circleBottom = circleCy - CIRCLE_DIAMETER / 2;
    cursorY = Math.min(titleBottom, circleBottom) - 14;

    const detalle = item.descripcion?.trim() ? sanitize(item.descripcion.trim()) : '';
    if (detalle) {
      const detailLines = wrapText(detalle, font, BODY_SIZE, CONTENT_WIDTH);
      drawLines(detailLines, BODY_SIZE, font, BODY, BODY_LEADING);
      cursorY -= 6;
    }

    if (item.fotos.length > 0) {
      cursorY -= 10;
      const slots = await Promise.all(item.fotos.map(async (foto) => embedFoto(foto)));
      const captionBlock = 8 + CAPTION_SIZE;

      for (let offset = 0; offset < slots.length; offset += 2) {
        const row = slots.slice(offset, offset + 2);
        const frames = row.map((image) => frameFor(image));
        const rowImageHeight = Math.max(...frames.map((frame) => frame.height));
        const rowHeight = rowImageHeight + captionBlock + 8;
        ensure(rowHeight);
        const bottom = cursorY - rowImageHeight;

        row.forEach((image, column) => {
          const frame = frames[column];
          const x = MARGIN_X + column * (columnWidth + PHOTO_GAP);
          const y = bottom + (rowImageHeight - frame.height);
          if (image) drawFramedImage(image, x, y, frame.width, frame.height);
          else fillRoundedRect(page, x, y, frame.width, frame.height, PHOTO_RADIUS, PLACEHOLDER);

          const caption = `FOTO ${offset + column + 1}`;
          drawTrackedText(
            page,
            caption,
            x,
            y - 8 - CAPTION_SIZE,
            CAPTION_SIZE,
            font,
            MUTED,
            CAPTION_TRACKING,
          );
        });

        cursorY = bottom - captionBlock - 18;
      }
    }

    cursorY -= 20;
  }

  return pdf.save();
}
