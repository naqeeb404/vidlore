import type { FindStockVideo, StockClip } from "./types";

type PixabayVideo = {
  id: number;
  pageURL: string;
  duration: number;
  user: string;
  videos: Record<"large" | "medium" | "small" | "tiny", { url: string; width: number; height: number; size: number }>;
};

/**
 * Pixabay free API (100 requests/minute). Free for commercial use, no attribution required (we credit anyway).
 * https://pixabay.com/api/docs/#api_search_videos
 * Pixabay has no orientation filter for videos: we take vertical clips, or 4K landscape clips whose centre
 * crop is still sharp at 1080×1920.
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
      const files = Object.values(v.videos).filter((f) => f.url && f.width && f.height);
      const vertical = files.filter((f) => f.height > f.width && f.height >= 1280).sort((a, b) => Math.abs(a.height - 1920) - Math.abs(b.height - 1920))[0];
      const landscape4k = files.filter((f) => f.width > f.height && f.height >= 2160).sort((a, b) => a.size - b.size)[0];
      const file = vertical ?? landscape4k;
      if (!file) continue;
      const score = (v.duration >= minSeconds ? 100 : (v.duration / minSeconds) * 50) + (vertical ? 10 : 0) - candidates.length;
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
