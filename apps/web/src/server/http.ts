import "server-only";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

/** Errors the UI shows as-is. `code` lets the UI render friendly states (e.g. the daily limit). */
export function fail(status: number, message: string, code?: string) {
  return json({ error: message, ...(code ? { code } : {}) }, status);
}
