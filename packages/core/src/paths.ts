import path from "node:path";

/** Resolve a repo-relative path. VIDLORE_ROOT is set by the web app (whose cwd is apps/web). */
export function fromRoot(p: string): string {
  return path.resolve(process.env.VIDLORE_ROOT ?? process.cwd(), p);
}
