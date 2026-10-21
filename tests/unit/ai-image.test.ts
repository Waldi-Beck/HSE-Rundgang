import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_MAX_EDGE, AI_MAX_BYTES, jpegBlobToBase64, resizeForAi } from '../../src/lib/ai-image';
import { fitWithin } from '../../src/lib/image';

afterEach(() => vi.unstubAllGlobals());

describe('KI-Bildvorbereitung', () => {
  it('fits landscape and portrait images within the 1568px long edge', () => {
    expect(fitWithin(4000, 2000, AI_MAX_EDGE)).toEqual({ width: 1568, height: 784 });
    expect(fitWithin(1200, 3000, AI_MAX_EDGE)).toEqual({ width: 627, height: 1568 });
    expect(AI_MAX_EDGE).toBe(1568);
  });
  it('decodes a resized JPEG to base64 and rejects non-JPEG/oversized blobs', async () => {
    expect(await jpegBlobToBase64(new Blob(['jpeg'], { type: 'image/jpeg' }))).toBe('anBlZw==');
    await expect(jpegBlobToBase64(new Blob(['png'], { type: 'image/png' }))).rejects.toThrow(/JPEG/);
    await expect(jpegBlobToBase64(new Blob([new Uint8Array(AI_MAX_BYTES + 1)], { type: 'image/jpeg' }))).rejects.toThrow(/zu gross/);
  });
  it('actually draws oversized input at the target dimensions and outputs JPEG', async () => {
    const drawImage = vi.fn();
    const bitmap = { width: 4000, height: 2000, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
    const canvas = {
      width: 0, height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback: BlobCallback) => callback(new Blob(['small jpeg'], { type: 'image/jpeg' })),
    };
    vi.stubGlobal('document', { createElement: () => canvas });
    const resized = await resizeForAi(new Blob(['source'], { type: 'image/png' }));
    expect(canvas.width).toBe(1568);
    expect(canvas.height).toBe(784);
    expect(drawImage).toHaveBeenCalledOnce();
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(resized.type).toBe('image/jpeg');
  });
});
