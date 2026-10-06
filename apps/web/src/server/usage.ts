import "server-only";
import { getStorage, keys } from "@vidlore/core/server";
import { limits } from "./env";

type Usage = { global: number; clients: Record<string, number> };

const today = () => new Date().toISOString().slice(0, 10);

async function read(day: string): Promise<Usage> {
  const raw = await getStorage().get(keys.usage(day));
  return raw ? (JSON.parse(new TextDecoder().decode(raw)) as Usage) : { global: 0, clients: {} };
}

async function write(day: string, u: Usage) {
  await getStorage().put(keys.usage(day), JSON.stringify(u), "application/json");
}

// Serialize read-modify-write within this instance.
let chain: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

export type CapResult = { ok: true } | { ok: false; reason: "visitor" | "global" };

/** Reserve one video for today, or report which daily cap is reached. */
export function reserveVideo(client: string): Promise<CapResult> {
  return locked(async (): Promise<CapResult> => {
    const day = today();
    const u = await read(day);
    if (u.global >= limits.globalDaily) return { ok: false, reason: "global" };
    if ((u.clients[client] ?? 0) >= limits.perClientDaily) return { ok: false, reason: "visitor" };
    u.global += 1;
    u.clients[client] = (u.clients[client] ?? 0) + 1;
    await write(day, u);
    return { ok: true };
  });
}

/** Give the slot back when we failed before the visitor got anything (e.g. the script call failed). */
export function releaseVideo(client: string): Promise<void> {
  return locked(async () => {
    const day = today();
    const u = await read(day);
    u.global = Math.max(0, u.global - 1);
    u.clients[client] = Math.max(0, (u.clients[client] ?? 0) - 1);
    await write(day, u);
  });
}

export async function remainingToday(client: string) {
  const u = await read(today());
  return {
    visitor: Math.max(0, limits.perClientDaily - (u.clients[client] ?? 0)),
    global: Math.max(0, limits.globalDaily - u.global),
  };
}
