import type { VisualsId } from "./config";
import { getImageGenerator, getStockFinder, getStockPhotoFinder, QuotaExceededError } from "./providers";
import type { Scene } from "./schemas";
import { getStorage, keys } from "./storage";

export type SceneAsset = { kind: "video" | "image"; credit?: { id: string; name: string; url: string } };

/**
 * Make (or reuse) the visual for one scene:
 *   1. a real stock clip, when the scene can be filmed and the visuals mode allows it;
 *   2. otherwise an AI image (animated later by the worker's 3D camera engine);
 *   3. if the AI image allowance is used up for today: a stock clip anyway, then a real stock photo
 *      (also animated by the 3D camera), so one exhausted free tier doesn't stop the video.
 * Idempotent: an existing asset is kept, so retries never redo finished scenes.
 */
export async function makeSceneAsset(opts: {
  jobId: string;
  n: number;
  scene: Scene;
  visuals: VisualsId;
  /** Stock clip ids already used in this video. */
  exclude: string[];
}): Promise<SceneAsset> {
  const { jobId, n, scene, visuals } = opts;
  const storage = getStorage();
  if (await storage.exists(keys.sceneVideo(jobId, n))) return { kind: "video" };
  if (await storage.exists(keys.scene(jobId, n))) return { kind: "image" };

  const tryStockClip = async (query: string): Promise<SceneAsset | null> => {
    const finder = getStockFinder();
    if (!finder || !query) return null;
    try {
      const words = scene.narration.split(/\s+/).filter(Boolean).length;
      const clip = await finder({ query, minSeconds: words / 2.5 + 0.8, exclude: opts.exclude });
      if (!clip) return null;
      await storage.put(keys.sceneVideo(jobId, n), await download(clip.url), "video/mp4");
      return { kind: "video", credit: { id: clip.id, ...clip.credit } };
    } catch (err) {
      console.warn(`[scene ${n}] stock footage unavailable:`, (err as Error).message);
      return null;
    }
  };

  const triedStock = visuals !== "ai" && Boolean(scene.stockQuery);
  if (triedStock) {
    const clip = await tryStockClip(scene.stockQuery);
    if (clip) return clip;
  }

  try {
    const img = await getImageGenerator()({ prompt: scene.imagePrompt });
    await storage.put(keys.scene(jobId, n), img.bytes, img.contentType);
    return { kind: "image" };
  } catch (err) {
    if (!(err instanceof QuotaExceededError)) throw err;
    // Today's AI image allowance is gone: fall back to real footage, then a real photo.
    const query = scene.stockQuery || plainQuery(scene.imagePrompt);
    if (!triedStock) {
      const clip = await tryStockClip(query);
      if (clip) return clip;
    }
    const photos = getStockPhotoFinder();
    const photo = photos ? await photos({ query }).catch(() => null) : null;
    if (!photo) throw err;
    await storage.put(keys.scene(jobId, n), await download(photo.url), "image/jpeg");
    return { kind: "image", credit: { id: photo.id, ...photo.credit } };
  }
}

async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

/** "A lone lighthouse on a cliff at night, waves crashing, ..." -> "lone lighthouse cliff night" */
function plainQuery(prompt: string): string {
  const stop = new Set(["a", "an", "the", "of", "on", "in", "at", "with", "and", "vertical", "portrait", "close-up", "shot"]);
  return prompt
    .split(",")[0]!
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !stop.has(w))
    .slice(0, 5)
    .join(" ");
}

/** Which asset each scene ended up with, for the render timeline. */
export async function sceneMedia(jobId: string, count: number) {
  const storage = getStorage();
  return Promise.all(
    Array.from({ length: count }, async (_, n) => {
      if (await storage.exists(keys.sceneVideo(jobId, n))) return { video: keys.sceneVideo(jobId, n) };
      if (await storage.exists(keys.scene(jobId, n))) return { image: keys.scene(jobId, n) };
      return null;
    }),
  );
}
