"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { type Example, examplePoster, exampleVideo } from "@/content/examples";

/** Shows the poster until clicked, so the page doesn't download six videos up front. */
export function ExampleCard({ example }: { example: Example }) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="group">
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-surface-2">
        {playing ? (
          <video
            src={exampleVideo(example.slug)}
            poster={examplePoster(example.slug)}
            className="h-full w-full object-cover"
            controls
            autoPlay
            playsInline
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 h-full w-full cursor-pointer"
            aria-label={`Play example: ${example.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={examplePoster(example.slug)}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover:bg-black/30">
              <span className="grid size-14 place-items-center rounded-full bg-white/90 text-black shadow-lg transition-transform group-hover:scale-110">
                <Play className="ml-0.5 size-6 fill-current" />
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-foreground">{example.niche}</span>
        <span>{example.style}</span>
      </figcaption>
    </figure>
  );
}
