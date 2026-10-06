import { isBlockedTopic, script as scriptSchema } from "@vidlore/core";
import { getStorage, keys } from "@vidlore/core/server";
import { fail, json } from "@/server/http";
import { getJob, isOwner, saveJob, toPublic } from "@/server/jobs";

const STALE_MS = 20 * 60_000;

export async function GET(_req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job) return fail(404, "Video not found.");

  // A worker that died without calling back would leave the job spinning forever.
  const working = job.status === "recording_voice" || job.status === "rendering";
  if (working && Date.now() - Date.parse(job.updatedAt) > STALE_MS) {
    job.status = "failed";
    job.error = "Rendering took too long. Please try again.";
    await saveJob(job);
  }
  return json({ job: await toPublic(job) });
}

/** Save the edited script before rendering. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job || !isOwner(job, req)) return fail(404, "Video not found.");
  if (job.status !== "script_ready") return fail(409, "The script can't be changed once the video has started.");

  const body = (await req.json().catch(() => null)) as { script?: unknown } | null;
  const parsed = scriptSchema.safeParse(body?.script);
  if (!parsed.success) return fail(400, "Each scene needs some narration (max 400 characters).");
  const text = parsed.data.scenes.map((s) => s.narration).join(" ");
  if (isBlockedTopic(`${parsed.data.title} ${text}`)) {
    return fail(400, "Some of that text isn't something we can make a video about. Please edit it.", "blocked");
  }
  if (text.length > 1400) return fail(400, "That script is too long for a short video. Trim it a little.");

  job.script = parsed.data;
  await saveJob(job);
  return json({ job: await toPublic(job) });
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job || !isOwner(job, req)) return fail(404, "Video not found.");
  await getStorage().deletePrefix(keys.jobPrefix(id));
  return json({ ok: true });
}
