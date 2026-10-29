import { sha256 } from 'js-sha256';

export const MAX_BANNER_BYTES = 2_000_000;

type BannerIssue = 'format' | 'size' | 'signature' | 'read';
export type BannerInspection =
  | { ok: true; fingerprint: string }
  | { ok: false; issue: BannerIssue };

/** Valida también el contenido: un PNG renombrado a .jpg no es un banner JPG. */
export async function inspectJpegBanner(file: Pick<File, 'name' | 'type' | 'size' | 'arrayBuffer'>): Promise<BannerInspection> {
  if (file.type !== 'image/jpeg' || !/\.jpe?g$/i.test(file.name)) return { ok: false, issue: 'format' };
  if (file.size > MAX_BANNER_BYTES) return { ok: false, issue: 'size' };
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return { ok: false, issue: 'signature' };
    }
    return { ok: true, fingerprint: sha256(bytes) };
  } catch {
    return { ok: false, issue: 'read' };
  }
}

export function validBannerDimensions(width: number, height: number): boolean {
  return width >= 1920 && height >= 480 && width === height * 4;
}
