import { getImageGenerator, getStorage, keys, QuotaExceededError } from "@vidlore/core/server";
import { fail, json } from "@/server/http";
import { getJob, isOwner, saveJob, toPublic } from "@/server/jobs";
import { rateLimit } from "@/server/rate-limit";

export const maxDuration = 26;

/** Generate one scene image. One short request per scene keeps every call well under the function timeout. */
export async function POST(req: Request, ctx: RouteContext<"/api/jobs/[id]/scenes/[n]">) {
  const { id, n: nParam } = await ctx.params;
  const job = await getJob(id);
  if (!job || !isOwner(job, req)) return fail(404, "Video not found.");
  if (!rateLimit(`scene:${id}`, 30, 60_000)) return fail(429, "Too many requests, slow down a little.");

  const n = Number(nParam);
  const scene = job.script?.scenes[n];
  if (!Number.isInteger(n) || !scene) return fail(400, "Unknown scene.");
  if (job.status !== "script_ready" && job.status !== "making_images" && job.status !== "failed") {
    return json({ job: await toPublic(job) });
  }

  const storage = getStorage();
  const key = keys.scene(id, n);
  if (!(await storage.exists(key))) {
    const generate = getImageGenerator();
    let img;
    try {
      img = await generate({ prompt: scene.imagePrompt });
    } catch (err) {
      if (err instanceof QuotaExceededError) return fail(429, "Daily demo limit reached, come back tomorrow.", "daily_limit");
      try {
        img = await generate({ prompt: scene.imagePrompt });
      } catch (err) {
        if (err instanceof QuotaExceededError) return fail(429, "Daily demo limit reached, come back tomorrow.", "daily_limit");
        console.error("[scene] image failed", err);
        return fail(502, "We couldn't paint this scene. Please try again.", "image_failed");
      }
    }
    await storage.put(key, img.bytes, img.contentType);
  }

  const total = job.script!.scenes.length;
  const done = (await Promise.all(job.script!.scenes.map((_, i) => storage.exists(keys.scene(id, i))))).filter(Boolean).length;
  job.status = "making_images";
  job.imagesDone = Math.min(done, total);
  delete job.error;
  await saveJob(job);
  return json({ job: await toPublic(job) });
}
