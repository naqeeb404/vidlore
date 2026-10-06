import { z } from "zod";
import { LENGTHS, LIMITS, NICHE_IDS, STYLE_IDS, VOICE_IDS } from "./config";

export const createVideoInput = z.object({
  niche: z.enum(NICHE_IDS),
  style: z.enum(STYLE_IDS),
  voice: z.enum(VOICE_IDS),
  length: z.union([z.literal(LENGTHS[0]), z.literal(LENGTHS[1])]),
  topic: z
    .string()
    .trim()
    .min(3, "Tell us a little more about the topic")
    .max(LIMITS.topicMaxLength, `Keep the topic under ${LIMITS.topicMaxLength} characters`),
});
export type CreateVideoInput = z.infer<typeof createVideoInput>;

export const scene = z.object({
  narration: z.string().trim().min(1).max(400),
  imagePrompt: z.string().trim().min(1).max(1000),
});
export type Scene = z.infer<typeof scene>;

export const script = z.object({
  title: z.string().trim().min(1).max(100),
  scenes: z.array(scene).min(3).max(14),
});
export type Script = z.infer<typeof script>;

/** Contract between the app/CLI and the Python render worker (worker/vidlore_worker/timeline.py). */
export const timeline = z.object({
  version: z.literal(1),
  jobId: z.string().min(1),
  title: z.string(),
  voice: z.enum(VOICE_IDS),
  lang: z.enum(["en-us", "en-gb"]),
  speed: z.number().min(0.7).max(1.3).default(1),
  music: z.enum(["dark", "uplift", "mystery", "warm"]),
  scenes: z
    .array(
      z.object({
        narration: z.string().min(1),
        /** Storage key of the scene image. */
        image: z.string().min(1),
      }),
    )
    .min(1),
  output: z.object({
    video: z.string(),
    thumbnail: z.string(),
    /** Prefix for cached intermediate files (voice, words). */
    workPrefix: z.string(),
  }),
  callback: z
    .object({
      url: z.string().url(),
    })
    .optional(),
});
export type Timeline = z.infer<typeof timeline>;

export const JOB_STATUSES = [
  "writing_script",
  "script_ready",
  "making_images",
  "recording_voice",
  "rendering",
  "done",
  "failed",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** Persisted at jobs/{id}/job.json. No accounts: the owner proves ownership with a random token. */
export const job = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(JOB_STATUSES),
  input: createVideoInput,
  script: script.optional(),
  imagesDone: z.number().int().min(0).default(0),
  durationSec: z.number().optional(),
  error: z.string().optional(),
  ownerTokenHash: z.string(),
  clientHash: z.string(),
});
export type Job = z.infer<typeof job>;

/** What the browser is allowed to see. */
export type PublicJob = Omit<Job, "ownerTokenHash" | "clientHash"> & {
  videoUrl?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
};
