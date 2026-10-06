import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { job as jobSchema, type Job, type PublicJob } from "@vidlore/core";
import { getStorage, keys } from "@vidlore/core/server";

const decoder = new TextDecoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** No accounts: whoever created a job holds a random token that proves ownership. */
export function newOwnerToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isOwner(job: Job, req: Request): boolean {
  const token = req.headers.get("x-owner-token");
  if (!token) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(job.ownerTokenHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getJob(id: string): Promise<Job | null> {
  if (!UUID.test(id)) return null;
  const raw = await getStorage().get(keys.job(id));
  if (!raw) return null;
  return jobSchema.parse(JSON.parse(decoder.decode(raw)));
}

export async function saveJob(job: Job): Promise<Job> {
  job.updatedAt = new Date().toISOString();
  await getStorage().put(keys.job(job.id), JSON.stringify(job), "application/json");
  return job;
}

export async function updateJob(id: string, patch: (job: Job) => void): Promise<Job | null> {
  const job = await getJob(id);
  if (!job) return null;
  patch(job);
  return saveJob(job);
}

export function slugify(title: string | undefined) {
  const slug = (title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || "vidlore-video";
}

export async function toPublic(job: Job): Promise<PublicJob> {
  const { ownerTokenHash: _owner, clientHash: _client, ...rest } = job;
  if (job.status !== "done") return rest;
  const storage = getStorage();
  const [videoUrl, downloadUrl, thumbnailUrl] = await Promise.all([
    storage.signedUrl(keys.video(job.id), 3600),
    storage.signedUrl(keys.video(job.id), 3600, `${slugify(job.script?.title)}.mp4`),
    storage.signedUrl(keys.thumbnail(job.id), 3600),
  ]);
  return { ...rest, videoUrl, downloadUrl, thumbnailUrl };
}
