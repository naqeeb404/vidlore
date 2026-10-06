import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { BRAND } from "@vidlore/core";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap", weight: ["500", "700"] });

const description =
  "Turn any topic into a finished faceless short video: script, scenes, voiceover, word-by-word captions and music. Ready for TikTok, Reels and Shorts.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || `https://${BRAND.domain}`),
  title: { default: `${BRAND.name} — faceless short videos from a single topic`, template: `%s · ${BRAND.name}` },
  description,
  openGraph: { title: `${BRAND.name} — ${BRAND.tagline}`, description, siteName: BRAND.name, type: "website" },
  twitter: { card: "summary_large_image", title: `${BRAND.name} — ${BRAND.tagline}`, description },
};

export const viewport: Viewport = {
  themeColor: "#0b0b12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
