/**
 * Create .env from .env.example with fresh random secrets:
 *   pnpm setup:env
 * Then fill in GEMINI_API_KEY and PIXABAY_API_KEY.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync(".env")) {
  console.log(".env already exists, leaving it untouched.");
  process.exit(0);
}

let env = readFileSync(".env.example", "utf8");
for (const name of ["RENDER_WEBHOOK_SECRET", "FILE_SIGNING_SECRET", "CLIENT_HASH_SALT"]) {
  env = env.replace(new RegExp(`^${name}=$`, "m"), `${name}=${randomBytes(32).toString("hex")}`);
}
// Generous caps for local testing (production defaults are 2 per visitor, 15 per day).
env = env.replace(/^DAILY_LIMIT_PER_VISITOR=$/m, "DAILY_LIMIT_PER_VISITOR=50").replace(/^DAILY_LIMIT_GLOBAL=$/m, "DAILY_LIMIT_GLOBAL=100");
writeFileSync(".env", env);
console.log("Created .env. Now add GEMINI_API_KEY and PIXABAY_API_KEY to it.");
