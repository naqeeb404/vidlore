"use client";

/** No accounts: the browser remembers which videos it created and the owner token for each. */
export type SavedVideo = { id: string; token: string; createdAt: string };

const KEY = "vidlore:videos";

export function listSaved(): SavedVideo[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedVideo[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: SavedVideo[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    // Private mode or storage full: the video still works via its link, it just won't be listed.
  }
}

export function saveVideo(v: SavedVideo) {
  write([v, ...listSaved().filter((x) => x.id !== v.id)]);
}

export function forgetVideo(id: string) {
  write(listSaved().filter((x) => x.id !== id));
}

export function tokenFor(id: string): string | undefined {
  return listSaved().find((x) => x.id === id)?.token;
}
