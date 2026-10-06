import { ImageResponse } from "next/og";
import { BRAND } from "@vidlore/core";

export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(circle at 75% 20%, #3b2a8f 0%, #0b0b12 60%)",
          color: "#f4f4f8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#7c5cff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0, height: 0, borderTop: "14px solid transparent", borderBottom: "14px solid transparent", borderLeft: "22px solid #ffd23f", marginLeft: 6 }} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>{BRAND.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 950 }}>Turn any topic into a viral-ready short.</div>
          <div style={{ marginTop: 24, fontSize: 32, color: "#a0a0b4" }}>Script · scenes · voiceover · synced captions · music</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {["TikTok", "Reels", "Shorts"].map((p) => (
            <div key={p} style={{ padding: "10px 22px", borderRadius: 999, background: "#ffd23f", color: "#16130a", fontSize: 26, fontWeight: 700 }}>
              {p}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
