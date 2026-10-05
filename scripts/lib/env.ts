import { existsSync } from "node:fs";
import path from "node:path";

/** Load .env from the repo root (Node 20.12+ built-in) and default to local storage/rendering. */
export function loadEnv() {
  const file = path.resolve(".env");
  if (existsSync(file)) process.loadEnvFile(file);
  process.env.STORAGE_DRIVER ??= "local";
  process.env.LOCAL_STORAGE_DIR ??= "./storage";
  process.env.RENDER_DRIVER ??= "local";
}
