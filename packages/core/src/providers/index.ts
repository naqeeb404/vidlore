import { cloudflareGenerateImage } from "./cloudflare";
import { geminiWriteScript } from "./gemini";
import { pexelsFindStockPhoto, pexelsFindStockVideo } from "./pexels";
import { pixabayFindStockVideo } from "./pixabay";
import type { FindStockPhoto, FindStockVideo, GenerateImage, WriteScript } from "./types";

/** Provider registry. Add a new provider here and select it with an env var. */
export function getScriptWriter(): WriteScript {
  switch (process.env.SCRIPT_PROVIDER ?? "gemini") {
    case "gemini":
      return geminiWriteScript;
    default:
      throw new Error(`Unknown SCRIPT_PROVIDER ${process.env.SCRIPT_PROVIDER}`);
  }
}

export function getImageGenerator(): GenerateImage {
  switch (process.env.IMAGE_PROVIDER ?? "cloudflare") {
    case "cloudflare":
      return cloudflareGenerateImage;
    default:
      throw new Error(`Unknown IMAGE_PROVIDER ${process.env.IMAGE_PROVIDER}`);
  }
}

/**
 * Footage libraries to search, in order. STOCK_PROVIDERS="pexels,pixabay" (default: every library with a key).
 * Each finder is tagged with its source for credits.
 */
export function getStockFinders(): { source: string; find: FindStockVideo }[] {
  const wanted = (process.env.STOCK_PROVIDERS ?? "pexels,pixabay").split(",").map((s) => s.trim());
  const finders: { source: string; find: FindStockVideo }[] = [];
  for (const name of wanted) {
    if (name === "pexels" && process.env.PEXELS_API_KEY) finders.push({ source: "Pexels", find: pexelsFindStockVideo(process.env.PEXELS_API_KEY) });
    if (name === "pixabay" && process.env.PIXABAY_API_KEY) finders.push({ source: "Pixabay", find: pixabayFindStockVideo(process.env.PIXABAY_API_KEY) });
  }
  return finders;
}

export function getStockPhotoFinder(): FindStockPhoto | null {
  const key = process.env.PEXELS_API_KEY;
  return key ? pexelsFindStockPhoto(key) : null;
}

export type * from "./types";
export { QuotaExceededError } from "./types";
