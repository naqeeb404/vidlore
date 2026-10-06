import Link from "next/link";
import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Friendly state for the free-tier guardrails. Never an error page. */
export function LimitReached() {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent/15 text-accent">
        <Moon className="size-7" />
      </span>
      <h2 className="mt-5 font-display text-2xl font-bold">Daily demo limit reached, come back tomorrow</h2>
      <p className="mt-3 text-muted">
        Vidlore is a free demo running on free-tier services, so we share a small number of videos each day. Your
        videos are waiting in My videos, and the examples are always open.
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
