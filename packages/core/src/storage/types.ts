export interface Storage {
  put(key: string, body: Uint8Array | string, contentType?: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
  /** A URL a browser can fetch, expiring after `expiresInSec`. `downloadName` forces a download. */
  signedUrl(key: string, expiresInSec?: number, downloadName?: string): Promise<string>;
}
