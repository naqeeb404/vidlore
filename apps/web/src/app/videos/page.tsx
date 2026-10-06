import type { Metadata } from "next";
import { MyVideos } from "./my-videos";

export const metadata: Metadata = {
  title: "My videos",
  robots: { index: false },
};

export default function VideosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">My videos</h1>
      <p className="mt-2 text-muted">Videos you've made in this browser. Download the ones you want to keep.</p>
      <MyVideos />
    </div>
  );
}
