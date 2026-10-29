import { inspectJpegBanner, validBannerDimensions } from './banner-validation';

function banner(bytes: number[], name = 'portada.jpg', type = 'image/jpeg', size = bytes.length) {
  return { name, type, size, arrayBuffer: async () => Uint8Array.from(bytes).buffer };
}

describe('validación de banners de Demo 3', () => {
  it('acepta JPEG real y detecta la misma foto aunque cambie el nombre', async () => {
    const bytes = [0xff, 0xd8, 0xff, 0xe0, 0x12, 0x34, 0xff, 0xd9];
    const first = await inspectJpegBanner(banner(bytes));
    const renamed = await inspectJpegBanner(banner(bytes, 'otra-foto.jpeg'));
    expect(first.ok).toBe(true);
    expect(renamed).toEqual(first);
  });

  it('rechaza formato declarado incorrecto, exceso de peso y contenido PNG disfrazado', async () => {
    const jpg = [0xff, 0xd8, 0xff, 0xe0];
    expect(await inspectJpegBanner(banner(jpg, 'foto.png'))).toEqual({ ok: false, issue: 'format' });
    expect((await inspectJpegBanner(banner(jpg, 'foto.jpg', 'image/jpeg', 2_000_000))).ok).toBe(true);
    expect(await inspectJpegBanner(banner(jpg, 'foto.jpg', 'image/jpeg', 2_000_001))).toEqual({ ok: false, issue: 'size' });
    expect(await inspectJpegBanner(banner([0x89, 0x50, 0x4e, 0x47], 'foto.jpg'))).toEqual({ ok: false, issue: 'signature' });
  });

  it('exige al menos 1920 × 480 y proporción 4:1 exacta para ambos banners', () => {
    expect(validBannerDimensions(1920, 480)).toBe(true);
    expect(validBannerDimensions(2400, 600)).toBe(true);
    expect(validBannerDimensions(1916, 479)).toBe(false);
    expect(validBannerDimensions(1920, 481)).toBe(false);
  });
});
