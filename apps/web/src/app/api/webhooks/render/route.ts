import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { JobStatus } from "@vidlore/core";
import { secret } from "@/server/env";
import { fail, json } from "@/server/http";
import { updateJob } from "@/server/jobs";

const MAX_SKEW_SEC = 300;

const payload = z.object({
  jobId: z.string().uuid(),
  stage: z.enum(["voice", "rendering", "done", "failed"]),
  durationSec: z.number().optional(),
  error: z.string().max(500).optional(),
});

const STATUS: Record<z.infer<typeof payload>["stage"], JobStatus> = {
  voice: "recording_voice",
  rendering: "rendering",
  done: "done",
  failed: "failed",
};

function verify(body: string, ts: string | null, sig: string | null): boolean {
  if (!ts || !sig || !/^\d+$/.test(ts) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > MAX_SKEW_SEC) return false;
  const expected = createHmac("sha256", secret("RENDER_WEBHOOK_SECRET")).update(`${ts}.${body}`).digest();
  return timingSafeEqual(expected, Buffer.from(sig, "hex"));
}

/** Progress callbacks from the render worker (worker/vidlore_worker/webhook.py). */
export async function POST(req: Request) {
  const body = await req.text();
  if (!verify(body, req.headers.get("x-vidlore-timestamp"), req.headers.get("x-vidlore-signature"))) {
    return fail(401, "Invalid signature");
  }
  const parsed = payload.safeParse(JSON.parse(body));
  if (!parsed.success) return fail(400, "Invalid payload");
  const { jobId, stage, durationSec, error } = parsed.data;

  const job = await updateJob(jobId, (j) => {
    if (j.status === "done") return; // never regress a finished video
    j.status = STATUS[stage];
    if (durationSec) j.durationSec = durationSec;
    if (stage === "failed") {
      console.error(`[webhook] job ${jobId} failed: ${error}`);
      j.error = "Something went wrong while rendering. Please try again.";
    }
  });
  if (!job) return fail(404, "Unknown job");
  return json({ ok: true });
}
