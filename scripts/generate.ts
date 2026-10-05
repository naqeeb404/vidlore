/**
 * End-to-end CLI: topic -> script (Gemini) -> images (Cloudflare) -> voice/captions/render (worker).
 *   pnpm generate --topic "The dancing plague of 1518" --niche history --style cinematic --voice am_michael --length 60
 */
import { randomUUID } from "node:crypto";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { createVideoInput, getNiche, NICHE_IDS, STYLE_IDS, VOICE_IDS } from "@vidlore/core";
import {
  buildTimeline,
  getImageGenerator,
  getRenderer,
  getScriptWriter,
  getStorage,
  keys,
  LocalStorage,
} from "@vidlore/core/server";
import { loadEnv } from "./lib/env";

loadEnv();

const { values } = parseArgs({
  options: {
    topic: { type: "string" },
    niche: { type: "string", default: "history" },
    style: { type: "string", default: "cinematic" },
    voice: { type: "string" },
    length: { type: "string", default: "60" },
    out: { type: "string", default: "out" },
  },
});

if (!values.topic) {
  console.error(`Usage: pnpm generate --topic "..." [--niche ${NICHE_IDS.join("|")}] [--style ${STYLE_IDS.join("|")}] [--voice ${VOICE_IDS.join("|")}] [--length 30|60]`);
  process.exit(1);
}

const niche = createVideoInput.shape.niche.parse(values.niche);
const input = createVideoInput.parse({
  topic: values.topic,
  niche,
  style: values.style,
  voice: values.voice ?? getNiche(niche).voice,
  length: Number(values.length),
});

const jobId = randomUUID();
const storage = getStorage();
const t0 = Date.now();
const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(0)}s`;

async function retryOnce<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`  ${label} failed, retrying once: ${(err as Error).message}`);
    await new Promise((r) => setTimeout(r, 1500));
    return fn();
  }
}

console.log(`▸ Writing script for "${input.topic}"…`);
const script = await retryOnce("script", () => getScriptWriter()(input));
console.log(`  "${script.title}" — ${script.scenes.length} scenes, ${script.scenes.map((s) => s.narration).join(" ").split(/\s+/).length} words (${elapsed()})`);

console.log("▸ Making images…");
const generateImage = getImageGenerator();
for (const [i, scene] of script.scenes.entries()) {
  const key = keys.scene(jobId, i);
  if (await storage.exists(key)) continue;
  const img = await retryOnce(`image ${i + 1}`, () => generateImage({ prompt: scene.imagePrompt }));
  await storage.put(key, img.bytes, img.contentType);
  console.log(`  ${i + 1}/${script.scenes.length} (${elapsed()})`);
}

console.log("▸ Recording voice, timing captions and rendering…");
const tl = buildTimeline({ jobId, script, niche: input.niche, voice: input.voice });
await storage.put(keys.timeline(jobId), JSON.stringify(tl, null, 2), "application/json");
await getRenderer()(tl, keys.timeline(jobId));

if (storage instanceof LocalStorage) {
  const slug = script.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  await mkdir(values.out!, { recursive: true });
  const video = path.join(values.out!, `${slug}.mp4`);
  await copyFile(storage.resolve(tl.output.video), video);
  await copyFile(storage.resolve(tl.output.thumbnail), path.join(values.out!, `${slug}.jpg`));
  console.log(`\n✔ ${path.resolve(video)} in ${elapsed()}`);
}
