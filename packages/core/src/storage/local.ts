import { createHmac } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Storage } from "./types";

/** Filesystem storage for local development and the CLI. Mirrors the R2 key layout. */
export class LocalStorage implements Storage {
  constructor(readonly root: string) {}

  resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, body: Uint8Array | string) {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }

  async get(key: string) {
    try {
      return new Uint8Array(await readFile(this.resolve(key)));
    } catch {
      return null;
    }
  }

  async exists(key: string) {
    try {
      await stat(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }

  async deletePrefix(prefix: string) {
    await rm(this.resolve(prefix), { recursive: true, force: true });
  }

  /** Served by the web app's /api/files route, which checks the signature and expiry. */
  async signedUrl(key: string, expiresInSec = 3600, downloadName?: string) {
    const exp = Math.floor(Date.now() / 1000) + expiresInSec;
    const params = new URLSearchParams({ exp: String(exp), sig: signFileKey(key, exp, downloadName) });
    if (downloadName) params.set("dl", downloadName);
    return `/api/files/${key}?${params}`;
  }
}

export function signFileKey(key: string, exp: number, downloadName?: string): string {
  const secret = process.env.FILE_SIGNING_SECRET;
  if (!secret) throw new Error("Missing environment variable FILE_SIGNING_SECRET");
  return createHmac("sha256", secret).update(`${key}\n${exp}\n${downloadName ?? ""}`).digest("hex");
}
