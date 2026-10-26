import { describe, expect, it } from 'vitest';
import { buildStoredPendienteFoto } from '@/lib/pendientes/compress';
import { STORED_FOTO_JPEG_QUALITIES, STORED_FOTO_MAX_EDGE } from '@/lib/pendientes/imageSize';

describe('compresión de fotos antes de subirlas', () => {
  it('re-encoda una foto grande al borde guardado y a la calidad más alta', async () => {
    const calls: Array<{ width: number; height: number; quality: number }> = [];
    const result = await buildStoredPendienteFoto({
      name: 'IMG_0001.HEIC',
      type: 'image/heic',
      size: 4 * 1024 * 1024,
      width: 4032,
      height: 3024,
      encode: async (width, height, quality) => {
        calls.push({ width, height, quality });
        return new Blob([new Uint8Array(200_000)], { type: 'image/jpeg' });
      },
    });

    expect(STORED_FOTO_MAX_EDGE).toBe(2400);
    expect(STORED_FOTO_JPEG_QUALITIES[0]).toBeGreaterThanOrEqual(0.9);
    expect(calls).toEqual([{ width: 2400, height: 1800, quality: 0.92 }]);
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('IMG_0001.jpg');
    expect(result.size).toBe(200_000);
  });

  it('no re-encoda un JPEG que ya entra en el borde y en 1.5 MB', async () => {
    const original = new File([new Uint8Array(200_000)], 'ya.jpg', { type: 'image/jpeg' });
    let encoded = false;
    const result = await buildStoredPendienteFoto({
      name: 'ya.jpg',
      type: 'image/jpeg',
      size: original.size,
      width: 1600,
      height: 1200,
      original,
      encode: async () => {
        encoded = true;
        return new Blob([new Uint8Array(10)]);
      },
    });

    expect(encoded).toBe(false);
    expect(result).toBe(original);
  });

  it('baja de calidad solo si la primera pasa de 10 MB', async () => {
    const qualities: number[] = [];
    const result = await buildStoredPendienteFoto({
      name: 'grande.png',
      type: 'image/png',
      size: 8_000_000,
      width: 4000,
      height: 3000,
      encode: async (_width, _height, quality) => {
        qualities.push(quality);
        const bytes = quality >= 0.92 ? 11 * 1024 * 1024 : 900_000;
        return new Blob([new Uint8Array(bytes)]);
      },
    });

    expect(qualities).toEqual([0.92, 0.86]);
    expect(result.size).toBe(900_000);
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('grande.jpg');
  });

  it('rechaza la foto si ninguna calidad entra en 10 MB', async () => {
    await expect(buildStoredPendienteFoto({
      name: 'ruido.png',
      type: 'image/png',
      size: 9_000_000,
      width: 4000,
      height: 3000,
      encode: async () => new Blob([new Uint8Array(11 * 1024 * 1024)]),
    })).rejects.toThrow('ruido.png supera el límite de 10 MB');

    await expect(buildStoredPendienteFoto({
      name: 'vacia.png',
      type: 'image/png',
      size: 1000,
      width: 800,
      height: 600,
      encode: async () => null,
    })).rejects.toThrow('No se pudo procesar vacia.png');
  });
});
