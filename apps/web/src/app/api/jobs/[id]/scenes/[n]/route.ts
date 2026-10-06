import { makeSceneAsset, QuotaExceededError, sceneMedia } from "@vidlore/core/server";
import { fail, json } from "@/server/http";
import { getJob, isOwner, saveJob, toPublic } from "@/server/jobs";
import { rateLimit } from "@/server/rate-limit";

export const maxDuration = 26;

const LIMIT_MESSAGE = "Daily demo limit reached, come back tomorrow.";

/**
 * Make one scene's visual: a real stock clip or an AI image. One short request per scene keeps
 * every call well under the function timeout.
 */
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

  const make = () =>
    makeSceneAsset({
      jobId: id,
      n,
      scene,
      visuals: job.input.visuals,
      exclude: Object.values(job.credits).flatMap((c) => (c.id ? [c.id] : [])),
    });
  let asset;
  try {
    asset = await make();
  } catch (err) {
    if (err instanceof QuotaExceededError) return fail(429, LIMIT_MESSAGE, "daily_limit");
    try {
      asset = await make(); // retry once
    } catch (err2) {
      if (err2 instanceof QuotaExceededError) return fail(429, LIMIT_MESSAGE, "daily_limit");
      console.error("[scene] failed", err2);
      return fail(502, "We couldn't make this scene. Please try again.", "scene_failed");
    }
  }

  if (asset.credit) job.credits[String(n)] = asset.credit;
  const media = await sceneMedia(id, job.script!.scenes.length);
  job.status = "making_images";
  job.imagesDone = media.filter(Boolean).length;
  delete job.error;
  await saveJob(job);
  return json({ job: await toPublic(job) });
}
