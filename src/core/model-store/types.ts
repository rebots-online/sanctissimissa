/**
 * CP.3 model-store contracts (§7.8.4, guide §13–15). Content identity is the
 * artifact's SHA-256 + exact byte count; a same-name file or matching length
 * proves nothing. A logical locator is opaque — never a path string handed to
 * web content. Lookup distinguishes missing bytes from missing permission.
 */

export interface ModelAsset {
  sha256: string;
  bytes: number;
  /** File name inside the digest directory (e.g. "model.gguf"). */
  fileName: string;
}

/** Result of persisting one chunk: incremental digest state (web) or ack. */
export interface WriteSession {
  /** Feed raw chunk bytes; returns the running digest length so far. */
  write(offset: number, chunk: Uint8Array): Promise<void>;
  finish(): Promise<void>;
  abort(): Promise<void>;
}

export type LookupResult =
  | { kind: 'ready'; locator: string }
  | { kind: 'missing' }
  | { kind: 'needs-grant'; reason: string }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'corrupt'; reason: string };

export interface ModelLibrary {
  /** Digest-keyed cross-writer lock; re-check lookup INSIDE the run. */
  lock<T>(key: string, run: () => Promise<T>): Promise<T>;
  lookup(asset: ModelAsset): Promise<LookupResult>;
  /** Streamed write; the implementation digests and verifies before commit. */
  beginWrite(asset: ModelAsset): Promise<WriteSession>;
  remove(sha256: string): Promise<void>;
  /** Download bytes the manager reports (progress/resume events). */
  onProgress(cb: (sha256: string, received: number, total: number) => void): void;
}
