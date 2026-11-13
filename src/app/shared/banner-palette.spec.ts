import { describe, expect, it } from 'vitest';
import { paletteFromPixels } from './banner-palette';

describe('banner palette', () => {
  it('adapts to dominant image tones and keeps the page surface dark', () => {
    const width = 80;
    const height = 40;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        pixels.set(x < 60 ? [12, 143, 170, 255] : [185, 42, 110, 255], offset);
      }
    }
    const palette = paletteFromPixels(pixels, width, height);
    expect(palette.primary).not.toBe('#9052df');
    expect(palette.secondary).not.toBe(palette.primary);
    expect(palette.deep).not.toBe(palette.primary);
  });

  it('uses a legible fallback for unavailable or transparent images', () => {
    expect(paletteFromPixels(new Uint8ClampedArray(0), 0, 0).deep).toBe('#140d24');
    expect(paletteFromPixels(new Uint8ClampedArray(80 * 40 * 4), 80, 40).primary).toBe('#9052df');
  });
});
