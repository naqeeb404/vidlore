import type { VisualsId } from "./config";
import { getImageGenerator, getStockFinder } from "./providers";
import type { Scene } from "./schemas";
import { getStorage, keys } from "./storage";

export type SceneAsset = { kind: "video" | "image"; credit?: { id: string; name: string; url: string } };

/**
 * Make (or reuse) the visual for one scene: a real stock clip when the scene can be filmed and the
 * visuals mode allows it, otherwise an AI image (animated later by the worker's camera engine).
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

  const finder = getStockFinder();
  if (finder && visuals !== "ai" && scene.stockQuery) {
    try {
      const words = scene.narration.split(/\s+/).filter(Boolean).length;
      const clip = await finder({ query: scene.stockQuery, minSeconds: words / 2.5 + 0.8, exclude: opts.exclude });
      if (clip) {
        const res = await fetch(clip.url);
        if (!res.ok) throw new Error(`stock download failed (${res.status})`);
        await storage.put(keys.sceneVideo(jobId, n), new Uint8Array(await res.arrayBuffer()), "video/mp4");
        return { kind: "video", credit: { id: clip.id, ...clip.credit } };
      }
    } catch (err) {
      console.warn(`[scene ${n}] stock footage unavailable, using AI art:`, (err as Error).message);
    }
  }

  const img = await getImageGenerator()({ prompt: scene.imagePrompt });
  await storage.put(keys.scene(jobId, n), img.bytes, img.contentType);
  return { kind: "image" };
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
