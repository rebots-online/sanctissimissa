/** L.6 §2.1 — audiobook constants (values exact; L-audiobook-20261106.md §2.1). */

export const AUDIOBOOK_EDITIONS = ['catena-aurea-en'] as const; // Closed set, Phase L
export type AudiobookEditionId = (typeof AUDIOBOOK_EDITIONS)[number];

export const EDITION_SOURCE: Readonly<Record<string, string>> = { 'catena-aurea-en': 'catena-aurea' }; // Closed set, Phase L

export const BOOK_ORDER = ['Matt', 'Marc', 'Luc', 'Joann'] as const; // Closed set, Phase L
export type AudiobookBook = (typeof BOOK_ORDER)[number];

export const EVANGELIST: Readonly<Record<AudiobookBook, string>> = {
  Matt: 'Matthew',
  Marc: 'Mark',
  Luc: 'Luke',
  Joann: 'John',
}; // Closed set, Phase L

export type AudiobookRate = 0.85 | 1 | 1.2; // Closed set, Phase L
export const AUDIOBOOK_RATES: readonly AudiobookRate[] = [0.85, 1, 1.2]; // Closed set, Phase L

/** Labels verbatim from the frozen export (`library-tts-karaoke-studio.html:956-958`). */
export const RATE_OPTIONS: readonly { value: string; rate: AudiobookRate; label: string }[] = [
  { value: '0.85x', rate: 0.85, label: '0.85x (Liturgical Chant Pace)' },
  { value: '1.0x', rate: 1, label: '1.0x (Standard Lectio)' },
  { value: '1.2x', rate: 1.2, label: '1.2x (Fast Study)' },
]; // Closed set, Phase L

export type SentenceStatus = 'missing' | 'inflight' | 'stored' | 'failed'; // Closed set, Phase L

export const SKIP_SEC = 15;
export const BUFFER_AHEAD_SEC = 120;
export const IDLE_FILL_RTF_EFF = 0.5;
export const RTF_ALPHA = 0.3;
export const RTF_WARMUP = 3;
export const LONG_SENTENCE_CHARS = 300;
export const DEFAULT_SEC_PER_CHAR = 0.065;
/** 512 MiB. */
export const CHUNK_STORE_BUDGET_BYTES = 536870912;
// Sleep timer: none — the export has no sleep control. Closed set, Phase L (empty).
