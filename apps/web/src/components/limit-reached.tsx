"use client";

import Link from "next/link";
import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function hoursUntilUtcMidnight() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 3_600_000));
}

/**
 * Friendly state for the free-tier guardrails. Never an error page.
 * "daily": the per-visitor / global video cap. "images": the shared free AI image allowance ran out.
 */
export function LimitReached({ reason = "daily" }: { reason?: "daily" | "images" }) {
  const images = reason === "images";
  return (
    <Card className="mx-auto max-w-lg text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent/15 text-accent">
        <Moon className="size-7" />
      </span>
      <h2 className="mt-5 font-display text-2xl font-bold">
        {images ? "Today's free AI scenes are used up" : "Daily demo limit reached, come back tomorrow"}
      </h2>
      <p className="mt-3 text-muted">
        {images ? (
          <>
            Vidlore runs on free-tier services, and today's shared allowance for painting AI scenes has run out. It resets
            in about {hoursUntilUtcMidnight()} hours (midnight UTC). Your script is saved: open this video from My videos
            then and press Make video to continue.
          </>
        ) : (
          <>
            Vidlore is a free demo running on free-tier services, so we share a small number of videos each day. Your
            videos are waiting in My videos, and the examples are always open.
          </>
        )}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/videos">My videos</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/#examples">See examples</Link>
        </Button>
      </div>
    </Card>
  );
}
