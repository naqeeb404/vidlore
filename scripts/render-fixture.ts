/**
 * Render a bundled sample timeline without any API keys:
 *   pnpm render:fixture scary|history
 */
import { copyFile, mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { timeline as timelineSchema } from "@vidlore/core";
import { getRenderer, getStorage, LocalStorage } from "@vidlore/core/server";
import { loadEnv } from "./lib/env";

loadEnv();
process.env.STORAGE_DRIVER = "local";

const name = process.argv[2] ?? "scary";
const fixtureFile = path.resolve("fixtures/timelines", `${name}.json`);
const tl = timelineSchema.parse(JSON.parse(await readFile(fixtureFile, "utf8")));

const storage = getStorage() as LocalStorage;
await mkdir(storage.resolve("fixtures/images"), { recursive: true });
for (const file of await readdir("fixtures/images")) {
  await copyFile(path.join("fixtures/images", file), storage.resolve(`fixtures/images/${file}`));
}
const timelineKey = `jobs/${tl.jobId}/timeline.json`;
await storage.put(timelineKey, JSON.stringify(tl, null, 2));

console.log(`Rendering fixture "${name}" (${tl.scenes.length} scenes)…`);
const t0 = Date.now();
await getRenderer()(tl, timelineKey);
console.log(`\n✔ ${storage.resolve(tl.output.video)} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
