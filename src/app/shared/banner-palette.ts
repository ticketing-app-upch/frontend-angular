export interface BannerPalette {
  primary: string;
  secondary: string;
  deep: string;
  mid: string;
  textSide: 'left' | 'right';
}

export const DEFAULT_BANNER_PALETTE: BannerPalette = {
  primary: '#9052df',
  secondary: '#d64684',
  deep: '#140d24',
  mid: '#251332',
  textSide: 'left',
};

type Color = [number, number, number];

const css = ([r, g, b]: Color): string =>
  `#${[r, g, b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`;

const blend = (a: Color, b: Color, share: number): Color => [
  a[0] * share + b[0] * (1 - share),
  a[1] * share + b[1] * (1 - share),
  a[2] * share + b[2] * (1 - share),
];

/** Extrae tonos dominantes del propio banner; superficies oscuras mantienen el contraste del texto. */
export function paletteFromPixels(pixels: Uint8ClampedArray, width: number, height: number): BannerPalette {
  if (width < 2 || height < 2 || pixels.length < width * height * 4) return DEFAULT_BANNER_PALETTE;
  const buckets = Array.from({ length: 12 }, () => ({ weight: 0, rgb: [0, 0, 0] as Color }));
  let leftDetail = 0;
  let rightDetail = 0;
  const step = Math.max(1, Math.floor(width / 80));
  for (let y = step; y < height; y += step) {
    for (let x = step; x < width; x += step) {
      const index = (y * width + x) * 4;
      if (pixels[index + 3] < 180) continue;
      const color: Color = [pixels[index], pixels[index + 1], pixels[index + 2]];
      const prior = ((y - step) * width + x) * 4;
      const detail = Math.abs(color[0] - pixels[prior]) + Math.abs(color[1] - pixels[prior + 1]) + Math.abs(color[2] - pixels[prior + 2]);
      if (x < width * .45) leftDetail += detail;
      if (x > width * .55) rightDetail += detail;
      const max = Math.max(...color) / 255;
      const min = Math.min(...color) / 255;
      const delta = max - min;
      const lightness = (max + min) / 2;
      const saturation = delta / (1 - Math.abs(2 * lightness - 1) || 1);
      if (saturation < .18 || lightness < .10 || lightness > .89) continue;
      let hue = 0;
      if (delta > 0) {
        if (max === color[0] / 255) hue = ((color[1] - color[2]) / 255 / delta) % 6;
        else if (max === color[1] / 255) hue = (color[2] - color[0]) / 255 / delta + 2;
        else hue = (color[0] - color[1]) / 255 / delta + 4;
      }
      const bucket = buckets[Math.floor(((hue * 60 + 360) % 360) / 30)];
      const weight = saturation * (.35 + Math.min(lightness, 1 - lightness));
      bucket.weight += weight;
      bucket.rgb = bucket.rgb.map((value, channel) => value + color[channel] * weight) as Color;
    }
  }
  const ranked = buckets.map((bucket, index) => ({ ...bucket, index })).sort((a, b) => b.weight - a.weight);
  if (!ranked[0]?.weight) return DEFAULT_BANNER_PALETTE;
  const average = (bucket: typeof ranked[number]): Color => bucket.rgb.map(value => value / bucket.weight) as Color;
  const primary = average(ranked[0]);
  const secondaryBucket = ranked.find(bucket => bucket.weight > ranked[0].weight * .17 &&
    Math.min(Math.abs(bucket.index - ranked[0].index), 12 - Math.abs(bucket.index - ranked[0].index)) >= 2);
  const secondary = secondaryBucket ? average(secondaryBucket) : blend(primary, [238, 184, 220], .68);
  return {
    primary: css(primary),
    secondary: css(secondary),
    deep: css(blend(primary, [10, 10, 19], .18)),
    mid: css(blend(secondary, [14, 13, 27], .27)),
    textSide: leftDetail < rightDetail * .84 ? 'left' : 'right',
  };
}

export function paletteFromImage(image: HTMLImageElement): BannerPalette {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 40;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return DEFAULT_BANNER_PALETTE;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return paletteFromPixels(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  } catch {
    // Imágenes externas sin CORS no permiten leer píxeles; usar paleta accesible.
    return DEFAULT_BANNER_PALETTE;
  }
}
