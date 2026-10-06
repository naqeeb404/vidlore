import "server-only";
import { LIMITS } from "@vidlore/core";

function int(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const limits = {
  perClientDaily: int("DAILY_LIMIT_PER_VISITOR", LIMITS.perUserDaily),
  globalDaily: int("DAILY_LIMIT_GLOBAL", LIMITS.globalDaily),
};

export function secret(name: "RENDER_WEBHOOK_SECRET" | "FILE_SIGNING_SECRET" | "CLIENT_HASH_SALT"): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

/** Public base URL used for the worker's callback. */
export function appUrl(req: Request): string {
  return process.env.APP_URL || new URL(req.url).origin;
}
