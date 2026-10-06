import { makeSceneAsset, NoFootageError, QuotaExceededError, sceneMedia } from "@vidlore/core/server";
import { fail, json } from "@/server/http";
import { getJob, isOwner, saveJob, toPublic } from "@/server/jobs";
import { rateLimit } from "@/server/rate-limit";

export const maxDuration = 26;

// Cloudflare's free AI image allowance resets at 00:00 UTC. The script is kept, so the visitor can resume.
const QUOTA_MESSAGE = "Today's free AI image allowance is used up. It resets at midnight UTC.";

/**
 * Pick one scene's real footage clip (or AI image in the CLI's "ai" mode). One short request per scene keeps
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
      niche: job.input.niche,
      visuals: job.input.visuals,
      exclude: Object.values(job.credits).flatMap((c) => (c.id ? [c.id] : [])),
    });
  let asset;
  try {
    asset = await make();
  } catch (err) {
    if (err instanceof QuotaExceededError) return fail(429, QUOTA_MESSAGE, "image_quota");
    try {
      asset = await make(); // retry once
    } catch (err2) {
      if (err2 instanceof QuotaExceededError) return fail(429, QUOTA_MESSAGE, "image_quota");
      console.error("[scene] failed", err2);
      if (err2 instanceof NoFootageError) {
        return fail(502, "We couldn't find real footage for this scene. Try editing its text, or try again.", "no_footage");
      }
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
