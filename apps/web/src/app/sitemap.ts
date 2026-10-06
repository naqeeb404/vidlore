import type { MetadataRoute } from "next";
import { BRAND } from "@vidlore/core";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || `https://${BRAND.domain}`;
  return ["", "/create", "/terms", "/privacy"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" }));
}
