import { relevance } from "./relevance";
import type { FindStockPhoto, FindStockVideo, StockClip } from "./types";

/** Pexels photo search, used when the AI image allowance is used up. */
export function pexelsFindStockPhoto(apiKey: string): FindStockPhoto {
  return async ({ query }) => {
    const params = new URLSearchParams({ query, orientation: "portrait", size: "large", per_page: "5" });
    const res = await fetch(`https://api.pexels.com/v1/search?${params}`, { headers: { authorization: apiKey } });
    if (!res.ok) throw new Error(`Pexels photo search failed (${res.status})`);
    const data = (await res.json()) as {
      photos?: { id: number; url: string; photographer: string; src: { large2x: string } }[];
    };
    const p = data.photos?.[0];
    return p ? { id: `photo-${p.id}`, url: p.src.large2x, credit: { name: p.photographer, url: p.url } } : null;
  };
}

type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  user: { name: string; url: string };
  video_files: { link: string; width: number | null; height: number | null; file_type: string }[];
};

/**
 * Pexels free API (200 requests/hour, 20,000/month). Free to use; we credit the videographer and Pexels.
 * https://www.pexels.com/api/documentation/
 */
export function pexelsFindStockVideo(apiKey: string): FindStockVideo {
  return async ({ query, minSeconds, exclude }) => {
    const params = new URLSearchParams({ query, orientation: "portrait", size: "medium", per_page: "15" });
    const res = await fetch(`https://api.pexels.com/videos/search?${params}`, { headers: { authorization: apiKey } });
    if (!res.ok) throw new Error(`Pexels search failed (${res.status})`);
    const data = (await res.json()) as { videos?: PexelsVideo[] };

    const candidates: (StockClip & { score: number })[] = [];
    for (const v of data.videos ?? []) {
      if (exclude.includes(String(v.id)) || v.height < v.width) continue;
      // Pexels page URLs describe the clip: /video/man-walking-in-a-dark-hallway-12345/
      const rel = relevance(query, v.url.split("/video/")[1] ?? "");
      if (rel.hits < rel.needed) continue;
      // Prefer a true 1080×1920 MP4; never pull 4K files (slow to download, no visible gain at 1080p).
      const file = v.video_files
        .filter((f) => f.file_type === "video/mp4" && f.width && f.height && f.height >= 1280 && f.height <= 2160 && f.height > f.width)
        .sort((a, b) => Math.abs((a.height ?? 0) - 1920) - Math.abs((b.height ?? 0) - 1920))[0];
      if (!file) continue;
      // Long-enough clips first, then the order Pexels ranks them in.
      const score = (v.duration >= minSeconds ? 100 : (v.duration / minSeconds) * 50) + rel.hits * 25 - candidates.length;
      candidates.push({
        id: String(v.id),
        url: file.link,
        width: file.width ?? 1080,
        height: file.height ?? 1920,
        duration: v.duration,
        credit: { name: v.user.name, url: v.url },
        score,
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    // A much-too-short clip would need looping; fall back to an AI shot instead.
    if (!best || best.duration < minSeconds * 0.6) return null;
    const { score: _score, ...clip } = best;
    return clip;
  };
}
