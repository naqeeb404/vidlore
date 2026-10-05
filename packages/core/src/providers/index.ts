import { cloudflareGenerateImage } from "./cloudflare";
import { geminiWriteScript } from "./gemini";
import type { GenerateImage, WriteScript } from "./types";

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

export type * from "./types";
