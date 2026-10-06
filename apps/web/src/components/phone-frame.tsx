import type * as React from "react";
import { cn } from "@/lib/utils";

export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[9/19.5] w-full rounded-[2.6rem] border border-white/10 bg-black p-2.5 shadow-[0_40px_120px_-30px_var(--primary)]",
        className,
      )}
    >
      <div className="absolute top-4 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
      <div className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-surface-2">{children}</div>
    </div>
  );
}
