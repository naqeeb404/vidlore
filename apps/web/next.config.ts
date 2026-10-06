import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// One .env at the repo root serves the CLI, the worker and the web app.
const root = path.resolve(__dirname, "../..");
const rootEnv = path.join(root, ".env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
process.env.VIDLORE_ROOT ??= root;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/examples/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
