import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { timingSafeEqual } from "node:crypto";
import { getStorage, LocalStorage, signFileKey } from "@vidlore/core/server";

const TYPES: Record<string, string> = { mp4: "video/mp4", jpg: "image/jpeg", png: "image/png" };

/**
 * Serves files from local storage behind expiring signed URLs (R2 issues its own presigned URLs).
 * Supports Range requests so the video player can seek.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/files/[...key]">) {
  const storage = getStorage();
  if (!(storage instanceof LocalStorage)) return new Response("Not found", { status: 404 });

  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  const url = new URL(req.url);
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") ?? "";
  const dl = url.searchParams.get("dl") ?? undefined;
  const ext = key.split(".").pop() ?? "";

  if (!TYPES[ext] || !Number.isFinite(exp) || exp < Date.now() / 1000 || !/^[0-9a-f]{64}$/.test(sig)) {
    return new Response("Link expired", { status: 403 });
  }
  if (!timingSafeEqual(Buffer.from(signFileKey(key, exp, dl), "hex"), Buffer.from(sig, "hex"))) {
    return new Response("Forbidden", { status: 403 });
  }

  let file: string;
  let size: number;
  try {
    file = storage.resolve(key);
    size = (await stat(file)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers({
    "content-type": TYPES[ext],
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=3600",
  });
  if (dl) headers.set("content-disposition", `attachment; filename="${dl.replace(/[^\w.-]/g, "_")}"`);

  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    headers.set("content-range", `bytes ${start}-${end}/${size}`);
    headers.set("content-length", String(end - start + 1));
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }

  headers.set("content-length", String(size));
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { status: 200, headers });
}
