import { buildTimeline, getRenderer, getStorage, keys, sceneMedia } from "@vidlore/core/server";
import { appUrl } from "@/server/env";
import { fail, json } from "@/server/http";
import { getJob, isOwner, saveJob, toPublic } from "@/server/jobs";

/** Hand the job to the render worker (local process, Docker or Cloud Run job). Returns immediately. */
export async function POST(req: Request, ctx: RouteContext<"/api/jobs/[id]/render">) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job || !isOwner(job, req)) return fail(404, "Video not found.");
  if (job.status === "recording_voice" || job.status === "rendering" || job.status === "done") {
    return json({ job: await toPublic(job) });
  }
  if (!job.script) return fail(409, "This video has no script yet.");

  const media = await sceneMedia(id, job.script.scenes.length);
  if (media.some((m) => !m)) return fail(409, "Some scenes are still being made.");

  const timeline = buildTimeline({
    jobId: id,
    script: job.script,
    niche: job.input.niche,
    voice: job.input.voice,
    media,
    callbackUrl: `${appUrl(req)}/api/webhooks/render`,
  });
  await getStorage().put(keys.timeline(id), JSON.stringify(timeline), "application/json");

  job.status = "recording_voice";
  delete job.error;
  await saveJob(job);
  try {
    await getRenderer()(timeline, keys.timeline(id), { background: true });
  } catch (err) {
    console.error("[render] failed to start", err);
    job.status = "failed";
    job.error = "We couldn't start rendering. Please try again.";
    await saveJob(job);
    return fail(502, job.error);
  }
  return json({ job: await toPublic(job) });
}
