/**
 * End-to-end CLI: topic -> script (Gemini) -> scene visuals (Pexels footage / Cloudflare images) -> voice/captions/render (worker).
 *   pnpm generate --topic "The dancing plague of 1518" --niche history --style cinematic --voice am_michael --length 60
 */
import { randomUUID } from "node:crypto";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { createVideoInput, getNiche, NICHE_IDS, STYLE_IDS, VISUALS_IDS, VOICE_IDS } from "@vidlore/core";
import {
  buildTimeline,
  getRenderer,
  getScriptWriter,
  getStorage,
  keys,
  LocalStorage,
  makeSceneAsset,
  sceneMedia,
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
    visuals: { type: "string", default: "auto" },
    out: { type: "string", default: "out" },
  },
});

if (!values.topic) {
  console.error(`Usage: pnpm generate --topic "..." [--niche ${NICHE_IDS.join("|")}] [--style ${STYLE_IDS.join("|")}] [--voice ${VOICE_IDS.join("|")}] [--length 30|60] [--visuals ${VISUALS_IDS.join("|")}]`);
  process.exit(1);
}

const niche = createVideoInput.shape.niche.parse(values.niche);
const input = createVideoInput.parse({
  topic: values.topic,
  niche,
  style: values.style,
  voice: values.voice ?? getNiche(niche).voice,
  length: Number(values.length),
  visuals: values.visuals,
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

console.log("▸ Making scene visuals…");
const used: string[] = [];
for (const [n, scene] of script.scenes.entries()) {
  const asset = await retryOnce(`scene ${n + 1}`, () =>
    makeSceneAsset({ jobId, n, scene, visuals: input.visuals, exclude: used }),
  );
  if (asset.credit) used.push(asset.credit.id);
  const what = asset.kind === "video" ? `real footage by ${asset.credit?.name ?? "Pexels"}` : "AI scene";
  console.log(`  ${n + 1}/${script.scenes.length} ${what} (${elapsed()})`);
}

console.log("▸ Recording voice, timing captions and rendering…");
const media = await sceneMedia(jobId, script.scenes.length);
const tl = buildTimeline({ jobId, script, niche: input.niche, voice: input.voice, media });
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
