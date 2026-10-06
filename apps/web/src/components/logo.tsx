import { BRAND } from "@vidlore/core";
import { cn } from "@/lib/utils";

/** Mark: an open book whose pages form a play button. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path d="M7 10.5c3-.9 6-.6 8.2 1v11c-2.2-1.6-5.2-1.9-8.2-1z" fill="#fff" opacity=".9" />
      <path d="M25 10.5c-3-.9-6-.6-8.2 1v11c2.2-1.6 5.2-1.9 8.2-1z" fill="#fff" opacity=".55" />
      <path d="M13.6 13.2v5.6l4.6-2.8z" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight">{BRAND.name}</span>
    </span>
  );
}
