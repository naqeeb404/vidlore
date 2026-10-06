import { randomUUID } from "node:crypto";
import { createVideoInput, isBlockedTopic, type Job } from "@vidlore/core";
import { getScriptWriter } from "@vidlore/core/server";
import { clientHash } from "@/server/client";
import { fail, json } from "@/server/http";
import { newOwnerToken, saveJob, toPublic } from "@/server/jobs";
import { rateLimit } from "@/server/rate-limit";
import { releaseVideo, reserveVideo } from "@/server/usage";

// Gemini's free tier can be slow when busy; the client shows "Writing script…" meanwhile.
export const maxDuration = 60;

export async function POST(req: Request) {
  const client = clientHash(req);
  if (!rateLimit(`create:${client}`, 3, 60_000)) {
    return fail(429, "Easy there! Please wait a minute before starting another video.");
  }

  const parsed = createVideoInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message ?? "Please check the form and try again.");
  }
  const input = parsed.data;
  if (isBlockedTopic(input.topic)) {
    return fail(400, "That topic isn't something we can make a video about. Please try another one.", "blocked");
  }

  const cap = await reserveVideo(client);
  if (!cap.ok) {
    return fail(429, "Daily demo limit reached, come back tomorrow.", "daily_limit");
  }

  const owner = newOwnerToken();
  const now = new Date().toISOString();
  const job: Job = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "writing_script",
    input,
    imagesDone: 0,
    credits: {},
    ownerTokenHash: owner.hash,
    clientHash: client,
  };
  await saveJob(job);

  const writeScript = getScriptWriter();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      job.script = await writeScript(input);
      job.status = "script_ready";
      await saveJob(job);
      return json({ job: await toPublic(job), ownerToken: owner.token }, 201);
    } catch (err) {
      lastError = err;
    }
  }

  console.error("[jobs] script failed", lastError);
  await releaseVideo(client);
  job.status = "failed";
  job.error = "Our script writer is busy right now. Please try again in a minute (this didn't count toward your daily limit).";
  await saveJob(job);
  return fail(503, job.error, "script_failed");
}
