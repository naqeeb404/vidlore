import type { LengthSec, NicheId, StyleId } from "../config";
import type { Script, Timeline } from "../schemas";

/** Each AI step sits behind one of these so a provider can be swapped by config. */

export interface WriteScriptInput {
  topic: string;
  niche: NicheId;
  style: StyleId;
  length: LengthSec;
}
export type WriteScript = (input: WriteScriptInput) => Promise<Script>;

export interface GenerateImageInput {
  prompt: string;
  seed?: number;
}
/** Returns encoded image bytes (JPEG/PNG) in 9:16 portrait. */
export type GenerateImage = (input: GenerateImageInput) => Promise<{ bytes: Uint8Array; contentType: string }>;

/** generateVoice and transcribe run inside the Python worker; render() hands it a timeline. */
export interface RenderResult {
  /** Present when the renderer ran synchronously (local/docker). Cloud Run reports back via webhook. */
  done: boolean;
}
export type Render = (
  timeline: Timeline,
  timelineKey: string,
  opts?: { background?: boolean },
) => Promise<RenderResult>;

export interface StockClip {
  id: string;
  /** Direct download URL of the chosen file. */
  url: string;
  width: number;
  height: number;
  duration: number;
  credit: { name: string; url: string };
}
/** Find one real, vertical stock video clip. Returns null when nothing fits. */
export type FindStockVideo = (input: { query: string; minSeconds: number; exclude: string[] }) => Promise<StockClip | null>;

/** Find one real vertical stock photo (animated by the worker's 3D camera). Returns null when nothing fits. */
export type FindStockPhoto = (input: { query: string }) => Promise<{ url: string; credit: { name: string; url: string }; id: string } | null>;

/** A free-tier provider allowance is used up for today. The UI shows the daily-limit message. */
export class QuotaExceededError extends Error {
  constructor(provider: string) {
    super(`${provider} daily free allowance used up`);
    this.name = "QuotaExceededError";
  }
}
