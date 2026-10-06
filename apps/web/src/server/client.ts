import "server-only";
import { createHash } from "node:crypto";
import { secret } from "./env";

/** Anonymous visitor id: salted hash of the client IP. The raw IP is never stored. */
export function clientHash(req: Request): string {
  const h = req.headers;
  const ip =
    h.get("x-nf-client-connection-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "local";
  return createHash("sha256").update(`${secret("CLIENT_HASH_SALT")}:${ip}`).digest("hex").slice(0, 32);
}
