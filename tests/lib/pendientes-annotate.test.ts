import { describe, expect, it } from 'vitest';
import {
  annotatedFotoName,
  arrowHeadPixels,
  canCommit,
  drawMarks,
  extendStroke,
  fitImageSize,
  pickJpegBlob,
  pointerToMark,
  undoMarks,
  type Drawable,
  type MarkStroke,
} from '@/lib/pendientes/annotate';

function recorder(): Drawable & { calls: string[] } {
  const calls: string[] = [];
  const ctx: Drawable & { calls: string[] } = {
    calls,
    lineWidth: 0,
    strokeStyle: '',
    fillStyle: '',
    lineCap: '',
    lineJoin: '',
    beginPath: () => calls.push('begin'),
    moveTo: (x, y) => calls.push(`move:${x},${y}`),
    lineTo: (x, y) => calls.push(`line:${x},${y}`),
    stroke: () => calls.push('stroke'),
    fill: () => calls.push('fill'),
    closePath: () => calls.push('close'),
    ellipse: (x, y, rx, ry) => calls.push(`ellipse:${x},${y},${rx},${ry}`),
    arc: (x, y, r) => calls.push(`arc:${x},${y},${r}`),
  };
  return ctx;
}

describe('marcas sobre fotos de pendientes', () => {
  it('normaliza el puntero y el tamaño de exportación', () => {
    expect(pointerToMark(10, 20, { left: 0, top: 0, width: 100, height: 200 })).toEqual({ x: 0.1, y: 0.1 });
    expect(pointerToMark(-5, 400, { left: 0, top: 0, width: 100, height: 100 })).toEqual({ x: 0, y: 1 });
    expect(pointerToMark(1, 1, { left: 0, top: 0, width: 0, height: 10 })).toBeNull();
    expect(fitImageSize(4000, 2000, 2000)).toEqual({ width: 2000, height: 1000 });
    expect(fitImageSize(80, 40, 2000)).toEqual({ width: 80, height: 40 });
    expect(annotatedFotoName('frente.HEIC')).toBe('frente.jpg');
    expect(annotatedFotoName('a.b.png')).toBe('a.b.jpg');
    expect(annotatedFotoName('   ')).toBe('foto.jpg');
  });

  it('arma el trazo, descarta movimientos mínimos y permite deshacer', () => {
    const pen: MarkStroke = { tool: 'pen', color: '#e11d48', points: [{ x: 0.1, y: 0.1 }] };
    const skipped = extendStroke(pen, { x: 0.101, y: 0.101 });
    expect(skipped.points).toHaveLength(1);
    const extended = extendStroke(pen, { x: 0.2, y: 0.3 });
    expect(extended.points).toEqual([{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.3 }]);

    const circle = extendStroke(
      { tool: 'circle', color: '#fff', points: [{ x: 0.2, y: 0.2 }] },
      { x: 0.6, y: 0.5 },
    );
    expect(circle.points).toEqual([{ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.5 }]);
    expect(canCommit(circle)).toBe(true);
    expect(canCommit({ tool: 'arrow', color: '#fff', points: [{ x: 0.2, y: 0.2 }, { x: 0.205, y: 0.2 }] })).toBe(false);
    expect(undoMarks([pen, circle])).toEqual([pen]);
  });

  it('dibuja círculo y flecha sobre el bitmap', () => {
    const [tip, left, right] = arrowHeadPixels({ x: 0, y: 0 }, { x: 10, y: 0 }, 4);
    expect(tip).toEqual({ x: 10, y: 0 });
    expect(left).toEqual({ x: 6, y: 2.2 });
    expect(right).toEqual({ x: 6, y: -2.2 });

    const ctx = recorder();
    drawMarks(ctx, 100, 100, [
      { tool: 'circle', color: '#e11d48', points: [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.8 }] },
      { tool: 'arrow', color: '#facc15', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
    ]);
    expect(ctx.calls.some((call) => call.startsWith('ellipse:'))).toBe(true);
    expect(ctx.calls.filter((call) => call === 'fill').length).toBe(2);
    expect(ctx.calls.filter((call) => call === 'stroke').length).toBeGreaterThan(0);
  });

  it('elige el primer JPEG que entra en el límite', async () => {
    const small = new Blob([new Uint8Array(10)]);
    const big = new Blob([new Uint8Array(50)]);
    await expect(pickJpegBlob(async (quality) => (quality > 0.8 ? big : small), 20)).resolves.toBe(small);
    await expect(pickJpegBlob(async () => big, 20)).rejects.toThrow('supera el límite');
    await expect(pickJpegBlob(async () => null, 20)).rejects.toThrow('No se pudo guardar');
  });
});
