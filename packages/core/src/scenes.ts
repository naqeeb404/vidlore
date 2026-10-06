import { getNiche, type NicheId, type VisualsId } from "./config";
import { getImageGenerator, getStockFinders, getStockPhotoFinder, QuotaExceededError } from "./providers";
import type { Scene } from "./schemas";
import { getStorage, keys } from "./storage";

export type Credit = { id: string; name: string; url: string; source: string };
export type SceneAsset = { kind: "video" | "image"; credit?: Credit };

/** A real clip chosen for a scene. The render worker downloads `url` itself (no storage cost). */
type ClipRef = { url: string; duration: number; credit: Credit };

export class NoFootageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoFootageError";
  }
}

/**
 * Pick (or reuse) the visual for one scene. Idempotent: an existing choice is kept, so retries
 * never redo finished scenes.
 *
 * - "stock" (the product default): a real filmed clip for every scene. Tries the scene's own searches
 *   (specific → broad) in every footage library, then the niche's generic b-roll. Never an image.
 * - "auto": real footage when the scene's searches match, otherwise an AI image.
 * - "ai": AI image (animated by the worker's 3D camera); real photo if the AI allowance is used up.
 */
export async function makeSceneAsset(opts: {
  jobId: string;
  n: number;
  scene: Scene;
  niche: NicheId;
  visuals: VisualsId;
  /** Clip ids already used in this video, so no clip repeats. */
  exclude: string[];
}): Promise<SceneAsset> {
  const { jobId, n, scene, visuals } = opts;
  const storage = getStorage();
  const existing = await storage.get(keys.sceneClip(jobId, n));
  if (existing) return { kind: "video", credit: (JSON.parse(new TextDecoder().decode(existing)) as ClipRef).credit };
  if (await storage.exists(keys.sceneVideo(jobId, n))) return { kind: "video" };
  if (await storage.exists(keys.scene(jobId, n))) return { kind: "image" };

  if (visuals !== "ai") {
    const queries = [...scene.stockQueries];
    if (visuals === "stock") queries.push(...getNiche(opts.niche).footage);
    const clip = await findClip(queries, scene, opts.exclude);
    if (clip) {
      await storage.put(keys.sceneClip(jobId, n), JSON.stringify(clip), "application/json");
      return { kind: "video", credit: clip.credit };
    }
    if (visuals === "stock") {
      throw new NoFootageError(
        getStockFinders().length === 0
          ? "Real footage isn't set up yet (missing PEXELS_API_KEY / PIXABAY_API_KEY)."
          : `No footage found for scene ${n + 1}.`,
      );
    }
  }

  try {
    const img = await getImageGenerator()({ prompt: scene.imagePrompt || scene.stockQueries[0] || scene.narration });
    await storage.put(keys.scene(jobId, n), img.bytes, img.contentType);
    return { kind: "image" };
  } catch (err) {
    if (!(err instanceof QuotaExceededError)) throw err;
    const photos = getStockPhotoFinder();
    const photo = photos ? await photos({ query: scene.stockQueries[0] ?? scene.narration }).catch(() => null) : null;
    if (!photo) throw err;
    await storage.put(keys.scene(jobId, n), await download(photo.url), "image/jpeg");
    return { kind: "image", credit: { id: photo.id, ...photo.credit, source: "Pexels" } };
  }
}

async function findClip(queries: string[], scene: Scene, exclude: string[]): Promise<ClipRef | null> {
  const finders = getStockFinders();
  const words = scene.narration.split(/\s+/).filter(Boolean).length;
  const minSeconds = words / 2.5 + 0.8;
  for (const query of [...new Set(queries)]) {
    for (const { source, find } of finders) {
      try {
        const clip = await find({ query, minSeconds, exclude });
        if (clip) return { url: clip.url, duration: clip.duration, credit: { id: clip.id, source, ...clip.credit } };
      } catch (err) {
        console.warn(`[footage] ${source} "${query}":`, (err as Error).message);
      }
    }
  }
  return null;
}

async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

/** What each scene ended up with, for the render timeline. */
export async function sceneMedia(jobId: string, count: number) {
  const storage = getStorage();
  return Promise.all(
    Array.from({ length: count }, async (_, n): Promise<{ image?: string; video?: string; videoUrl?: string } | null> => {
      const ref = await storage.get(keys.sceneClip(jobId, n));
      if (ref) return { videoUrl: (JSON.parse(new TextDecoder().decode(ref)) as ClipRef).url };
      if (await storage.exists(keys.sceneVideo(jobId, n))) return { video: keys.sceneVideo(jobId, n) };
      if (await storage.exists(keys.scene(jobId, n))) return { image: keys.scene(jobId, n) };
      return null;
    }),
  );
}
