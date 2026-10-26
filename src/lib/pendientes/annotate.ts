import { STORED_FOTO_JPEG_QUALITIES, STORED_FOTO_MAX_EDGE } from './imageSize';

export const MARK_COLORS = [
  { id: 'rojo', label: 'Rojo', value: '#e11d48' },
  { id: 'amarillo', label: 'Amarillo', value: '#facc15' },
  { id: 'blanco', label: 'Blanco', value: '#ffffff' },
] as const;

export const DEFAULT_MARK_COLOR = MARK_COLORS[0].value;
export const ANNOTATED_FOTO_MAX_EDGE = STORED_FOTO_MAX_EDGE;
export const JPEG_QUALITIES = STORED_FOTO_JPEG_QUALITIES;

export type MarkTool = 'pen' | 'circle' | 'arrow';

export interface MarkPoint {
  x: number;
  y: number;
}

export interface MarkStroke {
  tool: MarkTool;
  color: string;
  points: MarkPoint[];
}

export interface Drawable {
  lineWidth: number;
  strokeStyle: unknown;
  fillStyle: unknown;
  lineCap: string;
  lineJoin: string;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fill(): void;
  closePath(): void;
  ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function pointerToMark(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): MarkPoint | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  };
}

export function fitImageSize(width: number, height: number, maxEdge: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0) || !(maxEdge > 0)) return { width: 1, height: 1 };
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function annotatedFotoName(nombre: string): string {
  const withoutExtension = nombre.replace(/\.[^.]+$/, '');
  const safe = withoutExtension.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 240);
  return `${safe || 'foto'}.jpg`;
}

export function markLineWidth(minSide: number): number {
  return Math.max(4, Math.round(minSide * 0.012));
}

export function arrowHeadPixels(
  from: { x: number; y: number },
  to: { x: number; y: number },
  length: number,
): [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const wing = length * 0.55;
  return [
    { x: to.x, y: to.y },
    { x: to.x - ux * length - uy * wing, y: to.y - uy * length + ux * wing },
    { x: to.x - ux * length + uy * wing, y: to.y - uy * length - ux * wing },
  ];
}

export function extendStroke(stroke: MarkStroke, point: MarkPoint): MarkStroke {
  if (stroke.tool === 'pen') {
    const last = stroke.points[stroke.points.length - 1];
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.004) return stroke;
    return { ...stroke, points: [...stroke.points, point] };
  }
  const start = stroke.points[0] ?? point;
  return { ...stroke, points: [start, point] };
}

export function canCommit(stroke: MarkStroke): boolean {
  if (stroke.points.length === 0) return false;
  if (stroke.tool === 'pen') return true;
  const start = stroke.points[0];
  const end = stroke.points[stroke.points.length - 1];
  return Math.hypot(end.x - start.x, end.y - start.y) >= 0.01;
}

export function undoMarks(marks: MarkStroke[]): MarkStroke[] {
  return marks.slice(0, -1);
}

function strokePath(ctx: Drawable, width: number, color: string, trace: () => void) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width * 1.65;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  trace();
  ctx.stroke();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.beginPath();
  trace();
  ctx.stroke();
}

function toPixel(point: MarkPoint, width: number, height: number) {
  return { x: point.x * width, y: point.y * height };
}

export function drawMarks(ctx: Drawable, width: number, height: number, marks: MarkStroke[]) {
  const thickness = markLineWidth(Math.min(width, height));

  for (const mark of marks) {
    if (mark.points.length === 0) continue;
    const color = mark.color || DEFAULT_MARK_COLOR;

    if (mark.tool === 'pen') {
      const pixels = mark.points.map((point) => toPixel(point, width, height));
      if (pixels.length === 1) {
        const [dot] = pixels;
        const radius = thickness / 2;
        strokePath(ctx, thickness, color, () => {
          ctx.moveTo(dot.x + radius, dot.y);
          ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        });
        continue;
      }
      strokePath(ctx, thickness, color, () => {
        ctx.moveTo(pixels[0].x, pixels[0].y);
        for (let index = 1; index < pixels.length; index += 1) {
          ctx.lineTo(pixels[index].x, pixels[index].y);
        }
      });
      continue;
    }

    if (mark.tool === 'circle') {
      const start = toPixel(mark.points[0], width, height);
      const end = toPixel(mark.points[mark.points.length - 1], width, height);
      const radiusX = Math.max(Math.abs(end.x - start.x) / 2, 1);
      const radiusY = Math.max(Math.abs(end.y - start.y) / 2, 1);
      const centerX = (start.x + end.x) / 2;
      const centerY = (start.y + end.y) / 2;
      strokePath(ctx, thickness, color, () => {
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      });
      continue;
    }

    const from = toPixel(mark.points[0], width, height);
    const to = toPixel(mark.points[mark.points.length - 1], width, height);
    strokePath(ctx, thickness, color, () => {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
    });
    const [tip, left, right] = arrowHeadPixels(from, to, thickness * 4);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    const [colorTip, colorLeft, colorRight] = arrowHeadPixels(from, to, thickness * 3.2);
    ctx.beginPath();
    ctx.moveTo(colorTip.x, colorTip.y);
    ctx.lineTo(colorLeft.x, colorLeft.y);
    ctx.lineTo(colorRight.x, colorRight.y);
    ctx.closePath();
    ctx.fill();
  }
}

export async function pickJpegBlob(
  encode: (quality: number) => Promise<Blob | null>,
  maxBytes: number,
  qualities: readonly number[] = JPEG_QUALITIES,
): Promise<Blob> {
  let last: Blob | null = null;
  for (const quality of qualities) {
    const blob = await encode(quality);
    if (!blob) continue;
    last = blob;
    if (blob.size <= maxBytes) return blob;
  }
  if (!last) throw new Error('No se pudo guardar la foto marcada');
  throw new Error('La foto marcada supera el límite de 10 MB');
}
