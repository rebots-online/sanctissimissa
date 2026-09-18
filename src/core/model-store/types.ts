/**
 * CP.3 model-store contracts (§7.8.4, guide §13–15). Content identity is the
 * artifact's SHA-256 + exact byte count; a same-name file or matching length
 * proves nothing. A logical locator is opaque — never a path string handed to
 * web content. Lookup distinguishes missing bytes from missing permission.
 */

export interface ModelAsset {
  sha256: string;
  bytes: number;
  /** Catalogue display sizes are estimates until response metadata proves the length. */
  estimatedBytes?: boolean;
  /** File name inside the digest directory (e.g. "model.gguf"). */
  fileName: string;
}

/**
 * Staging-first write session (guide §13): content identity is PROVEN at
 * ingest. `asset.sha256` may be empty when the catalog has no digest — the
 * implementation hashes the stream and `finish()` publishes the object under
 * the real digest, returning it. A supplied digest that mismatches the bytes
 * fails the commit; a tampered artifact can never resolve ready.
 */
export interface WriteSession {
  write(offset: number, chunk: Uint8Array): Promise<void>;
  finish(): Promise<{ sha256: string; bytes: number }>;
  abort(): Promise<void>;
}

export interface WriteAsset {
  bytes: number;
  fileName: string;
  /** Known digest to enforce, or '' when the download proves it. */
  sha256?: string;
  /** Stable staging key when the digest is not yet known. */
  stagingKey?: string;
}

export type LookupResult =
  | { kind: 'ready'; locator: string; asset?: ModelAsset }
  | { kind: 'missing' }
  | { kind: 'needs-grant'; reason: string }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'corrupt'; reason: string };

export interface ModelLibrary {
  /** Digest-keyed cross-writer lock; re-check lookup INSIDE the run. */
  lock<T>(key: string, run: () => Promise<T>): Promise<T>;
  lookup(asset: ModelAsset): Promise<LookupResult>;
  /** Streamed staging write; finish() verifies + publishes under the real digest. */
  beginWrite(asset: WriteAsset): Promise<WriteSession>;
  remove(sha256: string): Promise<void>;
  /** Download bytes the manager reports (progress/resume events). */
  onProgress(cb: (sha256: string, received: number, total: number) => void): void;
}
