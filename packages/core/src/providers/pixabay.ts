import { relevance } from "./relevance";
import type { FindStockVideo, StockClip } from "./types";

type PixabayVideo = {
  id: number;
  pageURL: string;
  duration: number;
  tags: string;
  user: string;
  videos: Record<"large" | "medium" | "small" | "tiny", { url: string; width: number; height: number; size: number }>;
};

const NOT_FOOTAGE =
  /\b(animation|animated|cartoon|comic|illustration|drawing|sketch|anime|motion graphics?|3d render|rendering|vector|2d|loop background|abstract background|glitch|particles?)\b/i;

/**
 * Pixabay free API (100 requests/minute). Free for commercial use, no attribution required (we credit anyway).
 * https://pixabay.com/api/docs/#api_search_videos
 * Pixabay has no orientation filter for videos: we take vertical clips, or 4K landscape clips whose centre
 * crop is still sharp at 1080×1920, and HD landscape clips only when nothing better matches.
 */
export function pixabayFindStockVideo(apiKey: string): FindStockVideo {
  return async ({ query, minSeconds, exclude }) => {
    const params = new URLSearchParams({ key: apiKey, q: query, per_page: "30", safesearch: "true" });
    const res = await fetch(`https://pixabay.com/api/videos/?${params}`);
    if (!res.ok) throw new Error(`Pixabay search failed (${res.status})`);
    const data = (await res.json()) as { hits?: PixabayVideo[] };

    const candidates: (StockClip & { score: number })[] = [];
    for (const v of data.hits ?? []) {
      if (exclude.includes(`pixabay-${v.id}`)) continue;
      // Pixabay also hosts cartoons and motion graphics; we only want filmed footage.
      if (NOT_FOOTAGE.test(v.tags ?? "")) continue;
      const rel = relevance(query, v.tags ?? "");
      if (rel.hits < rel.needed) continue; // loose match, e.g. an ocean for "dark hallway"
      const files = Object.values(v.videos).filter((f) => f.url && f.width && f.height);
      const vertical = files.filter((f) => f.height > f.width && f.height >= 1280).sort((a, b) => Math.abs(a.height - 1920) - Math.abs(b.height - 1920))[0];
      const landscape4k = files.filter((f) => f.width > f.height && f.height >= 2160).sort((a, b) => a.size - b.size)[0];
      // Last resort: an HD landscape clip, centre-cropped to vertical (softer, but still real footage).
      const landscapeHd = files.filter((f) => f.width > f.height && f.height >= 1080).sort((a, b) => b.height - a.height)[0];
      const file = vertical ?? landscape4k ?? landscapeHd;
      if (!file) continue;
      const quality = vertical ? 20 : landscape4k ? 10 : 0;
      const score = (v.duration >= minSeconds ? 100 : (v.duration / minSeconds) * 50) + quality + rel.hits * 25 - candidates.length;
      candidates.push({
        id: `pixabay-${v.id}`,
        url: file.url,
        width: file.width,
        height: file.height,
        duration: v.duration,
        credit: { name: v.user, url: v.pageURL },
        score,
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best || best.duration < minSeconds * 0.6) return null;
    const { score: _score, ...clip } = best;
    return clip;
  };
}
