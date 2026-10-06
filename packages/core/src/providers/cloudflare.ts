import { requireEnv } from "./env";
import type { GenerateImage } from "./types";

/**
 * Cloudflare Workers AI text-to-image. flux-1-schnell returns a square JPEG (base64);
 * the render worker crops every image to 9:16 ("cover"), so prompts ask for a centered subject.
 * Models that accept width/height get 720×1280 directly.
 */
export const cloudflareGenerateImage: GenerateImage = async ({ prompt, seed }) => {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID");
  const token = requireEnv("CLOUDFLARE_API_TOKEN");
  const model = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";

  const body: Record<string, unknown> = { prompt: prompt.slice(0, 2048), steps: 8 };
  // flux-1-schnell rejects size fields; other models get native portrait output.
  if (!model.includes("flux-1-schnell")) Object.assign(body, { width: 720, height: 1280 });
  if (seed !== undefined) body.seed = seed;

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    throw new Error(`Cloudflare image request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  // Some models stream raw image bytes, flux returns JSON with base64.
  if (contentType.startsWith("image/")) {
    return { bytes: new Uint8Array(await res.arrayBuffer()), contentType };
  }
  const data = (await res.json()) as { success?: boolean; result?: { image?: string }; errors?: unknown };
  const b64 = data.result?.image;
  if (!b64) throw new Error(`Cloudflare returned no image: ${JSON.stringify(data.errors ?? data).slice(0, 300)}`);
  return { bytes: new Uint8Array(Buffer.from(b64, "base64")), contentType: "image/jpeg" };
};
