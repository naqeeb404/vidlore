import { cloudflareGenerateImage } from "./cloudflare";
import { geminiWriteScript } from "./gemini";
import { pexelsFindStockVideo } from "./pexels";
import type { FindStockVideo, GenerateImage, WriteScript } from "./types";

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

/** Stock footage is optional: without a key every scene uses animated AI art. */
export function getStockFinder(): FindStockVideo | null {
  switch (process.env.STOCK_PROVIDER ?? "pexels") {
    case "pexels":
      return process.env.PEXELS_API_KEY ? pexelsFindStockVideo(process.env.PEXELS_API_KEY) : null;
    case "none":
      return null;
    default:
      throw new Error(`Unknown STOCK_PROVIDER ${process.env.STOCK_PROVIDER}`);
  }
}

export type * from "./types";
export { QuotaExceededError } from "./types";
