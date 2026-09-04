/**
 * Base64 image upload — the free replacement for v48's license-gated
 * Base64UploadAdapter. Reads the selected/pasted/dropped file to a data: URI
 * via FileReader, which keeps images inside the document (offline-first; the
 * app CSP allows img-src data:). Registered through the free FileRepository.
 */

import { Plugin } from 'ckeditor5';
import type { FileLoader, UploadAdapter } from 'ckeditor5';

class DataUriUploadAdapter implements UploadAdapter {
  private readonly loader: FileLoader;

  constructor(loader: FileLoader) {
    this.loader = loader;
  }

  upload(): Promise<{ default: string }> {
    return new Promise((resolve, reject) => {
      const filePromise = Promise.resolve(this.loader.file) as Promise<File | Blob>;
      filePromise.then((file) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ default: reader.result as string });
        reader.onerror = () => reject(reader.error ?? new Error('Image read failed'));
        reader.readAsDataURL(file);
      }, reject);
    });
  }

  abort(): void {
    /* Nothing in flight worth cancelling — FileReader result is discarded. */
  }
}

export class DataUriUploadAdapterPlugin extends Plugin {
  static get pluginName() {
    return 'DataUriUploadAdapterPlugin' as const;
  }

  init(): void {
    const fileRepository = this.editor.plugins.get('FileRepository') as {
      createUploadAdapter: (loader: FileLoader) => UploadAdapter;
    } | undefined;
    if (!fileRepository) return;
    fileRepository.createUploadAdapter = (loader) => new DataUriUploadAdapter(loader);
  }
}
