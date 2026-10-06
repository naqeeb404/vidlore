import Link from "next/link";
import { BRAND } from "@vidlore/core";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-muted">{BRAND.tagline} A free demo, built entirely on open-source and free-tier tools.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted" aria-label="Footer">
          <Link href="/create" className="hover:text-foreground">Create</Link>
          <Link href="/videos" className="hover:text-foreground">My videos</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        </nav>
      </div>
      <p className="pb-8 text-center text-xs text-muted">
        © {new Date().getFullYear()} {BRAND.name}. Scripts, voices and painted scenes are AI-generated. Real footage provided by{" "}
        <a href="https://www.pexels.com" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
          Pexels
        </a>
        .
      </p>
    </footer>
  );
}
