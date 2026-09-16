/**
 * aboutMediaPlan — pure helpers for the About backstory media montage
 * (Stanza AM.01/AM.02, contract DOCS/ARCHITECTURE/about-media-20260915.md).
 *
 * Node-importable by design: no Vite constructs live here (the build-time
 * glob stays in aboutMedia.ts) so `node --test` can exercise placement and
 * naming without a bundler — same pure-module rule the LS chant backend used.
 */

export type AboutMediaKind = 'photo' | 'video';

export interface AboutMedium {
  url: string;
  kind: AboutMediaKind;
  name: string;
}

export interface Mount {
  medium: AboutMedium;
  afterBlock: number;
  side: 'right' | 'left';
}

/** Extensions the montage mounts, in the exact order used by the content glob. */
export const MEDIA_GLOB_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', // photos
  'mp4', 'webm', 'mov', 'm4v', // videos (MOV/M4V depend on WebView codecs)
] as const;

const KIND_BY_EXT: Record<string, AboutMediaKind> = {
  jpg: 'photo',
  jpeg: 'photo',
  png: 'photo',
  gif: 'photo',
  webp: 'photo',
  avif: 'photo',
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  m4v: 'video',
};

/** 'photo' | 'video' for a mounted extension, null otherwise (case-insensitive). */
export function kindFor(filename: string): AboutMediaKind | null {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return null;
  return KIND_BY_EXT[filename.slice(dot + 1).toLowerCase()] ?? null;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Natural filename order — the operator sequences the montage by filename (01-…, 02-…). */
export function naturalNameCompare(a: string, b: string): number {
  return collator.compare(a, b);
}

/**
 * Filename stem humanized into alt text / caption. A leading sequencing
 * prefix (`01-`, `002_`, `3 `) is dropped: "01-first-day.jpg" → "First day".
 */
export function captionFor(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const stem = (dot > 0 ? filename.slice(0, dot) : filename)
    .replace(/^\d{1,3}[-_ ]+/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stem.length === 0 || /^\d+$/.test(stem)) return filename; // prefix-only stem: keep the original
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}
